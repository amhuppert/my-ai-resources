---
name: setup-perf-stack
description: This skill should be used when the user asks to "set up performance debugging", "install chrome-devtools-mcp", "install the perf MCP stack", "equip Claude Code for React performance debugging", "set up frontend perf tooling", "add the Chrome DevTools MCP", "install next-devtools MCP", "install the performance tooling", or otherwise wants to bootstrap an AI-driven performance debugging workflow for a web application.
---

# Setup: Performance Debugging Stack

Bootstrap the MCP servers and skills required for Claude Code to autonomously investigate performance issues in web applications.

This skill only handles **installation**. For the actual investigation workflow (the reproduce → capture → analyze → fix → validate loop, framework-specific rules, per-scenario playbooks), use the `investigate-web-perf` skill once setup is complete.

## What This Skill Installs

The anchor is `chrome-devtools-mcp` — it wraps Puppeteer + CDP and exposes `performance_analyze_insight`, which compresses a ~30 MB Chrome trace into a ~4 KB summary across 18 named insights (LCPBreakdown, INPBreakdown, ForcedReflow, DuplicatedJavaScript, CLSCulprits, etc.). Without this compression, raw traces blow the context window. Everything else layers on top.

| Component | Role | Required? |
|-----------|------|-----------|
| `chrome-devtools-mcp` | Lab traces, CDP, insights, Lighthouse-in-MCP | **Yes** |
| Chrome DevTools Skills plugin | Curated LCP + a11y workflows that prevent Perf-API hallucinations | **Yes** |
| `next-devtools-mcp` | Next.js 16+ dev-server bridge, route tree, Suspense automation | Next.js 16+ only |
| `@danielsogl/lighthouse-mcp` | Batch scoring + regression diff | Optional; CDT MCP has `lighthouse_audit` |
| `react-scan` dev dep | Runtime render profiler (successor to why-did-you-render) | React projects |
| Dedicated Chrome debug profile | Required for authenticated sites (Chrome 136+ blocks default profile) | Auth flows only |

## Before You Start

Ask the user (or infer from the repo) and confirm:

1. **Framework** — Next.js 16+ / Next.js 15 / plain React / Vite / other. Only install `next-devtools-mcp` for Next.js 16+.
2. **Auth** — Does the perf scenario require logging in? If yes, do step 5.
3. **Scope** — User-level (`--scope user`, every project inherits) or project-level (`--scope project`, only this repo). Default to `user` for the core tools.

Never install speculatively. Each MCP costs ~13–18k tokens of tool definitions per session; a minimal stack is the right default.

## Step 1 — Install the Anchor: `chrome-devtools-mcp`

```bash
claude mcp add chrome-devtools --scope user -- npx chrome-devtools-mcp@latest
```

Privacy-sensitive or offline contexts:

```bash
claude mcp add chrome-devtools --scope user -- npx chrome-devtools-mcp@latest --no-performance-crux --no-usage-statistics
```

**WSL:** Chrome must be installed *inside* the Linux distro, not via the Windows host. Check with `which google-chrome`.

## Step 2 — Install the Chrome DevTools Skills Plugin

These are the curated skills Google ships alongside the MCP. They encode the capture→analyze loop and counter the documented failure mode where models hallucinate non-existent Performance-API calls (`chrome-devtools-mcp#1114`).

```bash
/plugin marketplace add ChromeDevTools/chrome-devtools-mcp
/plugin install chrome-devtools-mcp@chrome-devtools-mcp
```

This brings in at minimum: `chrome-devtools-cli`, `debug-optimize-lcp`, and the accessibility debug skill.

## Step 3 — Framework-Specific MCP (Next.js 16+ Only)

Bridges the `/_next/mcp` dev-server endpoint for route/Suspense/compile-error introspection.

```bash
claude mcp add next-devtools --scope user -- npx -y next-devtools-mcp@latest
```

Skip this step for non-Next.js projects and for Next.js 15 or earlier.

## Step 4 — Optional Lab Tooling

**Lighthouse MCP** (batch scoring, regression diffs, reusable prompts) — skip unless the user explicitly needs batch Lighthouse runs. `chrome-devtools-mcp` already exposes `lighthouse_audit` for one-off runs.

```bash
claude mcp add lighthouse --scope user -- npx @danielsogl/lighthouse-mcp@latest
```

**`react-scan`** as a dev dependency for in-browser render inspection:

```bash
npm install --save-dev react-scan
```

Optional convenience script for `package.json`:

```json
"scripts": {
  "scan": "react-scan http://localhost:3000"
}
```

**Do not install:** `@million/lint` (deprecated on npm), `why-did-you-render` for new projects (maintenance-only since Jan 2025), any community "react-scan MCP" (none is officially supported; the one on LobeHub is an unrelated static analyzer).

## Step 5 — Dedicated Chrome Debug Profile (Auth Flows Only)

Chrome 136+ blocks remote debugging against the default profile. For any authenticated page, launch a dedicated profile:

```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-debug"
```

Log in once in this profile (cookies persist across sessions), then reconfigure the MCP to attach to the running instance:

```bash
claude mcp remove chrome-devtools
claude mcp add chrome-devtools --scope user -- \
  npx chrome-devtools-mcp@latest \
  --browserUrl http://localhost:9222 \
  --user-data-dir "$HOME/.chrome-debug"
```

## Step 6 — Smoke-Test the Install

Ask the agent to record a trace against a known URL:

> Record a reload trace of `https://example.com` with Slow 4G + 4× CPU. Call `performance_analyze_insight` for `LCPBreakdown`. Report the LCP element and the dominant subpart.

**Success signals:**
- Agent calls `performance_start_trace` with emulation params, not freeform `evaluate_script`.
- Agent calls `performance_analyze_insight` with a valid insight name from the fixed list of 18.
- Agent receives a compact summary, not raw trace JSON.

**Failure signals** (reinstall steps 1–2):
- Agent invents `performance.getEntriesByType("largest-contentful-paint-v2")` or similar non-existent APIs.
- Agent dumps raw trace JSON into the response.
- `performance_analyze_insight` is not available as a tool.

Once the smoke test passes, hand off to the `investigate-web-perf` skill for real work.

## Troubleshooting

- **`chrome-devtools-mcp` process leak on Codex CLI** — Open issue `openai/codex#17574`. Long sessions leak helper processes consuming tens of GB of swap. Run `pkill -f chrome-devtools-mcp` between sessions until patched.
- **Context pollution** — Each screenshot is ~2k tokens; verbose tool outputs degrade instruction-following past ~60% context. Use `/clear` between unrelated perf investigations, delegate trace triage to subagents, prefer snapshots over screenshots.
- **Non-deterministic numbers** — LCP/INP vary ±15–30% from CPU thermal state and GC. This is a property of the metric, not a setup issue. The `investigate-web-perf` skill handles this by always pinning emulation and running N=3.
- **Authenticated page times out** — You skipped step 5. Default profile debugging is blocked since Chrome 136.
- **Agent hallucinates Perf-API methods** — You skipped step 2. The curated skills exist specifically for this failure mode.

## Community Skills Security Caveat

Snyk's ToxicSkills study found ~13% of community "awesome-skill" packages had critical security issues, some exfiltrating credentials. Review every `SKILL.md` and bundled script before installing community skills. Safe base: Anthropic's own `skills/` repo, `addyosmani/web-quality-skills`, and skills bundled with `ChromeDevTools/chrome-devtools-mcp`.
