# Diagnosis Patterns — Classifying Render Causes

Every unnecessary render has one of a small number of root causes. Once you have render data with `changeDescription` populated, classifying is a flowchart, not guesswork.

Load this reference after you have collected render data via Playwright + react-scan. If you do not yet have data, load `playwright-integration.md` and `api-surface.md` first.

## The Classification Flowchart

For each component that rendered more often than expected:

```
Does changeDescription.parent === true?
├── YES → CASCADE RENDER. The parent rendered for some reason and reconciled this child.
│         Fix the parent's trigger OR wrap this component in React.memo (only if it's cheap to mount but expensive to render).
│         → fix-recipes.md § Cascade
│
└── NO → Self-triggered update. Continue:

         Does changeDescription.props (array) include any names?
         ├── YES → PROP CHANGE.
         │         Is the parent passing a new REFERENCE for an unchanged value?
         │         (Compare prevValue/nextValue if using full bundle — for lite, inspect parent source.)
         │         ├── YES → UNSTABLE PROP. Most common case.
         │         │         → fix-recipes.md § Unstable Reference
         │         └── NO  → Genuine prop change — render is intentional. Skip.
         │
         └── NO → No prop change. Continue:

                  Does changeDescription.context === true?
                  ├── YES → CONTEXT CHANGE. Did this component need the context value that changed?
                  │         (Read the component source — check what fields it pulls from context.)
                  │         ├── YES → Intentional. Skip.
                  │         └── NO  → OVER-SUBSCRIBED CONTEXT.
                  │                  → fix-recipes.md § Context Over-Scope
                  │
                  └── NO → Continue:

                           Does changeDescription.state === true OR hooks is non-empty?
                           ├── YES → HOOK / STATE UPDATE.
                           │         Is the updating hook driven by a stable external source
                           │         (a store selector, a subscription)?
                           │         ├── YES → SELECTOR INSTABILITY (likely store selector returns
                           │         │          a new ref each call, e.g. `useStore(s => ({a, b}))`)
                           │         │          → fix-recipes.md § Selector Instability
                           │         └── NO  → Intentional self-update. Skip.
                           │
                           └── NO → UNCLASSIFIED. Likely a `useEffect` or `useMemo` with an
                                    unstable dependency that triggers `setState`. Inspect hook
                                    dependencies in source. → fix-recipes.md § Hook Dependency
```

## Pattern Catalog

### 1. Unstable Reference Prop (most common)

**Signature:** `changeDescription.props.length > 0`, `parent: true` is common but not required, the changed prop name maps to a prop the parent passes inline.

**Detection in source:** Open the parent component. Find the JSX where the child is rendered. Look for:

```tsx
<Child
  onClick={() => doThing()}                          // ← new function each render
  options={{ sortable: true }}                       // ← new object each render
  items={data.filter(x => x.active)}                 // ← new array each render
  style={{ color: 'red' }}                           // ← new object each render
/>
```

Any of these creates a new reference on every parent render. If `Child` is memoized, memo bypasses; if `Child` is not memoized, it renders anyway (so memo would help). Either way, **the parent is the bug location**.

**Severity:** High. One unstable prop usually cascades to dozens of children.

**Fix:** `useCallback` for functions, `useMemo` for objects/arrays, module scope for static values. → `fix-recipes.md`

### 2. Cascade From Parent

**Signature:** `parent: true`, `props: null` or empty, `state: false`, `context: false`, `hooks: []`. The child re-rendered because the parent did, but nothing about the child changed.

**Detection:** Look at the parent's `changeDescription`. The parent's cause is the real bug; the child is an innocent bystander.

**Severity:** Variable. Depends on how expensive the child render is.

**Fix:**
- Best: fix the parent's trigger (often itself an unstable ref further up).
- Acceptable: wrap the child in `React.memo` **only if** the child renders frequently and is expensive. Measure first.
- Wrong: bulk-memoize every component "just in case."

### 3. Over-Subscribed Context

**Signature:** `context: true`, no prop changes, the component reads only a subset of the context's value but the whole value object changed.

**Common case:** A `<ThemeProvider>` whose value is `{ theme, setTheme, palette, fonts }` — every component consuming `useTheme()` re-renders when any field changes. A component that only uses `theme` re-renders when `palette` changes.

**Detection:** Inspect the context provider's `value` prop. If it's a fresh object literal each render, the context value has reference-inequality on every render, triggering all consumers.

**Severity:** High. Single context can trigger hundreds of unrelated renders.

**Fix:**
- Split the context into multiple smaller contexts (one per concern).
- Or use a selector library (Zustand, Jotai, `use-context-selector`) that subscribes to slices.
- Or memoize the provider's `value` prop (`useMemo`) — but this only helps when the underlying fields are themselves stable.

### 4. Store Selector Instability

**Signature:** `state: true` or `hooks: [...]`, and the component uses `useSelector` / `useStore` / Redux `connect` / Zustand etc.

**Common case:**

