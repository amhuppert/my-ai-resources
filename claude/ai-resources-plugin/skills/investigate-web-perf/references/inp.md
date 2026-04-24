# Scenario: INP / Slow Interaction

Interaction to Next Paint investigation. Load this reference when the symptom is a sluggish click/tap/type, INP > 200 ms at p75, or a regression in `INPBreakdown`.

## The INP Subpart Model

INP is the sum of three phases for a single interaction. Your hypothesis must name which phase dominates.

| Phase | What it covers | Typical fixes |
|-------|----------------|---------------|
| **Input delay** | Time from user input until event handler starts | Long tasks blocking the main thread *before* the interaction (hydration, third-party scripts, route transitions) |
| **Processing** | Event handler execution, React re-render, state updates | `useTransition` for non-urgent state updates, memoization, bailing out of expensive renders, `useDeferredValue` |
| **Presentation** | Commit + paint after handler returns | Heavy layout/paint, large DOM, `content-visibility`, `will-change`, avoid layout thrash |

## Insight Sequence

1. `INPBreakdown` — the three-phase split + the worst interactions captured in the trace.
2. `LongCriticalNetworkTree` — are fetches inside the interaction blocking paint?
3. `ForcedReflow` — did the handler cause a forced synchronous layout? This commonly appears inside presentation-phase cost but is its own insight for attribution.
4. `ThirdParties` — did a third-party script (analytics, Sentry, PostHog, feature flags) eat main-thread time during the interaction?

## Long Animation Frames API (for attribution)

`PerformanceLongAnimationFrameTiming` (Chrome 123+) supersedes Long Tasks. When the insight output points to "long task during interaction", the per-script attribution lives in `entry.scripts[]`:

- `entry.scripts[i].invoker` — how the callback was scheduled (user listener, rAF, timer, resolve of Promise, ...)
- `entry.scripts[i].sourceURL` — maps straight to your React files with source maps
- `entry.scripts[i].forcedStyleAndLayoutDuration` — catches layout thrashing inside a handler
- `entry.blockingDuration` — the portion that caused the slow interaction

Use this via `evaluate_script` only *after* `performance_analyze_insight("INPBreakdown")` has already pointed at a long task. Do not grovel through LoAF entries before consulting insights.

## Canonical Prompt

> Navigate to `<URL>` under Slow 4G + 4× CPU. Take an accessibility-tree snapshot to get UIDs for the interactive targets. Start a trace with `autoStop: false, reload: false`, saved to `trace.json.gz`. Click the `<target>` UID, type `<input>`, press Enter, wait for network idle, stop. Run `performance_analyze_insight` for `INPBreakdown` then `LongCriticalNetworkTree`. Report: the interaction target; input delay / processing / presentation split; top 3 long tasks >50 ms with source-mapped stacks; the React component owning each. No fixes yet — return the report and wait for direction on which phase to attack.

## Known Gotchas

- **Hydration during first interaction** is a classic input-delay killer. If the interaction is on the first page load, INP will look pathological until hydration completes. Test INP on a second-load interaction for a cleaner signal.
- **Third-party analytics on click.** Sending a beacon synchronously from a click handler adds processing time. Wrap in `scheduler.postTask({ priority: 'background' })` or `requestIdleCallback`.
- **Expensive selectors in Zustand/Redux** that don't use equality checks will re-render subscribed components on every unrelated state change — appears as processing-phase cost. See `react.md` on over-subscribed context.
- **`<input>` with a controlled value and heavy parent re-render** — typing is slow because every keystroke re-renders the whole tree. `useDeferredValue` or move state down.
- **Focus/blur events firing layout.** `ForcedReflow` insight catches this; common when a parent reads `offsetHeight` in response to focus.

## Validation Template

The PR or report must include:

- Before and after trace paths
- `INPBreakdown` output before and after, with the dominant phase and its delta
- The specific interaction tested (target + inputs), identical before and after
- Confirmation that LCP, CLS, and bundle did not regress
- The single-variable change
