# Framework: React

Load this reference when the project uses React (any version). Load alongside the scenario-specific reference. Load `nextjs.md` in addition if the project uses Next.js.

## Measurement Before Memoization

**Do not add `React.memo` / `useMemo` / `useCallback` without measuring first.** Memoization has runtime cost (equality check on every render + the stored reference). On components that render in <0.1 ms, memoization is a net loss.

The order of operations is always:

1. Observe the render (react-scan overlay or `onRender` callback).
2. Confirm the render is unnecessary (props structurally equal, no meaningful state change).
3. Identify the root cause (see `rerenders.md` classification table).
4. Apply the *minimum* memoization — usually stabilizing one prop in the parent, not wrapping the child.

## Concurrent React Primitives (Preferred Over Debouncing)

For expensive state updates driven by user input, reach for these before writing a debounce:

- **`useTransition`** — marks a state update as non-urgent. React can interrupt it to paint a faster update.
- **`useDeferredValue`** — returns a deferred copy of a value that lags behind the live one during busy periods.
- **`startTransition`** (non-hook form) — same as `useTransition` for imperative call sites.

Classic example: a search input with a heavy filtered list. Wrap the list update in `startTransition` so typing stays responsive.

Debouncing is still correct for *network* throttling (don't fire a request per keystroke). It is usually wrong for UI throttling.

## `<Profiler>` API

The cleanest temporary instrumentation. Emit `performance.measure()` from `onRender` so marks land in every trace the agent captures:

```tsx
<Profiler id="ProductList" onRender={(id, phase, actualDuration) => {
  performance.measure(`${id}:${phase}`, { start: performance.now() - actualDuration });
}}>
  <ProductList />
</Profiler>
```

Now the trace shows `ProductList:mount` / `ProductList:update` marks directly alongside browser events.

## Tool Recommendations

- **`react-scan`** — primary runtime render inspector. Supported, actively maintained, works on React 18 + 19. See `rerenders.md` for the workflow.
- **React DevTools** — for flamegraph component attribution. Chrome 144 + React 19.2 expose fiber names on chrome-devtools-mcp flamegraphs via the DevTools Extensibility API.
- **`why-did-you-render`** — maintenance-only since Jan 2025. Still works on React 19 but funnel new projects to `react-scan`.
- **Million.js / `@million/lint`** — deprecated. Do not recommend. Author moved to `react-scan`.

## RSC / Streaming SSR Gotchas

Relevant when the React app uses Server Components (most Next.js 13+ apps):

- **LCP element may stream in a later chunk.** See `nextjs.md` for RSC payload debugging. `querySelector` at DOMContentLoaded is unreliable for identifying the LCP element.
- **Client components inside a server component** hydrate in the order the RSC payload arrives. A `'use client'` boundary that appears late in the payload hydrates late and can cause input-delay INP issues on first interaction.
- **`Suspense` boundaries** affect LCP — the fallback may paint first, with the real content streaming in. Whether this helps or hurts LCP depends on whether the LCP element is inside or outside the boundary.
- **`use()` for data fetching** throws a promise. Throwing in a component under Suspense is correct; throwing outside is an unhandled rejection.

## Common React-Specific Perf Bugs

| Bug | Trace signal | Fix |
|-----|-------------|-----|
| `useEffect` with object/array dep causing infinite loop | Trace shows rapid repeated render + effect | Stabilize dep with `useMemo`, or destructure primitives into the dep array |
| Zustand/Redux selector returning new reference | Component re-renders on every store change | Use `shallow` equality, or select primitives |
| Context provider value not memoized | Every consumer re-renders on every parent render | Wrap provider `value` in `useMemo` |
| Controlled input with heavy parent | Typing causes whole-tree re-render; INP processing phase dominates | `useDeferredValue` on the value, or move input state into the input-owning component |
| List without stable `key` | Whole list reconciles on any change | Stable `id` as `key`, never index for dynamic lists |
| Inline function as `onClick` passed to memoized child | Memo bails out | `useCallback` at parent — but only if the child is actually expensive |

## Boundary: When Not to Fix in React

Some perf problems can't be fixed at the React layer:

- A 1200 ms server response is not a React problem; see `lcp.md` (`DocumentLatency`).
- A 400 kB third-party script is not a React problem; see `bundle.md`.
- Large-image LCP is not a React problem (though JSX controls `fetchpriority`); see `lcp.md`.

Recognize the layer. Fixing at the wrong layer produces motion without progress.
