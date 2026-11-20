# Classifying React render causes

Load this reference after capturing render payloads with `changeDescription` enabled. If you do not yet have capture data, read [`playwright-integration.md`](playwright-integration.md) and [`api-surface.md`](api-surface.md) first.

## Decision flowchart

Ignore entries where `isFirstMount === true`. For every remaining high-count component:

```text
changeDescription.parent === true?
├── YES -> CASCADE RENDER (parent re-rendered and reconciled this child)
│          Inspect the parent's changeDescription first, or memoize an expensive leaf.
│          -> fix-recipes.md § Cascade
└── NO  -> Self-triggered update:
           changeDescription.props non-empty?
           ├── YES -> New reference for identical value? (full bundle prev/next or parent JSX)
           │          ├── YES -> UNSTABLE REFERENCE PROP -> fix-recipes.md § Unstable reference
           │          └── NO  -> Genuine prop change (skip)
           └── NO  -> changeDescription.context === true?
                      ├── YES -> Does this component use the field that changed?
                      │          ├── YES -> Intentional (skip)
                      │          └── NO  -> OVER-SUBSCRIBED CONTEXT -> fix-recipes.md § Context over-scope
                      └── NO  -> changeDescription.state === true or hooks non-empty?
                                 ├── YES -> Driven by store selector returning fresh ref?
                                 │          ├── YES -> SELECTOR INSTABILITY -> fix-recipes.md § Selector instability
                                 │          └── NO  -> Intentional state update or unstable hook dep
                                 └── NO  -> Check useEffect/useMemo unstable deps triggering setState
                                            -> fix-recipes.md § Hook dependency
```

## Eight root-cause patterns

1. **Unstable reference prop (most common):** `props` lists changed prop names whose JSX values in the **parent** are inline lambdas (`onClick={() => ...}`), object/style literals (`style={{ color: "red" }}`), or derived arrays (`data.filter(...)`). The bug lives in the parent whether the child is memoized or not.
2. **Cascade from parent:** `parent: true` with empty `props`, `state: false`, `context: false`, `hooks: []`. The child is a bystander; trace upward to the parent's `changeDescription` and fix the upstream trigger first.
3. **Over-subscribed context:** `context: true` with unchanged props because a broad provider value (`{ theme, setTheme, palette, fonts }`) updated an unrelated field or recreated its `value={{...}}` object literal on render.
4. **Store selector instability:** `state: true` or non-empty `hooks` where a Zustand/Redux selector builds a fresh object or array on every store update (`useStore((s) => ({ a: s.a, b: s.b }))` without `shallow`).
5. **Memo bypass via unstable prop:** component is wrapped in `React.memo` yet still renders on parent commits (`unstable: true` in full bundle). Same fix site as Pattern 1: stabilize the prop in the parent.
6. **Unstable hook dependency:** non-empty `hooks` index pointing to a `useMemo`, `useCallback`, or `useEffect` whose dependency array contains a freshly allocated value (such as `[items.filter(...)]`) that triggers downstream state updates. Count hooks top-to-bottom in the component source to map the index.
7. **Long-render frame (>150 ms):** `SlowdownEvent { kind: "long-render", duration > 150 }` (full bundle) or `component-render-stop - component-render-start > 150` (lite). This is an expensive *single* render, not excessive count; use virtualization, deferral, pagination, or off-render work ([`fix-recipes.md`](fix-recipes.md) § Long renders).
8. **Slow interaction (>200 ms):** `SlowdownEvent { kind: "interaction" }` where React render time dominates input delay and presentation. Target the top component in the breakdown; if non-React JS or paint dominates instead, switch to `investigate-web-perf` (`INPBreakdown`).

## Fast parent-JSX inspection tips

- Grep for `<ChildName` across consumers and scan props for `={() =>`, `={{`, `={[`, or inline function calls `={compute(...)}`.
- Inside `.map((item) => <Row onClick={() => onSelect(item.id)} />)`, every row gets a fresh closure on parent render; pass a stable `onSelect` plus item `id` (or read `data-id` from the event target) instead.
- For context bugs, inspect the `<Provider value={...}>` expression first.

## Reconciling `react-scan` with Chrome traces

- `trackUnnecessaryRenders: true` flags renders that produced no DOM diff, but a zero-DOM render costing <1 ms on a flamegraph is not worth optimizing.
- Conversely, a render that does mutate DOM can still be wasted if upstream state recreated identical data. Always confirm timing variance across **N=3 runs** (render timing swings +/-15 to 30%).
