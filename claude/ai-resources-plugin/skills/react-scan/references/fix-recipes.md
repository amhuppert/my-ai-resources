# Fix Recipes — Minimal-Diff Repairs per Root Cause

One recipe per classified root cause from `diagnosis-patterns.md`. Apply the smallest possible change, then re-measure with the same Playwright sequence used to capture the original counts.

## Recipe Selection

| Diagnosis | Recipe |
|---|---|
| Unstable Reference Prop | § Unstable Reference |
| Cascade From Parent | § Cascade |
| Over-Subscribed Context | § Context Over-Scope |
| Store Selector Instability | § Selector Instability |
| Memo Bypass via Unstable Reference | § Unstable Reference (the parent is the fix site) |
| Hook Dependency Unstable | § Hook Dependency |
| Long-Render Frame | § Long Renders |
| Slow Interaction (React-dominated) | § Slow Interactions |

## Unstable Reference

The bug is in the **parent**, not the rendering child. The parent passes a fresh reference every render for a value that is logically stable.

### Functions

Before:

```tsx
function Parent({ items }) {
  return (
    <List
      items={items}
      onSelect={(id) => analytics.log("select", id)} // new fn each render
    />
  );
}
```

After:

```tsx
function Parent({ items }) {
  const onSelect = useCallback(
    (id: string) => analytics.log("select", id),
    [], // analytics is stable
  );
  return <List items={items} onSelect={onSelect} />;
}
```

**Edge case:** if the closure depends on a prop, include that prop in the deps:

```ts
const onSelect = useCallback(
  (id: string) => onChange(id, mode),
  [onChange, mode],
);
```

If `onChange` itself is unstable, you have not fixed the problem — you have moved it. Climb the tree until you find a stable terminus.

### Objects

Before:

```tsx
<Chart config={{ stacked: true, palette: theme.palette }} />
```

After:

```tsx
const config = useMemo(
  () => ({ stacked: true, palette: theme.palette }),
  [theme.palette],
);
return <Chart config={config} />;
```

If `theme.palette` itself is unstable (the theme context produces a new palette per render), fix it at the provider:

```tsx
// In ThemeProvider:
const value = useMemo(
  () => ({ theme, palette, setTheme }),
  [theme, palette],
);
return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
```

### Static values — module scope

If the value never changes, take it out of the component entirely:

```tsx
const PALETTE = { primary: "#abc", secondary: "#def" };

function Chart() {
  return <Bar palette={PALETTE} />;
}
```

Module scope > `useMemo([])` for true constants — clearer intent, no hook overhead.

### Arrays from map/filter

Before:

```tsx
<Table rows={items.filter((x) => x.active)} />
```

After:

```tsx
const visibleRows = useMemo(
  () => items.filter((x) => x.active),
  [items],
);
return <Table rows={visibleRows} />;
```

## Cascade

Two strategies — pick by cost analysis:

### Strategy A — fix the parent's trigger

The parent rendered for a reason. Find that reason via the parent's own `changeDescription`. Apply the appropriate recipe to the parent. Cascade resolves automatically.

This is the **default** strategy. It removes the root cause rather than masking it.

### Strategy B — memoize the cheap-mount expensive-render child

Only when:
- The child renders frequently
- The child's own render is expensive (>1 ms in the trace)
- The parent's render is genuinely intentional (e.g., it's the route component)

```tsx
const ExpensiveChild = memo(function ExpensiveChild({ data }: Props) {
  // ...
});
```

`React.memo` does a shallow prop comparison. If the parent passes unstable references, memo does nothing — return to the Unstable Reference recipe.

**Custom equality** as last resort:

```tsx
const Row = memo(
  function Row({ item }: Props) { /* ... */ },
  (prev, next) => prev.item.id === next.item.id && prev.item.v === next.item.v,
);
```

Custom equality is fragile — it silently masks future prop additions. Prefer fixing references upstream.

## Context Over-Scope

### Split contexts

Before:

```tsx
const AppContext = createContext<{
  user: User; theme: Theme; cart: Cart; locale: Locale;
} | null>(null);

// Every consumer re-renders on any field change.
```

After:

```tsx
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<Theme | null>(null);
const CartContext = createContext<Cart | null>(null);
const LocaleContext = createContext<Locale | null>(null);
```

Components that read only `theme` re-render only on theme changes. Split by **subscription pattern**, not by domain — group fields that change together, separate fields that change at different cadences.

### Selector pattern

When splitting is impractical (deep legacy code), use `use-context-selector` or migrate the hot slice to Zustand.

```ts
// Zustand pattern with shallow eq
import { shallow } from "zustand/shallow";

const { theme, palette } = useStore(
  (s) => ({ theme: s.theme, palette: s.palette }),
  shallow,
);
```

### Memoize the provider value

Always do this even if not splitting. Cheap insurance:

```tsx
const value = useMemo(
  () => ({ user, theme, cart, locale }),
  [user, theme, cart, locale],
);
return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
```

This does **not** fix over-subscription, but ensures consumers don't re-render on each provider render — only on actual field changes.

## Selector Instability

### Select primitives

Before:

```ts
const { foo, bar } = useStore((s) => ({ foo: s.foo, bar: s.bar }));
```

After:

```ts
const foo = useStore((s) => s.foo);
const bar = useStore((s) => s.bar);
```

