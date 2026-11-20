---
name: react-scan
description: Install and run react-scan (including react-scan/lite and
  Playwright render budgets) to attribute React re-renders, diagnose unstable
  props, and verify fixes. For Chrome trace work on LCP, INP, bundles, or
  memory, use investigate-web-perf.
---

# React Scan: component render attribution

`react-scan` hooks into React's fiber tree through the same DevTools hook React DevTools uses, reporting **which component rendered, how long it took, and what changed** (props, state, context, hooks, or parent cascade) without modifying app code. Use it for component-level rendering bugs (excessive re-renders, scroll/typing jank dominated by React render time, or Playwright render-budget assertions). For LCP, network/bundle bloat, layout shift, or memory leaks, use `investigate-web-perf` instead.

## Choose a mode first

| Mode | Best for | Setup |
| --- | --- | --- |
| Lite (`react-scan/lite`) | Programmatic capture, CI, agent-driven diagnosis (preferred for agents) | `instrument({ onEvent })` or `instrument({ endpoint })` |
| Playwright + injection | Headless render counting and interaction tests | Inject `auto.global.js` + `scripts/inject-react-scan.js` or lite wrapper |
| CLI proxy | Quick check against any running local URL with zero code edits | `npx react-scan@latest http://localhost:3000` |
| Toolbar overlay | Human-driven visual inspection in local dev | `npx react-scan@latest init`, Vite plugin, or script tag |
| Browser extension | Auditing a deployed app you do not control | Chrome/Firefox extension (not for programmatic capture) |

## Diagnosis and fix loop

1. **Reproduce deterministically.** Pin the build mode, StrictMode state, and interaction sequence before measuring.
2. **Instrument.** Attach `react-scan` (prefer `react-scan/lite`, or full bundle with `showToolbar: false` so the Preact/Shadow-DOM toolbar does not distort counts). Confirm `window.__REACT_SCAN__.ReactScanInternals` (full) or `window.__REACT_SCAN_LITE__` (lite) is live.
3. **Capture to disk.** Drive the interaction and collect renders via `onRender(fiber, renders)`, lite `subscribe()`, or `Store.reportData`. Save raw event arrays to disk; never dump full `LiteEvent` JSON into model context.
4. **Classify.** Inspect `changeDescription` (props, state, context, hooks, parent) and cross-reference source JSX using [`references/diagnosis-patterns.md`](references/diagnosis-patterns.md).
5. **Hypothesize one change.** Name the exact unstable reference, context boundary, or selector and the expected render-count drop.
6. **Apply the minimal fix** from [`references/fix-recipes.md`](references/fix-recipes.md). Change one variable per iteration.
7. **Validate in the same environment.** Re-run the identical Playwright sequence. Accept only if the target component's count drops as predicted, no other component regresses, and per-render time does not worsen.

## Hard constraints

- **Production React vs. minified dev names:** `react-scan` no-ops on production React builds (detected by bippy's `detectReactBuildType`) unless `dangerouslyForceRunInProduction: true` is set. Zero counts usually mean prod React. Populated counts with single-letter names (`_`, `r`, `i`) mean a minified dev build (common on Next.js + Turbopack); fix names with `@react-scan/vite-plugin-react-scan` (`autoDisplayNames: true`) or `babel-plugin-react-display-name` instead of enabling the prod flag.
- **StrictMode:** dev StrictMode double-invokes mount renders. Disable StrictMode for exact numeric budgets, halve expected mount counts, or measure post-boot update renders only.
- **Measure before memoizing:** skip `React.memo` on components rendering in <0.1 ms or contributing <2 ms total on a flamegraph; memo comparison overhead can cost more than it saves.
- **Buffer and count properly:** buffer `onRender` data and flush after the interaction (console logging per commit skews timing), and count `renders.length` rather than callback invocations (one commit can batch multiple renders).
- **Lite `keepalive` POST limit:** `endpoint` POSTs cap at ~64 KB. Lower `maxFibersPerCommit` (default 5000) or use in-process `subscribe()` on large trees.

## Load references and scripts by task

| Need | File |
| --- | --- |
| Install in Next.js, Vite, Remix, script tag, lite mode, or check env guards | [`references/setup.md`](references/setup.md) |
| Inject into Playwright, count renders, enforce CI render budgets | [`references/playwright-integration.md`](references/playwright-integration.md) |
| Globals (`window.__REACT_SCAN__`), `Options`, `onRender`, `LiteEvent`, `ChangeDescription` | [`references/api-surface.md`](references/api-surface.md) |
| Classify root causes from `changeDescription` (8 patterns + flowchart) | [`references/diagnosis-patterns.md`](references/diagnosis-patterns.md) |
| Minimal-diff code fixes per root cause | [`references/fix-recipes.md`](references/fix-recipes.md) |
| Full step-by-step iteration guide, slow-interaction & long-render variants, report format | [`references/workflow.md`](references/workflow.md) |
| Playwright `addInitScript` helper that disables overlay and awaits lazy attach | [`scripts/inject-react-scan.js`](scripts/inject-react-scan.js) |
| Example Playwright test collecting per-component lite counts to JSON on disk | [`scripts/playwright-render-collector.ts`](scripts/playwright-render-collector.ts) |

## Completion criteria

Done when before/after render-count summaries saved to disk come from the identical interaction and environment, the applied diff addresses one classified root cause, the targeted component drops as expected without regressing other components, and raw event dumps stay on disk rather than in chat.
