---
name: investigate-web-perf
description: This skill should be used when the user asks to "investigate a performance issue", "debug a slow page", "LCP is too high", "LCP regression", "INP is too slow", "slow interaction", "why is this re-rendering", "unnecessary re-renders", "bundle is too big", "bundle bloat", "memory leak", "analyze a performance trace", "debug web performance", "debug React performance", "debug Next.js performance", "Core Web Vitals regression", "ForcedReflow", or otherwise wants to diagnose a runtime performance problem in a web app using `chrome-devtools-mcp` traces and insights. Requires the `setup-perf-stack` tooling to be installed first.
---

# Investigate Web Performance Issues

Disciplined, evidence-driven investigation of web app performance problems using `chrome-devtools-mcp`. This skill is the canonical loop; references are loaded on demand based on the scenario and framework.

**Prerequisite:** `chrome-devtools-mcp` and the Chrome DevTools Skills plugin must be installed. If they aren't, stop and run the `setup-perf-stack` skill first.

## The Loop

1. **Reproduce deterministically.** Pin emulation. Never investigate a "sometimes slow" page without first making it reliably slow.
2. **Capture.** Record a trace; save to disk, do not stream JSON.
3. **Analyze via insights, never raw JSON.** Call `performance_analyze_insight` with a name from the fixed list of 18.
4. **Pin root cause to file:line.** Use `evaluate_script`, `list_network_requests`, `list_console_messages`, and React DevTools.
5. **State a single-variable hypothesis.** One change per iteration.
6. **Fix.** Make the minimum change the hypothesis predicts.
7. **Validate.** Re-trace under *identical* emulation. Accept only if the target insight moves ≥10% and no other Core Web Vital regresses. Otherwise revert and re-hypothesize.

## Always-Pinned Emulation Profile

Every trace in this skill uses these settings. Do not change them mid-investigation; you lose comparability.

- `cpuThrottlingRate: 4`
- `networkConditions: "Slow 4G"`
- Mobile viewport (390×844) unless the user specifies desktop
- Cache-cold loads via `new_page` + `navigate_page`, not warm reloads
- Run **N=3 and report the median**; single runs vary ±15–30%

Tighten only if the user explicitly wants a desktop-class target (e.g., `cpuThrottlingRate: 1`, `networkConditions: "Fast 4G"`). Document the deviation in the report.

## The 18-Insight Vocabulary

The agent MUST pass one of these as `insightName` to `performance_analyze_insight`. Do not invent names. Do not hand-roll `performance.getEntriesByType(...)` calls before exhausting insights.

Load / paint / rendering:
- `DocumentLatency`, `LCPBreakdown`, `LCPDiscovery`, `RenderBlocking`
- `CLSCulprits`, `ForcedReflow`, `SlowCSSSelector`

Interaction:
- `INPBreakdown`, `LongCriticalNetworkTree`, `NetworkDependencyTree`

JavaScript / delivery:
- `DuplicatedJavaScript`, `LegacyJavaScript`, `ModernHTTP`

Resources / configuration:
- `ThirdParties`, `FontDisplay`, `ImageDelivery`, `Viewport`, `Cache`

## Non-Negotiables

1. **Always call `performance_analyze_insight` before writing any custom Perf-API JS.** The 18 insights are the complete vocabulary for trace analysis. Custom `performance.getEntries*()` calls are a last resort, not a first move.
2. **Never pass raw trace JSON to the model.** Save with `filePath: "trace.json.gz"` and reference the path. Let the MCP's `PerformanceTraceFormatter` do the compression (30 MB → ~4 kB, 48 lines).
3. **One variable per iteration.** Never ship two simultaneous changes and call them a fix — you cannot attribute the delta.
4. **Re-trace under identical emulation before claiming a fix.** Before/after paths go in the report. No "it feels faster".
5. **Reject fixes <10% on the target insight, or any regression elsewhere.** Revert and form a new hypothesis.
6. **Spawn a subagent per insight drill-down** when traces are large. Each subagent returns <5 kB to the main thread. This is the single most effective way to keep the main context clean across a multi-step investigation.
7. **Prefer accessibility-tree snapshots over screenshots.** Screenshots are ~2k tokens each and rarely carry diagnostic signal for perf work. Reserve them for CLS visual verification and canvas/WebGL issues.

## Which Reference to Load

Load on demand — do not read these speculatively. The main SKILL.md (this file) already covers the universal discipline.

### By scenario

| Symptom | Load |
|---------|------|
| Slow first paint, high LCP, `LCPBreakdown` | `references/lcp.md` |
| Sluggish click/tap/type, high INP, `INPBreakdown` | `references/inp.md` |
| UI janky on scroll/update, React components rendering too often | `references/rerenders.md` + `references/react.md` |
| Initial JS payload too large, route-level bundle regression | `references/bundle.md` |
| Heap grows unboundedly, tab slows after N minutes, detached DOM | `references/memory.md` |
| Layout shift, CLS > 0.1 | Use `CLSCulprits` insight directly; escalate to `references/lcp.md` if layout and LCP are entangled |
| Forced synchronous layout / layout thrashing | Use `ForcedReflow` insight directly; load `references/react.md` if React is causing layout reads in render |

### By framework (load *in addition* to the scenario reference)

| Project | Load |
|---------|------|
| Any React project | `references/react.md` |
| Next.js 15 or 16+ | `references/nextjs.md` (plus `react.md`) |

Do not load framework references if the project doesn't use that framework.

## Loop Anti-Patterns

Watch for these and correct immediately:

- **Skipping insights for custom JS.** If the first tool call is `evaluate_script` with a `performance.*` API, the agent is doing it wrong. Back up and pick an insight.
- **"Let me also try..."** Second change before validating the first. Revert.
- **Comparing traces with different emulation.** The numbers are not commensurable.
- **Reporting LCP improved without checking INP/CLS.** A "fix" that trades one vital for another is not a fix.
- **Talking about the trace without reading the insight output.** If the agent is speculating based on code rather than trace evidence, something went wrong in step 2 or 3 — re-capture.

## When to Escalate to the User

- Non-determinism persists after N=3 medianing — likely real-user variance (CrUX field injection, thermal throttling, GC). Surface to the user and propose measuring in Sentry/RUM if available.
- Fix requires architectural change (e.g., switching rendering mode, moving to a CDN, adopting streaming SSR). State the hypothesis, estimated impact, and stop. Do not implement silently.
- Dependency upgrade required — confirm with the user before touching `package.json`.

## Reference Index

- `references/lcp.md` — LCP regression workflow: subpart model, insight sequence, prompt template.
- `references/inp.md` — INP / slow interaction workflow: Long Animation Frames, presentation split.
- `references/rerenders.md` — Unnecessary re-renders workflow: `react-scan`, classification, React DevTools integration.
- `references/bundle.md` — Bundle bloat workflow: `DuplicatedJavaScript`/`LegacyJavaScript`, network filtering, source mapping.
- `references/memory.md` — Memory leak workflow: heap snapshot comparison, `memlab`, common leak shapes.
- `references/react.md` — React-specific rules: memo discipline, `useDeferredValue`, `<Profiler>`, RSC streaming gotchas, tool recommendations.
- `references/nextjs.md` — Next.js-specific rules: Turbopack tracing, `instrumentation.ts`, RSC payload debugging, `next build` output parsing.
