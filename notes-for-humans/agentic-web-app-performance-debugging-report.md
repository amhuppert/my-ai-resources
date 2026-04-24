# A practical playbook for AI‑driven React performance debugging

**Bottom line:** As of April 2026, the anchor of any serious AI‑driven React performance workflow is Google's official **`chrome-devtools-mcp`** running under Claude Code or Codex CLI, supplemented by **`next-devtools-mcp`** for Next.js 16+, **`@sentry/mcp-server`** for production RUM, a **Lighthouse MCP** for batch scoring, and `react-scan` as the primary in‑browser render profiler. The ecosystem has consolidated fast: the old Puppeteer MCP is archived, `why-did-you-render` is in maintenance, and Million Lint is officially deprecated. What actually makes AI agents useful for perf is **not** bigger traces — it's the MCP's built‑in `performance_analyze_insight`, which compresses a ~30 MB Chrome trace into a ~4 KB, 48‑line summary over 18 named insights (LCPBreakdown, INPBreakdown, ForcedReflow, DuplicatedJavaScript, CLSCulprits, etc.). Everything below is organized so you can (a) install the right tools, (b) hand the agent the right context, and (c) run a reproducible reproduce → capture → analyze → fix → validate loop.

---

## 1. The MCP landscape for browser performance

### Chrome DevTools MCP (Google, official) — the anchor tool
Repo: `github.com/ChromeDevTools/chrome-devtools-mcp` (~27.6k stars, actively maintained through April 2026). It wraps Puppeteer + CDP and exposes **~29 tools** across five groups: performance (`performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`, `take_memory_snapshot`), network (`list_network_requests`, `get_network_request`), emulation (`emulate` for CPU throttling 1–20×, Slow/Fast 3G/4G, viewport, geolocation), debugging (`evaluate_script`, `list_console_messages`, `take_screenshot`, `take_snapshot` for a11y tree, `lighthouse_audit`), navigation, and input automation. It also ships Claude Code **Skills** installable via `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp` — including a dedicated LCP debug skill and accessibility debug skill.

**Install — Claude Code:** `claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest`
**Install — Codex CLI (`~/.codex/config.toml`):**
```toml
[mcp_servers.chrome-devtools]
command = "npx"
args = ["chrome-devtools-mcp@latest"]
startup_timeout_ms = 20000
```
Use `--no-performance-crux` and `--no-usage-statistics` in privacy‑sensitive contexts; WSL requires Chrome installed inside the Linux distro; pass `--browserUrl` and a dedicated `--user-data-dir` Chrome profile to debug authenticated pages.

### Playwright MCP (Microsoft, official) — cross‑browser complement
Repo: `github.com/microsoft/playwright-mcp`. Interacts via accessibility‑tree snapshots (element refs like `e5`) rather than pixels, which keeps token use low. Its `browser_start_tracing`/`browser_stop_tracing` produces a Playwright zip trace viewable at `trace.playwright.dev` — great for **cross‑browser (Firefox/WebKit) regression repro**, weaker for CDP‑level performance insights. Enable CDP‑style perf tools with `--caps=devtools`. Microsoft is now also pushing a token‑lighter `playwright-cli` + Skills variant; both are supported. Notable forks: `@executeautomation/playwright-mcp-server` (143 device profiles), `@tontoko/fast-playwright-mcp` (token‑optimized).

### `vercel/next-devtools-mcp` — essential for Next.js 16+
Bridges the new `/_next/mcp` dev‑server endpoint that Next.js 16+ ships. Surfaces live compile/runtime errors, route structure, the experimental Agent DevTools for React component trees (Next 16.2, March 2026), Suspense boundary automation, and Cache Components migration tools. Install: `{ "mcpServers": { "next-devtools": { "command": "npx", "args": ["-y", "next-devtools-mcp@latest"] }}}`. Pair with `chrome-devtools-mcp` for runtime trace analysis.

### Sentry MCP (official, remote) — production truth
Hosted at `mcp.sentry.dev` with OAuth; stdio variant `@sentry/mcp-server` for self‑hosted. Surfaces production issues, transactions, spans, performance regressions, and Sentry's own Seer RCA agent. Claude Code install: `claude plugin marketplace add getsentry/sentry-mcp && claude plugin install sentry-mcp@sentry-mcp`, or `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`. This is how agents reason about **real‑user field data** rather than just local lab runs.

