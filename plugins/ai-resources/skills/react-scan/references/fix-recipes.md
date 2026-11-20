# Minimal-diff fix recipes

Apply one recipe matching the classified root cause from [`diagnosis-patterns.md`](diagnosis-patterns.md), then re-run the identical Playwright capture to verify before moving on.

| Root cause | Section |
| --- | --- |
| Unstable reference prop / memo bypass | [Unstable reference](#unstable-reference) |
| Cascade from parent | [Cascade](#cascade) |
| Over-subscribed context | [Context over-scope](#context-over-scope) |
| Store selector instability | [Selector instability](#selector-instability) |
| Unstable hook dependency | [Hook dependency](#hook-dependency) |
| Long-render frame (>150 ms) | [Long renders](#long-renders) |
| Slow interaction (>200 ms, React-dominated) | [Slow interactions](#slow-interactions) |

## Unstable reference

Fix the **parent**, not the child:

- **Functions:** wrap inline callbacks in `useCallback`, including every closed-over prop in deps. If a dependency itself is unstable, climb the tree to stabilize its source.
  ```tsx
  const onSelect = useCallback((id: string) => onChange(id, mode), [onChange, mode]);
  return <List items={items} onSelect={onSelect} />;
  ```
- **Objects and derived arrays:** memoize derived values (`useMemo(() => items.filter((x) => x.active), [items])` or `useMemo(() => ({ stacked: true, palette: theme.palette }), [theme.palette])`).
- **True constants:** hoist outside the component to module scope (`const PALETTE = { primary: "#abc", secondary: "#def" };`) instead of `useMemo(..., [])`.

## Cascade

1. **Default — fix the parent's trigger:** inspect the parent's `changeDescription` and fix why the parent rendered.
2. **Selective `React.memo`:** wrap the child only when the parent render is genuinely required (such as a route container), the child renders often, and its own render is expensive (>1 ms in a trace). Avoid custom `(prev, next)` comparators unless shallow equality is proven insufficient, because custom comparators silently mask future props.

## Context over-scope

1. **Split by update cadence:** divide `{ user, theme, cart, locale }` into separate contexts so components reading `theme` do not re-render when `cart` changes.
2. **Always memoize provider `value`:** `const value = useMemo(() => ({ theme, setTheme }), [theme]);` prevents re-rendering consumers when the provider itself re-renders with unchanged fields.
3. **Selector escape hatch:** when splitting legacy context is impractical, use `use-context-selector` or migrate the hot slice to Zustand with `shallow`.

## Selector instability

Select individual primitives, or pass `shallow` for flat objects:

```ts
// Primitives (best)
const foo = useStore((s) => s.foo);
const bar = useStore((s) => s.bar);

// Flat object with shallow equality
import { shallow } from "zustand/shallow";
const dims = useStore((s) => ({ w: s.width, h: s.height }), shallow);
```

In libraries requiring stable selector identity (such as older `react-redux`), define selectors at module scope.

## Hook dependency

Depend on the stable input rather than a newly computed array/object:

```ts
// Bad: [items.filter((x) => x.active)] invalidates every render
// Good:
const filtered = useMemo(() => items.filter((x) => x.active), [items]);
```

For event listeners or effects that need fresh state without re-subscribing, use `useEffectEvent` on React 19+ (or a ref holding the latest value on earlier React versions):

```ts
const onSelect = useEffectEvent((id: string) => analytics.log(id, latestMode));
useEffect(() => {
  el.addEventListener("click", onSelect);
  return () => el.removeEventListener("click", onSelect);
}, []);
```

## Long renders

When a single render takes >150 ms:

- **Defer non-urgent UI:** wrap input-driven downstream updates in `useDeferredValue(input)` or `startTransition(() => setQuery(value))`.
- **Virtualize long lists (>100 rows):** use `@tanstack/react-virtual` or `react-window` so mounted fibers scale with visible rows (`O(visible)`) instead of total items (`O(n)`).
- **Paginate/window data** before it reaches React, or push truly heavy CPU work to a Web Worker (`comlink`).

## Slow interactions

1. Identify the highest-cost component in the interaction breakdown.
2. Apply the re-render recipe above, or the Long renders recipe if a single render exceeds 50 ms.
3. If React time drops below half of total interaction time and the interaction still lags, hand off to `investigate-web-perf` (`INPBreakdown`) for non-React JS or paint bottlenecks.

## Validation diff and pitfalls

Compare saved before/after JSON summaries from the exact same Playwright script and accept only if the target count drops as predicted, no other component increases, and per-render duration does not worsen.

Avoid bulk-adding `React.memo`/`useMemo`/`useCallback` everywhere, touching `<1 ms` renders, bundling two edits in one iteration, or tweaking `key` props to fix render counts (`key` governs reconciliation identity, not render frequency).
