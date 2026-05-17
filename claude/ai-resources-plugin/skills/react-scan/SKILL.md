---
name: react-scan
description: This skill should be used when the user asks to "set up react-scan", "install react-scan", "diagnose React re-renders", "find unnecessary renders", "find unstable props", "automate React render checks with Playwright", "react-scan + playwright", "measure component renders programmatically", "check why a React component is slow", or mentions React rendering issues, slow React interactions, render counts, or component-level perf attribution. Covers install across Next.js/Vite/Remix/script-tag/browser-extension, the lite headless API for CI, and the canonical render-attribution → fix → validate loop driven through Playwright.
---

# React Scan + Playwright for React Performance Diagnosis

`react-scan` instruments React's fiber tree via the same DevTools hook React DevTools uses, observing every commit without any application code change. It reports **which component rendered, how long it took, and what changed** (props / state / context / hooks / parent cascade). Pair it with Playwright and the result is a deterministic, file:line-attributable workflow for re-render bugs that traces alone cannot resolve.

This skill is the entry point. Detailed setup, integration patterns, API surface, diagnosis classification, and fix recipes live in `references/` and load only when needed.

## When to Use This Skill

Use react-scan when the symptom points at **component-level rendering**, not asset delivery or paint:

- A component re-renders many more times than its props change
- A list/grid feels janky on scroll or input despite small per-frame work
- An interaction (click, keystroke) takes 100–400 ms and the trace shows React render time dominating
- A user reports "everything re-renders when I type"
- A Playwright test needs to assert a render-count invariant (e.g., "search input keystroke causes at most 2 renders of `<Results>`")

**Do not** use react-scan as the first move for: LCP regressions, network/bundle issues, layout shift, third-party scripts. Those belong in `investigate-web-perf` (sibling skill in this plugin). Trace-level analysis with the chrome-devtools-mcp Performance Insights complements react-scan: `investigate-web-perf` is canonical for trace work, `react-scan` is canonical for render-count attribution.

## Modes — Pick One Before Acting

| Mode | When | How |
|---|---|---|
| **Toolbar overlay** (default) | Local dev, human-driven visual debugging | `npx react-scan@latest init`, or CLI proxy, or script tag |
| **Lite (`react-scan/lite`)** | Programmatic data collection, CI, agent-driven analysis | `instrument({ onEvent })` or `instrument({ endpoint })` |
| **CLI proxy** (`npx react-scan@latest URL`) | Quick check of any running app without touching its code | `npx react-scan@latest http://localhost:3000` |
| **Browser extension** | Audit a deployed app you do not control | Install for Chrome/Firefox, click icon |
| **Playwright + injection** | Headless render counting in tests | Inject auto.global.js + patch `onRender` (see `references/playwright-integration.md`) |

For agent-driven workflows the order of preference is:
1. **Lite mode** for structured data extraction (lowest token cost, structured `LiteEvent` records).
2. **Playwright + injection** when needing to drive interactions while collecting renders.
3. **Toolbar overlay** only when a human will look at the screen.

## The Loop

1. **Reproduce deterministically.** Pin the same interaction sequence and the same render-count reset point. React render counts are sensitive to dev/prod, StrictMode (doubled mounts), and concurrent batching — fix these before measuring.
2. **Instrument.** Add react-scan to the app (or inject via Playwright). Confirm `window.__REACT_SCAN__.ReactScanInternals` is present.
3. **Capture.** Trigger the interaction. Collect renders via one of: `onRender(fiber, renders)` callback, lite `subscribe()` events, or `Store.reportData` per-fiber map. Save raw payload to disk; do not stream to model context.
4. **Classify.** For each high-count component, read `changeDescription` (props / state / context / hooks / parent). Cross-reference with source to find the unstable reference. Categories in `references/diagnosis-patterns.md`.
5. **Hypothesize.** One change at a time. Name the specific unstable reference or context boundary.
6. **Fix.** Apply the minimal change (see `references/fix-recipes.md`). Do not bulk-add `React.memo`.
7. **Validate.** Re-run the same Playwright sequence. Compare before/after render counts on the same components. Accept the fix only if the targeted component's count drops by the expected delta AND no other component's count regresses.

## Non-Negotiables