### Lighthouse MCPs — batch scoring and budgets
`chrome-devtools-mcp` already has a `lighthouse_audit` tool for one‑off runs, but for batch scoring and regression diffing the best standalone is **`@danielsogl/lighthouse-mcp`** (v1.2.20, 13+ tools: Core Web Vitals, mobile vs desktop comparison, resource analysis, budget tracking, before/after diff, ships reusable MCP prompts). Simpler alternatives: `priyankark/lighthouse-mcp`, `mizchi/lighthouse-mcp` (three‑layer Collect/Analyze/Plan), and `adamsilverstein/lighthouse-mcp-server` (wraps PageSpeed Insights API instead of running Chrome — useful in CI).

### React‑specific MCPs — partial coverage
No official react‑devtools or react‑scan MCP exists yet. **`aidenybai/react-scan` has an open feature request (Issue #271, Feb 2025) but no MCP**; the "React Scan MCP" you'll find on LobeHub is `pawangupta123/react-scan-mcp-server`, an unrelated **static** source analyzer. The closest runtime options are **`mcpc-tech/dev-inspector-mcp`** (click‑to‑source element inspector for React/Vue/Next/Svelte, auto‑configures across Cursor/Claude Code/Windsurf, ships a Claude Skill) and **`ChakshuGautam/react-devtools-mcp`** (POC that wraps `react-devtools-core`'s WebSocket server — requires app code modification). For React Native: `metro-mcp` and `ohah/react-native-mcp`.

### Others worth knowing
**BrowserMCP** (`browsermcp/mcp`) uses your real Chrome profile via an extension — ideal for debugging logged‑in production sites. **Browserbase/Stagehand MCP** (`@browserbasehq/mcp`) is cloud‑hosted agentic automation with `act`/`extract`/`observe` primitives, useful for reproducing bugs on production but perf‑thin. The `@modelcontextprotocol/server-puppeteer` reference is **archived** — do not use for new work.

### Recommended minimum stack
```bash
# Claude Code
claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
claude mcp add next-devtools --scope user npx next-devtools-mcp@latest   # Next.js only
claude mcp add lighthouse --scope user npx @danielsogl/lighthouse-mcp@latest  # optional
```

---

## 2. Skills, agents, and plugins you can adopt today

### Official Anthropic
- **`anthropics/skills`** (github.com/anthropics/skills) — no dedicated perf skill, but `webapp-testing/` is the canonical Playwright‑based reconnaissance‑then‑action pattern, and `skill-creator/` defines the SKILL.md progressive‑disclosure format (frontmatter ≤1024 chars, body <500 lines, `references/` loaded on demand, `scripts/` whose output does **not** consume context — critical for trace analysis).
- **`anthropics/claude-plugins-official`** — official plugin directory at `claude.com/plugins`; lists the Chrome DevTools MCP plugin.

### `addyosmani/web-quality-skills` — the closest existing frontend‑perf skill set
Repo: `github.com/addyosmani/web-quality-skills` (~1.7k stars, Jan 2026). Six framework‑agnostic skills with explicit trigger phrases, threshold tables, and per‑framework (Next.js/React/Vue) code blocks: `performance/`, `core-web-vitals/`, `accessibility/`, `seo/`, `best-practices/`, plus an orchestrator `web-quality-audit/`. **Install:** `npx playbooks add skill addyosmani/web-quality-skills --skill performance`. This is the best existing template to fork for your own frontend‑perf‑debugger skill.

### Multi‑agent collections
- **`wshobson/agents`** (~32k stars) — 184 agents, 78 plugins. Its `application-performance` plugin bundles a `frontend-developer.md` agent with React 19/Next.js 15 patterns (memo/useMemo/useCallback, RSC, concurrent rendering, Suspense) and a `performance-engineer` back‑end agent; the canonical orchestration is **parallel**: `performance-engineer + database-optimizer → merged recommendations`.
- **`VoltAgent/awesome-claude-code-subagents`** — 100+ subagents. `02-language-specialists/react-specialist.md` explicitly targets React 18+ perf optimization. Note: its `performance-engineer.md` is **system‑level, not frontend** — don't invoke it expecting LCP advice.
- **`davila7/claude-code-templates`** (~24k stars) — 600+ agents including a `/optimize-bundle` command.

### Chrome DevTools Skills (official)
Three skills ship with `chrome-devtools-mcp` and are the most direct assets for React perf: the general `chrome-devtools-cli` skill (SKILL.md walks the agent through the capture→analyze loop with token‑efficient CLI invocations), **`debug-optimize-lcp`** (record reload trace → `performance_analyze_insight("LCPBreakdown")` → drill `LCPDiscovery`/`DocumentLatency`/`RenderBlocking` → fix dominant subpart → re‑trace), and an accessibility debug skill. Issue #1114 in that repo explicitly documents why curated skills beat freeform `Runtime.evaluate` for Core Web Vitals — the model hallucinates Performance‑API calls otherwise.

### OpenAI Codex ecosystem
Codex CLI (`github.com/openai/codex`) uses the shared **AGENTS.md** spec (`agents.md`) and the **same SKILL.md progressive‑disclosure format** as Claude (see `developers.openai.com/codex/skills`) — skills are broadly portable. OpenAI's Visual Studio team documents `.agent.md` patterns for custom agents. GitHub's analysis of 2,500 repos (`github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/`) is the best reference for AGENTS.md quality heuristics. There is **no** well‑known community Codex‑specific perf skill yet; fork one of the Claude skills above — the format is compatible. Caveat: open issue `openai/codex#17574` reports that long‑running Codex sessions leak `chrome-devtools-mcp` helper processes; `pkill -f chrome-devtools-mcp` between sessions until it's fixed.

### Security caveat
Snyk's ToxicSkills study (referenced at `snyk.io/articles/top-claude-skills-ui-ux-engineers/`) found ~13% of community "awesome‑skill" packages had critical security flaws, some exfiltrating credentials. **Review the SKILL.md and any bundled scripts before installing** community skills; stick to Anthropic's own `skills/` repo, `addyosmani/web-quality-skills`, and `ChromeDevTools/chrome-devtools-mcp` skills as your safe base.

---

## 3. Libraries, CLIs, and instrumentation the agent can drive

### Web Vitals (local and production)
**`web-vitals` v5.x** (8.6M weekly downloads). Exports `onLCP`, `onINP`, `onCLS`, `onFCP`, `onTTFB`. `onFID` was removed; FID retired in March 2024. The `web-vitals/attribution` build gives you per‑metric attribution including the `longAnimationFrameEntries` that actually caused a bad INP — this is what you want the agent to log when chasing a regression.

### Long Animation Frames API
`PerformanceLongAnimationFrameTiming` (Chrome 123+, not yet Baseline) supersedes Long Tasks. Critical fields: `duration`, `blockingDuration`, `renderStart`, `styleAndLayoutStart`, and **`scripts[]` with per‑script attribution** (url, invoker, forcedStyleAndLayoutDuration). Have the agent inject a `PerformanceObserver` on `long-animation-frame` with `buffered: true` when diagnosing INP — script attribution maps straight to your React files.

### Browser automation + trace capture
- **Playwright** `context.tracing.start/stop` → zip viewable at `trace.playwright.dev`. Good for actions+network, weaker for raw CPU profile.
- **Puppeteer** `page.tracing.start({ categories: ['devtools.timeline','v8.execute','blink.user_timing'] })` + `page.metrics()` → trace JSON loadable in DevTools Performance panel.
- **CDP direct** via `page.target().createCDPSession()`: `Performance.getMetrics`, `Profiler.start/stop`, `HeapProfiler.takeHeapSnapshot`. Use when the MCP's abstractions are too coarse.

### Lighthouse
`lighthouse` CLI + programmatic Node API (v12.6.1; PWA category removed in v12). For CI, **`@lhci/cli`** (`npx lhci autorun --collect.url=... --assert.preset=lighthouse:recommended`). For multi‑page crawls, **Unlighthouse** (`npx unlighthouse --site https://example.com`) with `unlighthouse-ci` for budgets.

### React‑specific profiling
- **`<Profiler>` API** — still the cleanest temporary instrumentation. Emit `performance.measure()` from `onRender` so marks appear in every trace the agent captures.
- **`react-scan`** (`aidenybai/react-scan`, ~20.9k stars, actively maintained) — best successor to why‑did‑you‑render. Run ad hoc: `npx react-scan@latest http://localhost:3000`. Or programmatic with `scan({ enabled: true, log: true, onRender: (fiber, renders) => ... })`; supports `react-scan/all-environments` for production. The `onRender(fiber, renders)` callback is your agent‑friendly feed of unnecessary renders.
- **`why-did-you-render`** — ⚠️ **maintenance only** since Jan 2025 (maintainer joined the React team). Still works on React 19 but funnel new projects to react‑scan.
- **Million.js / Million Lint** — ⚠️ **`@million/lint` is officially deprecated on npm**; Million.js itself is effectively unmaintained (author moved to react‑scan). **Do not recommend in 2026.**
- **React DevTools** — `react-devtools-core` for Node/standalone; Next.js 16.2 introduced experimental **Agent DevTools** that gives coding agents terminal‑side access via MCP.

### Bundle analysis
`webpack-bundle-analyzer`, `rollup-plugin-visualizer`, `vite-bundle-visualizer`, `source-map-explorer`, `@next/bundle-analyzer` (`ANALYZE=true next build`), and **Statoscope** (for duplicate packages, chunk maps, entry download‑time budgets; supports webpack + rspack; has a CI validator: `npx @statoscope/cli validate --config statoscope.config.js`).

### Next.js specifics
`next build` stdout table (parse for per‑route First Load JS budgets). **Turbopack tracing** (default bundler in Next.js 16): `NEXT_TURBOPACK_TRACING=1 next dev`, view with `next internal turbo-trace-server`. **`instrumentation.ts`** is stabilized in Next 15 (drop `experimental.instrumentationHook`); use `@vercel/otel` for edge‑compatible OpenTelemetry, add `NEXT_OTEL_VERBOSE=1` for extra spans. RSC payload debugging: `curl -H "RSC: 1" http://localhost:3000/path`, or inspect `?_rsc=1` responses (content‑type `text/x-component`).

### Memory and leak detection
**`memlab`** (facebook/memlab) is the gold standard — CLI, `@memlab/api` Node API, and `@memlab/mcp-server` (23 heap‑analysis tools). Write a scenario with `url`/`action`/`back`/`leakFilter`, then `memlab run --scenario ./scenario.js && memlab analyze unbound-object`. For SPAs, **`fuite`** (`npx fuite http://localhost:3000`) iterates a scenario and reports leaking objects, listeners, detached DOM, growing collections. For custom flows, grab heap snapshots directly via CDP: `HeapProfiler.enable` → `HeapProfiler.collectGarbage` → `takeHeapSnapshot` with chunk streaming.

### Production tracing
**Sentry Performance** with Next 15.4.1+ uses OTel auto‑instrumentation and now fully supports Turbopack. **OpenTelemetry Web SDK** (`@opentelemetry/sdk-trace-web` + `instrumentation-fetch`/`-xml-http-request`/`-user-interaction`). **Vercel Speed Insights v2** (now MIT‑licensed, March 2026 release with resilient‑intake endpoint discovery). **Datadog RUM** (`@datadog/browser-rum`) auto‑correlates RUM to APM traces.

---

## 4. The canonical debugging loop

Practitioners (Chrome team, Addy Osmani, Dave Patten, DebugBear, Continue.dev) have converged on a single loop:

**Reproduce deterministically.** Pin `emulate` to `cpuThrottlingRate: 4` and `networkConditions: "Slow 4G"`. Use `new_page` + `navigate_page` for cache‑cold loads. For interactions, resolve a11y‑tree UIDs via `take_snapshot` then drive `click`/`fill`/`press_key`. **Capture.** `performance_start_trace({ reload: true, autoStop: true })` for load perf, `autoStop: false` + manual stop for interactions; save compressed (`filePath: "trace.json.gz"`). **Analyze with insights, never raw JSON.** The MCP's `PerformanceTraceFormatter` compresses a 30 MB trace to ~4 KB/48 lines (DebugBear measured this on Substack). Drill with `performance_analyze_insight(insightName, insightSetId)` — the 18 insights are the complete vocabulary: `DocumentLatency`, `LCPBreakdown`, `LCPDiscovery`, `RenderBlocking`, `CLSCulprits`, `INPBreakdown`, `LongCriticalNetworkTree`, `NetworkDependencyTree`, `ForcedReflow`, `SlowCSSSelector`, `DuplicatedJavaScript`, `LegacyJavaScript`, `ModernHTTP`, `ThirdParties`, `FontDisplay`, `ImageDelivery`, `Viewport`, `Cache`. **Pin root cause to file:line** using `evaluate_script` (`performance.getEntriesByType("longtask")` or LCP element identification), `list_network_requests` filtered by type, and `list_console_messages` with source‑mapped stacks. Enable React DevTools in the debug profile (Chrome 144 exposes React 19.2 component names on flamegraphs via the DevTools Extensibility API). **State a single‑variable hypothesis** before editing code. **Validate** with an identical re‑trace; reject fixes that don't move the targeted insight or that regress any other Core Web Vital.

Documented in: Dave Patten's SPEC.md pattern at `starman69/mcp-frontend-perf`, Chrome's official `debug-optimize-lcp` skill, Continue.dev's perf cookbook (`docs.continue.dev/guides/chrome-devtools-mcp-performance`), and DebugBear's walk‑through (`debugbear.com/blog/chrome-devtools-mcp-performance-debugging`, where Substack's LCP dropped from 1383 ms to 628 ms by removing `loading="lazy"` from a hero image — identified by the agent from `LCPDiscovery`).

---

## 5. Prompt templates and handoff context

### CLAUDE.md / AGENTS.md pattern for perf work
Keep AGENTS.md ≤150 lines (HumanLayer's and GitHub's 2,500‑repo analysis both find frontier models degrade past that). A perf‑focused AGENTS.md should declare: **stack and version**, **hard budgets** (e.g., LCP p75 ≤ 2.5s on Slow 4G + 4× CPU; INP p75 ≤ 200ms; CLS ≤ 0.1; initial JS per route ≤ 170 KB gz), **required tools** (`chrome-devtools-mcp --slim` by default, full suite on request), **workflow non‑negotiables** (always `performance_analyze_insight` before writing perf‑API JS; state a single‑variable hypothesis before editing; reject fixes without before/after trace paths in the PR body), **React‑specific rules** (don't add `React.memo` without measuring; prefer `useDeferredValue`/`useTransition` to debouncing in concurrent React; RSC LCP elements are often streamed in a second chunk), and **known quirks** (HMR builds lie about bundle size; Sentry/PostHog add ~40 ms blocking — gate behind `?perf=1`). The companion CLAUDE.md is 5–15 lines pointing to AGENTS.md and reminding to `/clear` between investigations.

### Copy‑pasteable prompts

**LCP regression:** "Record a reload trace of `<URL>` with Slow 4G + 4× CPU. Call `performance_analyze_insight` for `LCPBreakdown`, `LCPDiscovery`, `DocumentLatency`, `RenderBlocking`. Use `evaluate_script` to identify the LCP element (tag, src, timing). Compute the dominant subpart (TTFB / resource load delay / resource load duration / element render delay). Propose the single smallest change, implement it, re‑trace, and show before/after LCP with subpart deltas. Stop if LCP improves <10% or any other Core Web Vital regresses."

**INP / slow interaction:** "Navigate to `<URL>`, emulate 4× CPU and Slow 4G. Take a snapshot to get UIDs. Start a trace with `autoStop: false, reload: false`. Click the `<target>` UID, type `<input>`, press Enter, wait for network idle, stop. Run `performance_analyze_insight` for `INPBreakdown` and `LongCriticalNetworkTree`. Report: interaction target; input delay / processing / presentation split; top 3 long tasks >50 ms with source‑mapped stacks; the React component owning each. No fixes yet."

**Unnecessary re‑renders:** "Connect to the running Chrome (`--browserUrl`). Enable the React DevTools track via the Extensibility API. Start a trace, scroll the list 500 px four times, stop. List components that rendered >3 times with identical props. For each, read the source and classify: missing `React.memo` / inline object or function in parent / over‑subscribed context. Produce a table: Component | Renders | Root cause | Minimal diff. No code changes."

**Bundle bloat:** "Run a reload trace + Lighthouse on `<URL>`. Analyze `DuplicatedJavaScript`, `LegacyJavaScript`, `ModernHTTP`. List network requests filtered by `resourceType=Script`, sorted by `transferSize` desc. For the top 5: source‑map to files, identify npm package and which route loads them, flag any shipped to routes that don't need them. Output a code‑split/tree‑shake plan with expected kB savings per item."

**Memory leak:** "Open `<URL>`. Take a baseline heap snapshot as `snap1`. Run the scenario 50 times (fill + press Enter loop), idle, snapshot as `snap2`. Repeat for `snap3`. Compare retained size growth between snapshots. Identify constructor names with monotonically growing retained size. For each suspect, grep the codebase for `addEventListener` / `subscribe` / `setInterval` without matching cleanup in `useEffect` returns. Produce a leak‑suspect report with file:line anchors. Do not fix."

**Replay from an existing trace:** "Load `./traces/prod-regression.json.gz` via the CLI (not `Runtime.evaluate`). Filter events where `type=='task' && dur > 50000µs`. Group by top‑of‑stack function and sum self time. Source‑map via `./dist/`. Classify top 10 as React render / React commit / forced reflow / third‑party / JSON.parse / hydration. Cross‑check with `performance_analyze_insight("ForcedReflow")` and `("INPBreakdown")`. Return a markdown table with total blocking contribution and a one‑line hypothesis per row."

---

## 6. Real case studies worth reading

The canonical launch piece is **"Chrome DevTools (MCP) for your AI agent"** by Mathias Bynens and Michael Hablich (developer.chrome.com/blog/chrome-devtools-mcp, Sep 23 2025) — introduces the perf tools with the "localhost is loading slowly, make it load faster" demo. **Addy Osmani's "Give your AI eyes"** (addyosmani.com/blog/devtools-mcp) is the best narrative walkthrough of the 26‑tool surface. **DebugBear's "Performance Debugging With The Chrome DevTools MCP Server"** (debugbear.com/blog/chrome-devtools-mcp-performance-debugging, Oct 2025) is the most concrete: Gemini + MCP takes Substack's LCP from 1383 ms → 628 ms, with a quantified 29.8 MB → 4 KB trace‑to‑summary compression. **Dave Patten's "Spec‑Driven Development with AI Agents"** (medium.com/@dave-patten/spec-driven-development-with-ai-agents-from-build-to-runtime-diagnostics-415025fb1d62) plus the companion repo `starman69/mcp-frontend-perf` demonstrates pairing Playwright MCP (interaction) + chrome‑devtools‑mcp (traces) behind a SPEC.md for layout thrashing, LCP, and long‑task demos. **LogRocket's walkthrough** (blog.logrocket.com/debugging-with-chrome-devtools-mcp) covers a broken React app fixed via console + network + trace in one loop. **Continue.dev's perf cookbook** (docs.continue.dev/guides/chrome-devtools-mcp-performance) has CI‑ready prompts for Core Web Vitals audits, multi‑route auditing, and competitor benchmarking, with the discipline of running in Plan Mode before expensive trace calls. Two useful Hacker News threads: `news.ycombinator.com/item?id=45949591` (why practitioners rate chrome‑devtools‑mcp as the single highest‑value MCP) and `news.ycombinator.com/item?id=46223714` (WebMCP preview cuts CDP MCP token use ~90%). Mario Zechner's contrarian **"What if you don't need MCP at all?"** (mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/) measures the actual token cost of loading MCPs (Playwright 13.7k, chrome‑devtools 18.0k tokens per session) and argues for thin skills + CLI for narrow perf tasks.

---

## 7. Known limits and how to work around them

**Trace size vs context window.** A Chrome trace is 5–50 MB; context is ~200k tokens. **Never pass raw trace JSON to the model.** Rely on the MCP's built‑in `PerformanceTraceFormatter` summary and drill one insight at a time via `performance_analyze_insight(name, setId)`. Save traces to disk and reference paths. Spawn a subagent per insight so each returns a <5 KB summary to the main thread.

**Non‑determinism.** LCP/INP vary ±15–30% run‑to‑run from CPU thermal state, GC, and CrUX field‑data injection. Always pin emulation, run N=3 and report median, use `--no-performance-crux` for lab‑only numbers, and prefer curated skills over freeform `Runtime.evaluate`.

**Hallucinated Performance‑API code.** Models invent `performance.getEntriesByType("largest-contentful-paint-v2")` and similar non‑existent APIs — this is explicitly acknowledged in `chrome-devtools-mcp#1114`. Force the agent to pick `insightName` from the fixed list of 18 rather than hand‑roll JS. Use the `debug-optimize-lcp` skill and the accessibility skill as reference patterns.

**RSC / streaming SSR.** The LCP element may live inside a Suspense boundary on a later chunk. Naïve `querySelector` at DOMContentLoaded misses it. Have the agent read the RSC chunks from `list_network_requests` and correlate chunk arrival to LCP paint timestamp. For hydration cost, use Long Animation Frame entries; Chrome 144 + React 19.2 expose fiber component names on flamegraphs via the DevTools Extensibility API.

**Fiber/scheduler confusion.** CDP traces don't natively label React fibers. Enable React DevTools in the debug profile (see `raf.dev/blog/chrome-debugging-profile-mcp`) and cross‑check agent claims against a manual React Profiler recording. For hook/props/state introspection, `mcpc-tech/dev-inspector-mcp` or the `react-devtools-for-ai-agents` skill is more reliable than asking the agent to read fiber from a trace.

**Authenticated sessions.** Chrome 136+ blocks remote debugging on the default profile. Launch a dedicated profile with `--remote-debugging-port=9222 --user-data-dir=/path`, connect via `--browserUrl` / `--autoConnect` (Chrome 144+).

**Codex CLI process leaks.** Open issue `openai/codex#17574`: long sessions leak `chrome-devtools-mcp` helper trees consuming tens of GB of swap. `pkill -f chrome-devtools-mcp` between sessions; prefer CLI scripts over resident MCP for batch trace runs.

**Context pollution.** Screenshots cost ~2k tokens each; verbose tool outputs push sessions past ~60% context where instruction‑following degrades. Use `/clear` between unrelated perf tasks, delegate trace triage to subagents, prefer text snapshots over screenshots, and consider `--slim` MCP modes.

---

## 8. Starter setup — 15 minutes to working agent

1. Install the MCP anchors: `claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest`, optionally `next-devtools` (Next.js 16+), Sentry MCP, and a Lighthouse MCP.
2. Install the Chrome DevTools Skills plugin: `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp`. Add `addyosmani/web-quality-skills` as a template.
3. Drop the AGENTS.md skeleton from §5 into your repo, customized with your budgets and stack. Add a one‑line CLAUDE.md that points to it and reminds to `/clear` between investigations.
4. Add a dev dependency on **`react-scan`** and optionally **`memlab`**; include a `scripts/` entry like `"scan": "react-scan http://localhost:3000"`.
5. Launch a dedicated Chrome debug profile for authenticated sites: `google-chrome --remote-debugging-port=9222 --user-data-dir=$HOME/.chrome-debug`. Configure the MCP with `--browserUrl http://localhost:9222`.
6. Start with the **LCP regression prompt** from §5 against a known slow route. Review the agent's insight selection and the before/after trace deltas. Once that loop is boring, promote it to a CI job (Continue.dev's cookbook shows the ubuntu‑latest pattern).

---

## Conclusion

The 2025–2026 shift is that **real‑browser grounding plus structured trace summarization** — not bigger context windows — is what made AI agents actually useful for React perf. The winning pattern is a tight tool surface (chrome‑devtools‑mcp + Sentry MCP + next‑devtools for Next.js) driven by a disciplined loop where the agent always reaches for `performance_analyze_insight` and the 18 named insights before it writes any custom Perf‑API JS. Most traditional React perf libraries are in rearrangement — why‑did‑you‑render handed off to React DevTools, Million Lint is gone, react‑scan is the new default — while the Chrome team, Vercel, and Sentry have all shipped first‑party MCPs that together cover lab, build, and field data. What remains genuinely hard is non‑determinism, trace attribution across RSC streaming, and the token economics of long sessions; mitigate with deterministic emulation, subagent‑scoped trace triage, and curated skills rather than freeform evaluation. Build your playbook around that loop, keep your AGENTS.md under 150 lines, and the agent becomes a reliable, evidence‑driven perf partner instead of a confident guesser.