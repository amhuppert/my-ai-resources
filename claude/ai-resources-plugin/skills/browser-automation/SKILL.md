---
name: browser-automation
description: This skill should be used when the user asks to "test a web app in the browser", "open a browser", "verify the UI", "check the page visually", "automate browser interaction", "take a screenshot of the app", "test the login flow", "debug the UI in a browser", "inspect the page", "run playwright", "use playwright MCP", "use playwright CLI", or mentions browser automation, visual verification, or web app testing with Playwright.
---

# Browser Automation with Playwright

Automate browser interactions for web app testing and visual verification using Playwright tools. Three tools serve different purposes — select the right one for the task.

## Tool Selection

| Tool | When to Use | Token Cost |
|------|------------|------------|
| **Playwright MCP** (`browser_*` tools) | Interactive exploration, short sessions (<20 steps), verifying UI state | Medium (~3,800 tokens/snapshot) |
| **Playwright CLI** (`playwright-cli`) | Long automation sessions, token-sensitive work, parallel sessions | Low (~4x cheaper than MCP) |
| **Test Runner** (`npx playwright test`) | Running test suites, codegen, visual regression, CI/CD | N/A (runs externally) |

### Decision Flow

1. **Running existing tests?** → `npx playwright test`
2. **Generating test code?** → `npx playwright codegen <url>`
3. **Short interactive session (<20 steps)?** → Playwright MCP
4. **Long session or token budget matters?** → `playwright-cli`
5. **Need parallel browser sessions?** → `playwright-cli` with named sessions

## Setup

### Playwright MCP (if not already configured)

```bash
claude mcp add playwright -- npx @playwright/mcp@latest --headless
```

Common flags: `--headless` (required on Linux/CI), `--browser chrome`, `--viewport-size 1280x720`, `--caps testing` (adds verification tools).

### Playwright CLI

```bash
npm install -g @playwright/cli@latest
playwright-cli install
```

### Test Runner

```bash
npm init playwright@latest    # scaffold project
npx playwright install        # install browsers
```

## Core Workflow: Playwright MCP

The MCP exposes `browser_*` tools. Follow this interaction pattern:

### 1. Navigate and Snapshot

```
browser_navigate → url: "http://localhost:3000"
browser_snapshot                                  # understand page structure
```

The snapshot returns an accessibility tree with element refs (e.g., `ref="e15"`). Use these refs to target elements.

### 2. Interact Using Refs

```
browser_click → ref: "e15"                        # click element by ref
browser_fill_form → fields: [                     # fill multiple fields at once
  { ref: "e8", value: "user@example.com" },
  { ref: "e12", value: "password123" }
]
browser_press_key → key: "Enter"
```

### 3. Verify State

```
browser_snapshot                                  # check result
browser_take_screenshot                           # visual verification when needed
```

### Key MCP Principles

- **Always snapshot before interacting** — understand the page structure first
- **Use `ref` parameters** from snapshots, not CSS selectors (refs are more reliable)
- **Use `browser_fill_form`** for multiple fields in one call (saves tokens vs separate `browser_type` calls)
- **Use `browser_wait_for`** with specific text rather than arbitrary waits
- **Use `browser_evaluate`** for quick data extraction instead of navigating multiple pages
- **Close the browser when done** with `browser_close`

## Core Workflow: Playwright CLI

The CLI saves snapshots to disk as YAML files, avoiding context window bloat.

### 1. Open and Navigate

```bash
playwright-cli open http://localhost:3000         # launch browser
playwright-cli snapshot                           # get element refs
```

### 2. Interact

```bash
playwright-cli click e15                          # click by ref
playwright-cli fill e8 "user@example.com"         # fill input
playwright-cli press Enter                        # press key
```

### 3. Verify

```bash
playwright-cli snapshot                           # check state
playwright-cli screenshot                         # save screenshot to disk
```

### Named Sessions for Parallel Work

```bash
playwright-cli -s=app open http://localhost:3000
playwright-cli -s=admin open http://localhost:3000/admin
playwright-cli -s=app snapshot
```

## Visual Verification Patterns

### Quick Visual Check (MCP)

```
browser_navigate → url: "http://localhost:3000/dashboard"
browser_take_screenshot                           # capture current state
```

Review the screenshot to verify layout, styling, and content render correctly.

### Screenshot to Disk (CLI)

```bash
playwright-cli open http://localhost:3000/dashboard
playwright-cli screenshot --filename=dashboard.png
```

### Visual Regression Testing (Test Runner)

For visual regression testing in Playwright test suites, see `references/playwright-cli-reference.md` (Visual Regression in Tests section).

## Token Optimization Essentials

1. **Prefer snapshots over screenshots** — snapshots are ~3,800 tokens vs 10,000+ for screenshots
2. **Use CLI for long sessions** — saves snapshots to disk instead of accumulating in context (~4x cheaper)
3. **Disconnect MCP when not in use** — tool definitions consume ~3,400 tokens on every message
4. **Be specific in prompts** — provide URLs, selectors, and exact steps upfront to reduce exploration

For the complete optimization guide (auth state persistence, secrets management, architecture decisions), see `references/token-optimization.md`.

## Self-Improvement

During browser automation, watch for signs of inefficiency or struggle:

- **Repeated failed interactions** (wrong refs, stale snapshots, elements not found)
- **Excessive navigation** (visiting many pages when `browser_evaluate` or direct URLs would suffice)
- **Tool mismatch** (using MCP for a 30+ step session, or CLI for a quick 3-step check)
- **Missing knowledge** (workarounds for auth flows, dynamic content, SPAs, or specific UI frameworks that this skill doesn't cover)
- **Token waste** (taking screenshots when snapshots suffice, not batching form fills, redundant snapshots)

When any of these occur, after completing the immediate task, proactively suggest concrete improvements to this skill. Frame suggestions as specific edits — new patterns to add, existing guidance to revise, or missing reference material to create. Direct suggestions to Alex, who maintains this skill.

## Runtime Debugging

When browser automation reveals unexpected behavior — errors in the console, wrong UI state, or failed interactions — combine Playwright with the **web-debugger** for runtime inspection:

1. Reproduce the issue with Playwright
2. Use `get_logs` to check structured application logs (both browser and server)
3. Use `get_snapshot` to inspect application state at the point of failure
4. Fix the issue and verify with Playwright

See `/web-debugger` for full tool reference, log format, and snapshot serialization details.

## Additional Resources

### Reference Files

For complete tool references and advanced usage, consult:

- **`references/playwright-mcp-reference.md`** — Complete MCP tool catalog, all configuration options, capability groups, and interaction patterns
- **`references/playwright-cli-reference.md`** — Full CLI command reference (63+ commands), session management, configuration, and snapshot system
- **`references/token-optimization.md`** — Detailed token cost analysis, optimization strategies, and architecture-level decisions for minimizing consumption
