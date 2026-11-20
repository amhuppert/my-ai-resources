---
name: setup-perf-stack
description: "Install and smoke-test web performance debugging tooling:
  chrome-devtools-mcp, Chrome DevTools Skills, optional
  Next.js/Lighthouse/react-scan tools, and Chrome debug profiles."
---

# Setup performance debugging stack

Install and verify the MCP servers and plugins needed for trace-based web performance work. This skill covers **setup only**; once the smoke test passes, use `investigate-web-perf` for actual diagnosis and optimization.

## Stack components

`chrome-devtools-mcp` is the required core: it wraps Puppeteer + CDP and exposes `performance_analyze_insight`, which compresses ~30 MB traces into ~4 kB summaries across 18 named insights. Everything else is optional by project stack:

| Component | Role | Install when |
| --- | --- | --- |
| `chrome-devtools-mcp` | Lab traces, CDP, 18 insights, built-in `lighthouse_audit` | Always |
| Chrome DevTools Skills plugin | Curated LCP/a11y workflows that curb Perf-API hallucinations (`chrome-devtools-mcp#1114`) | Always |
| `next-devtools-mcp` | `/_next/mcp` route, Suspense, and compile-error introspection | Next.js 16+ only |
| `@danielsogl/lighthouse-mcp` | Batch Lighthouse scoring and regression diffs | Only if batch Lighthouse runs are needed |
| `react-scan` (dev dep) | Runtime React render profiler | React projects |
| Dedicated Chrome debug profile | Remote debugging on Chrome 136+ (default profile is blocked) | Authenticated flows only |

Do not install speculatively: each MCP server adds ~13k to 18k tokens of tool schemas per session. Never install `@million/lint` (deprecated), `why-did-you-render` for new projects (maintenance-only since Jan 2025), or unofficial "react-scan MCP" packages.

## 1. Confirm project needs

Infer from the repository where possible, and ask only what cannot be inferred:

1. **Framework:** Next.js 16+, Next.js 15, plain React, Vite, or other (install `next-devtools-mcp` only for Next.js 16+).
2. **Authentication:** whether performance runs must load logged-in pages (determines Step 4).
3. **Install scope:** user-level (`--scope user`, default for core MCPs) or project-level (`--scope project`).

## 2. Install `chrome-devtools-mcp` and its skills plugin

Commands below show Claude Code CLI syntax; for Codex CLI or another MCP client, add the same `npx` command and flags to that client's MCP config.

```bash
# Standard user-scope install
claude mcp add chrome-devtools --scope user -- npx chrome-devtools-mcp@latest

# Privacy-sensitive or offline environments
claude mcp add chrome-devtools --scope user -- \
  npx chrome-devtools-mcp@latest --no-performance-crux --no-usage-statistics
```

On WSL, Chrome must be installed inside the Linux distro (`which google-chrome`), not only on the Windows host.

Install the companion Chrome DevTools Skills plugin (provides `chrome-devtools-cli`, `debug-optimize-lcp`, and accessibility debugging):

```text
/plugin marketplace add ChromeDevTools/chrome-devtools-mcp
/plugin install chrome-devtools-mcp@chrome-devtools-mcp
```

## 3. Optional stack additions

- **Next.js 16+ only:**
  ```bash
  claude mcp add next-devtools --scope user -- npx -y next-devtools-mcp@latest
  ```
- **Batch Lighthouse only** (`chrome-devtools-mcp` already provides single-run `lighthouse_audit`):
  ```bash
  claude mcp add lighthouse --scope user -- npx @danielsogl/lighthouse-mcp@latest
  ```
- **React projects (`react-scan`):**
  ```bash
  npm install --save-dev react-scan
  ```
  Optional `package.json` script: `"scan": "react-scan http://localhost:3000"`.

## 4. Authenticated pages only: dedicated Chrome profile

Chrome 136+ blocks remote debugging against the default user profile. Launch a dedicated profile, sign in once so cookies persist, and point `chrome-devtools-mcp` at it:

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-debug"
```

```bash
claude mcp remove chrome-devtools
claude mcp add chrome-devtools --scope user -- \
  npx chrome-devtools-mcp@latest \
  --browserUrl http://localhost:9222 \
  --user-data-dir "$HOME/.chrome-debug"
```

## 5. Smoke-test the stack

Run a reload trace against `https://example.com` with Slow 4G + 4x CPU, call `performance_analyze_insight` for `LCPBreakdown`, and report the LCP element and dominant subpart.

- **Pass:** `performance_start_trace` runs with emulation params, `performance_analyze_insight` returns a compact summary (not raw trace JSON), and no invented `performance.*` API calls are needed.
- **Fail** (missing `performance_analyze_insight`, raw JSON dump, or invented Perf-API calls): recheck Step 2 and restart the client so newly added MCP tools load.

## Known issues and security

- **Codex CLI process leak (`openai/codex#17574`):** long sessions can leak `chrome-devtools-mcp` helper processes; run `pkill -f chrome-devtools-mcp` between sessions if memory climbs.
- **Authenticated page timeouts:** caused by skipping Step 4 on Chrome 136+.
- **Third-party skill safety:** Snyk's ToxicSkills audit found critical security issues (including credential exfiltration) in ~13% of community skill packs. Inspect every `SKILL.md` and bundled script before installing external skills; trusted defaults include Anthropic's `skills/` repo, `addyosmani/web-quality-skills`, and `ChromeDevTools/chrome-devtools-mcp`.

Done when required components are installed for the user's stack, the `example.com` smoke test passes (or restart instructions are given if the client requires reload to expose new MCP tools), and the user is pointed to `investigate-web-perf` for investigation work.