1. **Do not measure react-scan output from a production build by accident.** React Scan no-ops on production builds unless `dangerouslyForceRunInProduction: true` is set. In Playwright against a dev server this works automatically; against any other build, set the flag or you will measure nothing and conclude wrongly.
2. **Do not measure with React StrictMode enabled in counts you report as "unnecessary renders".** StrictMode double-invokes function components in development. Either disable StrictMode for the measurement, or divide expected counts by 2, or measure interaction-driven renders only (StrictMode doubles mount renders, not update renders).
3. **Do not add `React.memo` without a measured render count first.** Memoization has a non-zero cost; on components that render in <0.1 ms it's net negative. Always measure before and after.
4. **One variable per iteration.** Fixing two unstable refs at once means you cannot attribute the win — and you might fix one while regressing the other.
5. **Use `react-scan/lite` for programmatic capture, not the full bundle.** Lite has no overlay, no Preact, no toolbar — bundle and runtime overhead are minimal.
6. **Save raw events to disk.** A single commit can yield hundreds of fiber events. Reference paths in your report; never paste full `LiteEvent` arrays into the model context.
7. **`react-scan/lite` `keepalive` POSTs cap at ~64 KB.** If using the `endpoint` option for large trees, tune `maxFibersPerCommit` (default 5000) downward or use in-process `subscribe()` instead.

## Quick Decision Tree

- "Set up react-scan in this project" → `references/setup.md`
- "Write a Playwright test that asserts no extra renders" → `references/playwright-integration.md` + `scripts/playwright-render-collector.ts`
- "What does react-scan expose on `window`?" → `references/api-surface.md`
- "Component X re-renders too much — why?" → `references/diagnosis-patterns.md` (load `references/api-surface.md` first if you don't yet have a render payload)
- "I know it's an unstable prop — how do I fix it?" → `references/fix-recipes.md`
- "Walk me through the whole loop end-to-end" → `references/workflow.md`

## Anti-Patterns

- **Reading `onRender` output during JSX render.** The callback fires on every commit; logging on every fire pollutes the console and skews measurements via console overhead. Buffer, then flush after the interaction completes.
- **Counting `onRender` calls per component.** A single commit can produce one `Render[]` array with multiple entries — count the array length, not the callback invocations.
- **Trusting render-count parity between dev and prod.** React skips some scheduler work in production; counts will differ. Validate fixes in the same environment used to measure the problem.
- **Conflating "rendered" with "expensive".** A component can render 100 times per interaction yet contribute <2 ms total. If trace flamegraph attribution is small, drop it and move to the next.
- **Using full `react-scan` in a Playwright test.** The overlay attempts to mount Shadow DOM + Preact, which adds noise to render counts and slows tests. Use `react-scan/lite` or full bundle with `showToolbar: false`.

## References

Load on demand:

- **`references/setup.md`** — Install per framework (Next.js App + Pages, Vite, Remix, script tag, CLI init, Vite plugin, browser extension, lite mode); environment guards and dev/prod gating.
- **`references/playwright-integration.md`** — `addInitScript` injection, the render-counter pattern from react-scan's own E2E suite, lite-mode subscriber, multi-page metrics aggregation, CI gating with budgets, when to disable StrictMode for measurement.
- **`references/api-surface.md`** — `window.__REACT_SCAN__`, `ReactScanInternals`, `Store.reportData`, `onRender(fiber, renders)` shape, `Render` / `ChangeDescription` types, the lite `LiteEvent` taxonomy and `LiteOptions`.
- **`references/diagnosis-patterns.md`** — Classification of root causes from `changeDescription`: unstable props, context over-scope, cascade from parent, memo bypass, hook dependency unstable, store selector instability, child-of-list-without-key.
- **`references/fix-recipes.md`** — Minimal-diff fixes per category: `useMemo` / `useCallback` placement, `React.memo` with custom equality, context split, selector with `shallow`, `useDeferredValue` / `useTransition`, list virtualization, key stabilization, lifting state down.
- **`references/workflow.md`** — End-to-end loop with prompts: reproduce → instrument → capture → classify → fix → validate, plus the slow-interaction (>150 ms long-render frame) and INP-driven variants.
- **`scripts/inject-react-scan.js`** — Playwright `addInitScript`-compatible helper that loads `auto.global.js` and disables the overlay for headless measurement.
- **`scripts/playwright-render-collector.ts`** — Example Playwright test that drives an interaction, collects per-component render counts via the lite subscriber, and writes a JSON report to disk for diff comparison.
