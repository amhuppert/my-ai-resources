# Framework: React

Load alongside the scenario reference for any React project. Also load [`nextjs.md`](nextjs.md) if the app uses Next.js.

## Measure before memoizing

Do not add `React.memo`, `useMemo`, or `useCallback` without measuring first. Memoization adds prop comparison and memory overhead on every render; for components rendering in <0.1 ms, it is a net loss.

Follow this order:

1. Observe the render count (`react-scan` or `onRender`).
2. Confirm the render is unnecessary (props structurally equal, no real state change).
3. Classify the root cause (see [`rerenders.md`](rerenders.md)).
4. Apply the smallest fix, usually stabilizing a single prop in the parent rather than wrapping the child.

## Concurrent primitives over UI debouncing

For slow UI updates driven by typing or filters, prefer React concurrent primitives over `debounce`:

- `useTransition` / `startTransition`: marks a state update non-urgent so React can interrupt it to paint keystrokes or clicks immediately.
- `useDeferredValue`: keeps an expensive consumer lagging slightly behind fast-changing input state.

Keep debouncing for *network* throttling, not local UI responsiveness.

## Temporary `<Profiler>` trace marks

Emit `performance.measure()` from React's `<Profiler>` so component render spans show up directly in Chrome traces:

```tsx
<Profiler
  id="ProductList"
  onRender={(id, phase, actualDuration) => {
    performance.measure(`${id}:${phase}`, {
      start: performance.now() - actualDuration,
    });
  }}
>
  <ProductList />
</Profiler>
```

## Tooling status

- **Use:** `react-scan` (primary runtime render inspector for React 18/19) and React DevTools (flamegraph fiber names on Chrome 144+ / React 19.2+).
- **Avoid on new projects:** `why-did-you-render` (maintenance-only since Jan 2025) and Million.js / `@million/lint` (deprecated).

## RSC and streaming SSR gotchas

- **Streaming LCP:** the LCP element may arrive in a late RSC chunk (`text/x-component`). Do not trust `querySelector` at `DOMContentLoaded` (see [`nextjs.md`](nextjs.md)).
- **Late hydration:** a `'use client'` subtree arriving late in the RSC stream hydrates late, inflating input delay on early interactions.
- **`Suspense` fallbacks:** depending on whether the LCP element sits inside or outside the boundary, a fallback can help or hurt perceived LCP.
- **`use()`:** throws a Promise by design; it must sit inside a `Suspense` boundary or it triggers an unhandled rejection.

## Common React perf bugs

| Bug | Signal | Fix |
| --- | --- | --- |
| `useEffect` with unstable object/array dependency | Rapid render + effect loop in trace | Memoize the dependency or depend on primitives |
| Store selector returning a fresh object | Subscriber re-renders on every unrelated store write | Select primitives or pass `shallow` equality |
| Unmemoized context provider `value={{...}}` | All consumers re-render on every provider render | Memoize `value` with `useMemo` or split the context |
| Controlled `<input>` inside heavy parent | Processing phase dominates typing INP | Move input state down or pass `useDeferredValue` |
| Array index as `key` on dynamic list | Entire list reconciles on insert/reorder | Use a stable item `id` |
| Inline `onClick` passed to memoized child | `React.memo` bypassed every render | `useCallback` in parent (only when child is genuinely expensive) |

## Know when the bug is not React

Do not tune React when the bottleneck lives in another layer: a 1,200 ms TTFB belongs to `DocumentLatency` ([`lcp.md`](lcp.md)), a 400 kB third-party bundle belongs to [`bundle.md`](bundle.md), and an unoptimized hero image belongs to [`lcp.md`](lcp.md).
