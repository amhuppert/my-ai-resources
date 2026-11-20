---
name: investigate-web-perf
description: "Diagnose and fix web performance issues with chrome-devtools-mcp
  traces and insights: slow LCP/INP, layout shift (CLS), ForcedReflow, bundle
  bloat, and memory leaks. For React component re-render attribution or
  Playwright render budgets, recommend /react-scan."
---

# Investigate web performance issues

Run a disciplined, evidence-backed performance loop using `chrome-devtools-mcp`. Load scenario and framework references on demand instead of speculatively.

**Prerequisite:** `chrome-devtools-mcp` and the Chrome DevTools Skills plugin must be installed. If `performance_analyze_insight` is unavailable, stop and tell the user to run `/setup-perf-stack` first.

## Pinned emulation profile

Use identical settings for every trace in an investigation so before/after numbers stay comparable:

- `cpuThrottlingRate: 4`
- `networkConditions: "Slow 4G"`
- Mobile viewport (`390x844`) unless the user explicitly asks for desktop
- Cache-cold loads via `new_page` + `navigate_page` (not warm reloads)
- Run **N=3 and report the median** (single lab runs swing +/-15 to 30%)

Loosen to desktop targets (for example `cpuThrottlingRate: 1`, `"Fast 4G"`) only when the user asks for desktop, and state that override in the report.

## Investigation loop and hard constraints

1. **Reproduce deterministically.** Pin emulation first. Do not debug a "sometimes slow" page before reproducing it reliably.
2. **Capture to disk.** Record a trace with `filePath: "trace.json.gz"`. Never pass raw trace JSON into model context; let the MCP's `PerformanceTraceFormatter` compress it (~30 MB down to ~4 kB).
3. **Analyze with named insights first.** Call `performance_analyze_insight` using one of the 18 exact names below before writing any custom `evaluate_script` Perf-API query. Custom `performance.getEntries*()` code is a last resort.
4. **Pin root cause to `file:line`.** Narrow with `evaluate_script`, `list_network_requests`, `list_console_messages`, and the React DevTools track. Prefer accessibility-tree snapshots over screenshots (~2k tokens each); use screenshots only for visual CLS verification or canvas/WebGL.
5. **Form one single-variable hypothesis.** Change one thing per iteration. Never bundle two edits and claim credit for either.
6. **Apply the minimum fix** predicted by the hypothesis.
7. **Re-trace under identical emulation.** Accept the fix only if the target insight improves by at least 10% and no other Core Web Vital (LCP, INP, CLS) regresses. Otherwise revert and form a new hypothesis.

When traces are large and the environment supports subagents, dispatch a subagent per insight drill-down and have each return a concise summary (<5 kB) to keep the main context clean.

## Valid `insightName` values (18 total)

Pass one of these exact names to `performance_analyze_insight`; never invent names:

- **Load / paint / layout:** `DocumentLatency`, `LCPBreakdown`, `LCPDiscovery`, `RenderBlocking`, `CLSCulprits`, `ForcedReflow`, `SlowCSSSelector`
- **Interaction / network:** `INPBreakdown`, `LongCriticalNetworkTree`, `NetworkDependencyTree`
- **JavaScript / delivery:** `DuplicatedJavaScript`, `LegacyJavaScript`, `ModernHTTP`
- **Resources / config:** `ThirdParties`, `FontDisplay`, `ImageDelivery`, `Viewport`, `Cache`

## Load references by scenario and framework

Load only the file(s) matching the observed symptom and project stack:

| Symptom or stack | Load | What it adds |
| --- | --- | --- |
| Slow first paint, high LCP, `LCPBreakdown` | [`references/lcp.md`](references/lcp.md) | 4-subpart model, insight order, streaming/font/image gotchas |
| Sluggish click/tap/type, high INP, `INPBreakdown` | [`references/inp.md`](references/inp.md) | 3-phase split, Long Animation Frames (`entry.scripts[]`) attribution |
| UI jank or excessive React renders | [`references/rerenders.md`](references/rerenders.md) + [`references/react.md`](references/react.md) | Trace + React DevTools correlation (for deep component attribution, recommend `/react-scan`) |
| Large initial JS payload or route bundle regression | [`references/bundle.md`](references/bundle.md) | `DuplicatedJavaScript`/`LegacyJavaScript`, network sorting, build-tool attribution |
| Growing heap, detached DOM, tab slowdown | [`references/memory.md`](references/memory.md) | 3-snapshot heap diff, `fuite`, `memlab`, cleanup grep patterns |
| Layout shift (`CLS > 0.1`) | None first (`CLSCulprits`) | Load `references/lcp.md` only if layout shift and LCP are entangled |
| Forced synchronous layout / thrashing | None first (`ForcedReflow`) | Load `references/react.md` if React render code triggers layout reads |
| Any React project (add to scenario ref) | [`references/react.md`](references/react.md) | Memo discipline, `useTransition`/`useDeferredValue`, `<Profiler>`, RSC gotchas |
| Next.js 15 or 16+ (add to scenario + `react.md`) | [`references/nextjs.md`](references/nextjs.md) | `next-devtools-mcp`, Turbopack tracing, RSC payload inspection, Cache Components |

## When to stop and ask the user

- **Persistent variance after N=3 medians:** likely real-user or thermal/GC noise; suggest Sentry/RUM field data instead of guessing.
- **Architectural fix required** (changing rendering mode, adding a CDN, adopting streaming SSR): report the hypothesis and expected gain, then stop for approval.
- **Dependency changes needed:** ask before modifying `package.json`.

## Completion criteria

Done when the report includes before/after `.json.gz` trace paths taken under identical emulation, the exact `performance_analyze_insight` deltas (N=3 median), the single-variable diff pinned to `file:line`, and confirmation that other Core Web Vitals did not regress (or, for diagnosis-only runs, the pinned root cause and ranked fix proposal).
