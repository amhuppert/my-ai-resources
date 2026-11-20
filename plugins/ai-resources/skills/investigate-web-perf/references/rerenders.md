# Scenario: unnecessary React re-renders

Load alongside [`react.md`](react.md) when a trace shows React render time causing scroll, input, or state-update jank.

For dedicated component-level render attribution, `react-scan` installation, Playwright render-budget tests, `changeDescription` classification, and full fix recipes, recommend running `/react-scan` (or consult its references directly if the user wants component-level diagnosis without a full trace). This file covers trace integration inside `investigate-web-perf`.

## What counts as an unnecessary render

A render is unnecessary when a component produces identical output without a real state or prop value change:

| Root cause | Signal | Fix |
| --- | --- | --- |
| Inline object/array/function in parent | New reference passed every render (`style={{...}}`, `() => ...`) | `useMemo` / `useCallback`, or hoist static values to module scope |
| Over-subscribed context | Component re-renders on unrelated context fields | Split context or switch to a selector store (Zustand/Jotai) |
| Unstable store selector | Selector returns a fresh object/array per call | Select primitives or pass `shallow` equality |
| Parent cascade | Parent re-renders and reconciles children with unchanged props | Fix the parent's trigger first; use `React.memo` on expensive leaves only after measuring |

## Combining `react-scan` with Chrome traces

Run `npx react-scan@latest http://localhost:3000` for a zero-edit render check before capturing a trace. Avoid `why-did-you-render` on new projects (maintenance-only since Jan 2025).

For flamegraph component attribution, Chrome 144+ and React 19.2+ expose fiber component names directly on `chrome-devtools-mcp` traces via the DevTools Extensibility API when React DevTools is enabled in the attached debug Chrome profile (`--browserUrl`).

Workflow:

1. Attach `chrome-devtools-mcp` with the React DevTools track enabled.
2. Start a trace (`trace.json.gz`), run the exact interaction (for example scrolling a list 500 px four times), stop, and capture `react-scan` counts for the same sequence.
3. Focus on components rendering >3 times that also show meaningful time on the flamegraph. Ignore noisy components that take <1 ms total.
4. Classify each hot component:
   - Props changed by reference with equal structure -> inline literal/callback in parent.
   - Memoized component re-rendered with no prop changes -> subscribed context or internal hook state updated.
   - Unmemoized component with no prop changes -> parent cascade.
   - 10 to 50x renders per interaction -> structural issue (missing virtualization, unstable keys, over-subscribed store), not a `React.memo` bandage.

## Validation report

Include before/after `react-scan` render counts for the exact interaction, before/after `.json.gz` trace paths showing the component's flamegraph block shrank, confirmation that LCP, INP, and bundle size did not regress, and the single-variable diff.