Each `useStore` call now subscribes to a primitive. Re-renders only when that primitive changes.

### Shallow equality

When you need an object:

```ts
import { shallow } from "zustand/shallow";

const dims = useStore(
  (s) => ({ w: s.width, h: s.height }),
  shallow,
);
```

`shallow` does `Object.keys(prev).length === Object.keys(next).length && every key prev[k] === next[k]`. Sufficient for flat objects.

### Stable selector reference

Some libraries (older `react-redux`) require the selector function itself to be stable:

```ts
const selectActiveUsers = (s: State) => s.users.filter((u) => u.active);
// Defined at module scope → stable
```

## Hook Dependency

### Stabilize the dependency

Before:

```ts
const filtered = useMemo(
  () => items.filter((x) => x.active),
  [items.filter((x) => x.active)], // new array each render → useMemo invalidates
);
```

After:

```ts
const filtered = useMemo(
  () => items.filter((x) => x.active),
  [items], // depend on the source, not a derived value
);
```

### Lift the unstable computation

If the dep itself is expensive to compute, compute it once and depend on the result:

```ts
const filterKey = items.length + ":" + items.map((x) => x.id).join(",");
const filtered = useMemo(
  () => items.filter((x) => x.active),
  [filterKey],
);
```

Use a structural-equality key only when the source is small.

### useEffectEvent (React 19)

For event-handler closures that read mutable values without subscribing:

```ts
const onSelect = useEffectEvent((id: string) => {
  analytics.log(id, latestMode); // latestMode is read at call time
});

useEffect(() => {
  el.addEventListener("click", onSelect);
  return () => el.removeEventListener("click", onSelect);
}, []); // no need to include onSelect or latestMode
```

`useEffectEvent` is React 19+. On older versions, use the [ref-trick](https://overreacted.io/making-setinterval-declarative-with-react-hooks/#now-i-can%E2%80%99t-stop-thinking-about-it).

## Long Renders

A single render takes >150 ms. Different fix space than re-renders.

### Defer non-critical work

```tsx
import { useDeferredValue, useTransition } from "react";

function Search({ input }) {
  const deferred = useDeferredValue(input);
  return <ExpensiveResults query={deferred} />;
}
```

`useDeferredValue` lets React render the urgent UI first (the input) and defer the expensive list. `useTransition` marks the state setter as transitional, allowing React to interrupt.

```tsx
const [isPending, startTransition] = useTransition();

function handleSearch(value: string) {
  setInput(value); // urgent
  startTransition(() => {
    setQuery(value); // transitional
  });
}
```

### Virtualize lists

For >100 rendered items, virtualization (`react-window`, `@tanstack/react-virtual`, `react-virtualized`) reduces the rendered fiber count from `O(n)` to `O(visible)`. The single biggest perf win for list-heavy UIs.

### Move computation out of render

If a `useMemo` body is expensive AND its deps are stable, the memo is fine. If the deps are unstable, the memo invalidates every render and you pay full cost every time — fix the deps (Hook Dependency recipe).

For truly heavy computation, push to a Web Worker (`comlink`, `workerize-loader`) and read the result in render.

### Paginate / window the data

If the data size dwarfs the screen, the cheapest fix is to render less. Add pagination or windowing at the data layer before reaching React.

## Slow Interactions

When the Notifications tab shows `React render time` dominates the >200 ms interaction:

1. Drill into the component bar chart. The top contributor is the prime suspect.
2. Apply the appropriate re-render recipe (usually Unstable Reference or Cascade).
3. If the dominant component's render itself is expensive (single render >50 ms), it's a Long Render problem — apply that recipe.
4. If after fixes React render time is no longer dominant but the interaction is still slow, the problem is now elsewhere (other JS, paint) — escalate to `investigate-web-perf` with `INPBreakdown`.

## Validation After Any Fix

The same Playwright sequence used to measure the problem must be re-run identically:

```ts
// Before-fix baseline: saved to test-results/baseline.json
// After-fix: saved to test-results/after-fix.json
const baseline = JSON.parse(readFileSync("test-results/baseline.json"));
const after = JSON.parse(readFileSync("test-results/after-fix.json"));

for (const [name, baselineCount] of Object.entries(baseline)) {
  const afterCount = after[name] ?? 0;
  console.log(`${name}: ${baselineCount} → ${afterCount} (${afterCount - baselineCount})`);
}
```

Accept the fix only if:
- The targeted component's count drops by the predicted delta
- No other component's count rises
- Render time per remaining render did not increase (memoization overhead can negate the win)

## Anti-Patterns in Fixes

- **`React.memo` everywhere.** Memoization has overhead. Bulk-applying it adds runtime cost and obscures real bugs. Memoize after measuring.
- **`useCallback` / `useMemo` everywhere.** Same issue — hooks have a per-render cost. Inline functions/objects are fine when the consumer is not memoized.
- **Custom equality functions in `React.memo`.** Fragile. Use when you've proven shallow equality is wrong; document why.
- **Fixing a re-render that doesn't cost anything.** If the flamegraph attributes <1 ms, your fix is theatre. Move on.
- **Two fixes at once.** You cannot attribute the delta. Revert and pick one.
- **Adding `key` props to fix renders.** `key` controls reconciliation identity, not render counts. Wrong tool.
