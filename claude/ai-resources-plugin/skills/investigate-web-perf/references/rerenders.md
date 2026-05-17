# Scenario: Unnecessary Re-Renders

React component re-render investigation. Load this reference when the symptom is UI jank on scroll/input/state-change, components rendering more often than their props change, or a general sense that "too much is re-rendering." Load `react.md` alongside this file.

**Canonical react-scan workflow lives in the `react-scan` skill.** This file remains the entry point from `investigate-web-perf` for trace-driven analysis, but for setup, Playwright integration, full API surface, diagnosis classification by `changeDescription`, and minimal-diff fix recipes, defer to:

- `react-scan/SKILL.md` — overview and the loop
- `react-scan/references/setup.md` — install across Next.js / Vite / Remix / script tag / lite mode
- `react-scan/references/playwright-integration.md` — `addInitScript` injection and render-counter pattern
- `react-scan/references/diagnosis-patterns.md` — classify root cause from `changeDescription`
- `react-scan/references/fix-recipes.md` — fixes per category

This file keeps the trace-integration heuristics (chrome-devtools-mcp + React DevTools track) that are specific to `investigate-web-perf`. Use the react-scan skill for any work that originates from "this component renders too much" rather than "this trace shows a long task."

## What Counts as "Unnecessary"

A render is unnecessary if the component produced identical output to its previous render and was not triggered by state or prop *value* changes. Common root causes:

| Root cause | Signal | Fix |
|-----------|--------|-----|
| Missing `React.memo` on a pure leaf component with stable props | Parent re-renders → child re-renders despite identical props | `React.memo` — but measure first (see `react.md`) |
| Inline object/array/function in parent | `{{foo: 1}}` or `() => ...` passed as prop — new reference every render | Lift to `useMemo` / `useCallback`, or move to module scope if static |
| Over-subscribed context | Component re-renders on context changes it doesn't care about | Split the context, or use a selector pattern (Zustand, Jotai, context-selector) |
| Over-subscribed store selector | Selector returns a new reference each call | Equality check (`shallow` / `===`), or select primitives |
| Parent reconciliation cascading | Parent re-renders for a reason, propagating down | Fix the parent's trigger, not the children |

## Tool: `react-scan` (Primary)

`react-scan` is the supported, actively maintained successor to `why-did-you-render`. Run it before recording a trace — it gives you a render-count + reason overlay in the browser, which makes trace interpretation much faster.

Quickest possible check (no code change to the app):

```bash
npx react-scan@latest http://localhost:3000
```

For anything beyond ad-hoc browsing — programmatic setup, Playwright integration, the `onRender(fiber, renders)` payload shape, `changeDescription` classification, lite-mode capture for CI — load the `react-scan` skill. It owns the canonical guidance; duplicating it here causes drift.

**Do not use `why-did-you-render` for new projects** — maintenance-only since Jan 2025. Existing integrations still work on React 19 but funnel new work through `react-scan`.

## React DevTools on Flamegraphs

Chrome 144 + React 19.2 expose fiber component names on chrome-devtools-mcp flamegraphs via the DevTools Extensibility API. Enable React DevTools in the debug Chrome profile so the agent can map trace entries to components without guessing fiber shapes.

For a running app: attach chrome-devtools-mcp via `--browserUrl` and the React DevTools track auto-appears in traces.

## Canonical Prompt

> Attach to the running Chrome via `--browserUrl`. Ensure the React DevTools track is enabled. Start a trace saved to `trace.json.gz`, scroll the target list 500 px four times, stop. Also collect `react-scan` output for the same interaction. List components that rendered >3 times during the scroll, with their prop changes per render. Classify each as: missing `React.memo` / inline object or function in parent / over-subscribed context/store. Output a table: Component | Renders | Root cause | Minimal diff. No code changes yet — return the report.

## Classification Heuristics

- **Props changed but values are structurally equal** → inline object/array/function in the parent. `useMemo`/`useCallback` at the parent, or lift to module scope.
- **No props changed, component is memoized, but still renders** → a context it subscribes to changed, or a hook internal state updated. Check context providers.
- **No props changed, component is not memoized** → parent re-rendered. Either memoize this component, or fix the parent.
- **Same component rerenders 10–50× per interaction** → stop adding `memo`; this is a bigger reconciliation problem (list virtualization missing, keys wrong, store re-subscribing).

## Anti-Patterns to Avoid

- **`React.memo` everywhere.** Memoization has overhead. On components that render in <0.1 ms, memoizing costs more than it saves. Measure.
- **Fixing a re-render that doesn't appear in the trace.** If `react-scan` flags it but the flamegraph doesn't show cost, it's likely already cheap. Move on.
- **Blaming the framework before reading the hook dependencies.** 90% of real cases are a `useEffect` or `useMemo` with an unstable dependency.

## Validation Template

- Before/after `react-scan` render counts for the targeted interaction
- Before/after trace paths
- Confirmation that LCP, INP, and bundle did not regress
- The single-variable change (one component memoized, one prop stabilized, one context split, etc.)
- Evidence that the flamegraph block previously attributed to the component shrank
