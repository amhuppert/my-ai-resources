# Scenario: INP and slow interactions

Load when clicks, taps, or typing feel sluggish, INP exceeds 200 ms at p75, or `INPBreakdown` regresses.

## Three-phase model

Every interaction splits into three phases. Name the dominant phase before touching code.

| Phase | What it covers | Typical fixes |
| --- | --- | --- |
| Input delay | Time from input until the event handler starts | Main-thread long tasks running before input (hydration, third-party scripts, route transitions) |
| Processing | Event handler execution, state updates, React re-render | `useTransition` or `useDeferredValue`, stabilizing props/selectors, bailing out of expensive renders |
| Presentation | Style, layout, commit, and paint after the handler returns | Reducing DOM size, `content-visibility`, eliminating forced synchronous layout |

## Capture and insight sequence

1. Load the page under pinned emulation and take an accessibility-tree snapshot to obtain target element UIDs.
2. Start a manual trace with `autoStop: false, reload: false` saved to `trace.json.gz`. Perform the exact interaction (click target, type input, press Enter, wait for settle), then stop the trace.
3. Run insights in order:
   - `INPBreakdown`: returns the three-phase split and worst captured interactions.
   - `LongCriticalNetworkTree`: checks whether fetches triggered by the interaction block paint.
   - `ForcedReflow`: checks for forced synchronous layout inside the handler (often shows up under presentation cost).
   - `ThirdParties`: checks whether analytics, telemetry, or feature-flag scripts consumed main-thread time during the interaction.

## Long Animation Frames attribution

When `INPBreakdown` points to a long task during the interaction, use `PerformanceLongAnimationFrameTiming` (Chrome 123+, replacing Long Tasks) via `evaluate_script` to inspect `entry.scripts[]`:

- `invoker`: how the callback fired (event listener, rAF, timer, promise resolution)
- `sourceURL`: source-mapped file path
- `forcedStyleAndLayoutDuration`: layout thrashing inside the callback
- `blockingDuration`: time directly contributing to the slow interaction

Only inspect LoAF entries after `INPBreakdown` identifies a long task.

## Common gotchas

- **First-load hydration:** interacting while the page is still hydrating inflates input delay. Test a post-hydration interaction separately to separate hydration cost from handler cost.
- **Synchronous analytics on click:** move beacon/telemetry work out of click handlers into `scheduler.postTask({ priority: "background" })` or `requestIdleCallback`.
- **Unstable Zustand/Redux selectors:** selectors returning new object references re-render subscribers on unrelated updates, inflating processing time (see [`react.md`](react.md)).
- **Controlled `<input>` triggering heavy parent renders:** defer downstream work with `useDeferredValue` or move input state down to a smaller component.
- **Focus/blur reading layout geometry:** reading `offsetHeight` or `getBoundingClientRect()` inside focus handlers triggers `ForcedReflow`.

## Validation report

Include before/after `.json.gz` trace paths for the identical interaction (exact target and inputs), `INPBreakdown` phase deltas, confirmation that LCP, CLS, and bundle size did not regress, and the single-variable change.