```ts
// Returns a NEW object reference every store update,
// regardless of whether the contents changed:
const { foo, bar } = useStore(s => ({ foo: s.foo, bar: s.bar }));
```

**Detection:** Find the selector call. Check whether it returns a new reference per invocation.

**Severity:** Medium-to-high. Pattern is common in Redux/Zustand codebases.

**Fix:**
- Select primitives: `const foo = useStore(s => s.foo)`, `const bar = useStore(s => s.bar)`.
- Or pass an equality fn: `useStore(s => ({foo, bar}), shallow)`.
- Or use a library helper that does shallow equality by default.

### 5. Memo Bypass via Unstable Reference

**Signature:** Component is wrapped in `React.memo`, yet renders on every parent render. `props` contains entries with `unstable: true` (full bundle only).

**Detection:** Same as Pattern 1 — find the parent's JSX. The fix is in the parent.

**Severity:** Confusingly high — devs assume memo is protective.

**Fix:** Stabilize the prop reference in the parent. `React.memo` with a custom equality function (`(prev, next) => prev.id === next.id`) is a last resort.

### 6. Hook Dependency Unstable

**Signature:** `hooks` array contains indices, `props: null`, `state: false`, `context: false`. A `useEffect`, `useMemo`, or `useCallback` ran and updated some hook state.

**Detection:** Open the component source. Count hooks top-to-bottom matching the index. Inspect the dep array — does it contain an unstable reference?

```ts
const data = useMemo(
  () => computeExpensive(input),
  [input.filter(x => x.active)] // ← new array every render → memo invalidates → state updates → component re-renders
);
```

**Severity:** High when the hook itself triggers further state updates.

**Fix:** Stabilize the dep, lift the unstable computation out of the dep, or use `useEffect`'s referential-stable callback pattern (`useEffectEvent` in React 19).

### 7. Long-Render Frame (>150 ms)

**Signature:** Full bundle Notifications tab shows a `SlowdownEvent { kind: 'long-render', duration: > 150 }`. Or in lite mode: a `component-render-stop` minus its matching `component-render-start` is > 150 ms.

**This is not a re-render problem — it's a single-render-is-too-expensive problem.** Different fix space:

- Reduce data volume (paginate, virtualize, slice).
- Defer non-critical work (`useDeferredValue`, `useTransition`).
- Move expensive computation out of render (memoize the result of `useMemo`, not just its dependencies).

→ `fix-recipes.md § Long Renders` and `investigate-web-perf` for the trace-driven complement.

### 8. Slow Interaction (>200 ms)

**Signature:** Full bundle Notifications tab shows a `SlowdownEvent { kind: 'interaction' }` with `react.duration` dominating. The breakdown shows React render time as the dominant contributor over input-delay and presentation.

**Diagnosis:** Open the interaction in the Notifications tab. The stacked bar chart ranks components by contribution. The top contributor is the prime suspect.

If React render time is **not** dominant (e.g., it's other JS or presentation), this is an INP problem in the chrome-devtools-mcp sense — escalate to `investigate-web-perf` with `INPBreakdown`.

## Reading the Source Like a Detective

After classifying, the fix is in source code. Useful heuristics for reading parent JSX quickly:

- Search for the child component name as a JSX tag (`<Child`) in its consumers.
- For each match, scan the props — anything matching `={() =>` or `={{` or `={[` or `={someFunc(` is suspicious.
- If the child is rendered inside `.map((item) => <Child ...>)`, then every item gets new props per parent render unless the `.map` itself is memoized. Often the right fix is `useMemo(() => items.map(...), [items, ...])`, but more commonly the issue is just the lambda inside `<Child onClick={() => handle(item.id)}>` — solve with a child-side `onClick={handle}` and event-target lookup.
- For context: search for the provider, find its `value=` prop. If it's an inline object literal, that is the bug.

## When react-scan Says Something Is Unnecessary But Trace Disagrees

`trackUnnecessaryRenders: true` flags renders that produced no DOM mutation. But "rendered without mutating DOM" is not the same as "expensive". If the chrome-devtools-mcp flamegraph attributes <1 ms to that component, the optimization is not worth doing — leave it.

Conversely, a render that DOES mutate DOM (`unnecessary: false`) might still be unnecessary at the application level — e.g., a memoized component that re-renders because its parent ID prop changed but the underlying data is identical. The framework cannot tell; you have to inspect the data flow.

## Anti-Patterns in Diagnosis

- **Concluding from a single run.** React render timing varies ±15–30%. Run N=3 and report median or all three.
- **Treating mount renders as unnecessary.** `isFirstMount: true` is always expected.
- **Ignoring `parent: true` renders because they "look intentional".** The parent's trigger is the real bug — cascade renders compound quickly.
- **Reading prop names without reading values.** A prop named `data` changing might be a real data change (intentional) or a new array of the same items (bug). Compare prev/next from the full bundle `onRender`, or open the parent source.
- **Blaming React.** Almost all unnecessary renders are application code passing unstable references. The framework is rarely the bug.
