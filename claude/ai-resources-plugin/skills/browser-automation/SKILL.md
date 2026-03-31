---
name: browser-automation
description: This skill should be used when the user asks to "test a web app in the browser", "open a browser", "verify the UI", "check the page visually", "automate browser interaction", "take a screenshot of the app", "test the login flow", "debug the UI in a browser", "inspect the page", "run playwright", "use playwright MCP", "use playwright CLI", or mentions browser automation, visual verification, or web app testing with Playwright.
---

# Browser Automation with Playwright

Automate browser interactions for web app testing and visual verification using Playwright tools.

## Tool Selection: CLI First, MCP as Fallback

**Default to Playwright CLI.** It saves snapshots to disk as YAML files instead of streaming them into the context window, using ~4x fewer tokens than MCP for equivalent tasks.

| Tool | When to Use | Token Cost |
|------|------------|------------|
| **Playwright CLI** (`playwright-cli`) | **Default choice.** All interactive browser automation when you have filesystem access | Low (~27K tokens/session) |
| **Playwright MCP** (`browser_*` tools) | Fallback when CLI is unavailable, or when inline snapshot inspection is specifically needed | High (~114K tokens/session) |
| **Test Runner** (`npx playwright test`) | Running existing test suites, codegen, visual regression, CI/CD | N/A (runs externally) |

### Decision Flow

1. **Running existing tests?** → `npx playwright test`
2. **Generating test code?** → `npx playwright codegen <url>`
3. **CLI available?** → `playwright-cli` (check with `which playwright-cli`)
4. **CLI unavailable?** → Playwright MCP (the `browser_*` tools)

### Why CLI Over MCP

- **Snapshots save to disk** — only read them when needed, instead of accumulating in context
- **4x fewer tokens** — ~27K vs ~114K for equivalent sessions (benchmarked by Microsoft)
- **No tool definition overhead** — MCP loads ~3,400 tokens of tool schemas on every message, whether used or not
- **Parallel sessions** — named sessions (`-s=name`) for multi-browser workflows

### When MCP Is Still Appropriate

- CLI is not installed and cannot be installed
- The client lacks filesystem access (Claude Desktop, Cursor)
- You specifically need inline snapshot inspection in the conversation
- Quick one-off interactions (1-3 steps) where CLI setup overhead isn't worth it

## Setup

### Playwright CLI (Preferred)

```bash
npm install -g @playwright/cli@latest
playwright-cli install                    # install browsers
playwright-cli install --skills           # generate Claude Code skills files
```

### Playwright MCP (Fallback)

Already configured at user level with optimized flags. If reconfiguring:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest --headless --snapshot-mode incremental --codegen none --console-level error --image-responses omit
```

### Test Runner

```bash
npm init playwright@latest    # scaffold project
npx playwright install        # install browsers
```

## Core Workflow: Playwright CLI

The CLI saves snapshots to `.playwright-cli/` as YAML files. Read them only when you need to inspect page structure.

### 1. Open and Navigate

```bash
playwright-cli open http://localhost:3000         # launch browser
playwright-cli snapshot                           # get element refs (saved to disk)
```

Read the snapshot file to find element refs, then interact:

### 2. Interact Using Refs

```bash
playwright-cli click e15                          # click by ref
playwright-cli fill e8 "user@example.com"         # fill input
playwright-cli fill e12 "password123"             # fill another input
playwright-cli press Enter                        # press key
```

### 3. Verify State

```bash
playwright-cli snapshot                           # check state (saved to disk)
playwright-cli screenshot                         # save screenshot to disk
playwright-cli screenshot --filename=result.png   # save with specific name
```

### Named Sessions for Parallel Work

```bash
playwright-cli -s=app open http://localhost:3000
playwright-cli -s=admin open http://localhost:3000/admin
playwright-cli -s=app snapshot
```

### Auth State Persistence

Save authentication state to avoid re-authenticating across sessions:

```bash
playwright-cli state-save auth.json               # save after logging in
playwright-cli state-load auth.json               # restore in future session
```

### Data Extraction Without Navigation

Use `eval` instead of navigating and snapshotting multiple pages:

```bash
playwright-cli eval "document.querySelectorAll('.item').length"
playwright-cli eval "JSON.stringify(Array.from(document.querySelectorAll('tr')).map(r => r.textContent))"
```

## Core Workflow: Playwright MCP (Fallback)

The MCP exposes `browser_*` tools. **Every action returns a snapshot inline**, which accumulates in context — be deliberate about minimizing calls.

### 1. Navigate and Snapshot

```
browser_navigate → url: "http://localhost:3000"
browser_snapshot                                  # understand page structure
```

The snapshot returns an accessibility tree with element refs (e.g., `ref="e15"`).

### 2. Interact Using Refs

```
browser_click → ref: "e15"
browser_fill_form → fields: [                     # fill multiple fields at once (CRITICAL: saves N tool calls)
  { ref: "e8", value: "user@example.com" },
  { ref: "e12", value: "password123" }
]
browser_press_key → key: "Enter"
```

### 3. Verify State

```
browser_snapshot                                  # check result
browser_take_screenshot                           # visual verification only when needed
```

### MCP Token-Saving Principles

- **Always use `browser_fill_form`** for multiple fields — each separate `browser_type` call returns a full snapshot
- **Use `browser_snapshot` with `selector`** to snapshot only a section (e.g., a modal dialog), not the entire page
- **Use `browser_snapshot` with `depth`** to limit tree depth on complex pages
- **Use `filename` parameter** on `browser_evaluate`, `browser_console_messages`, `browser_network_requests`, and `browser_snapshot` to save large outputs to disk instead of returning inline
- **Use `browser_evaluate`** for data extraction instead of navigating multiple pages
- **Use `browser_wait_for`** with specific text rather than arbitrary time waits
- **Never take screenshots redundantly** — snapshots are returned automatically after every action; only use `browser_take_screenshot` for visual verification (CSS, layout, canvas)
- **Close the browser when done** with `browser_close`

### MCP: Scoping Down Large Pages

On complex pages, a full snapshot can be 50K+ tokens. Scope it down:

```
# Snapshot only a dialog
browser_snapshot → selector: "[role=dialog]"

# Limit tree depth
browser_snapshot → depth: 3

# Save to disk instead of returning inline
browser_snapshot → filename: "page-state.yml"
```

## Visual Verification

### Snapshots vs Screenshots

| | Snapshot (accessibility tree) | Screenshot (image) |
|-|-----|-----|
| Token cost | ~3,800 tokens | ~10,000+ tokens |
| Can drive actions? | Yes (returns element refs) | No |
| Use for | Structure, content, interaction | Visual appearance, CSS, canvas/WebGL |

**Use snapshots by default.** Only take screenshots for visual verification (styling, layout, canvas content).

### Quick Visual Check (CLI — preferred)

```bash
playwright-cli open http://localhost:3000/dashboard
playwright-cli screenshot --filename=dashboard.png
```

Then read the screenshot file to inspect visually.

### Quick Visual Check (MCP)

```
browser_navigate → url: "http://localhost:3000/dashboard"
browser_take_screenshot
```

## Token Optimization Essentials

1. **Use CLI over MCP** — snapshots save to disk instead of accumulating in context (~4x cheaper)
2. **Prefer snapshots over screenshots** — ~3,800 tokens vs 10,000+ for images
3. **Scope snapshots on complex pages** — use `selector` and `depth` parameters (MCP) to avoid 50K+ token snapshots
4. **Batch form fills** — `browser_fill_form` (MCP) or sequential `fill` (CLI) instead of N separate `browser_type` calls
5. **Save large outputs to disk** — use `filename` parameter on `browser_evaluate`, `browser_snapshot`, `browser_console_messages`, `browser_network_requests`
6. **Use subagents for browser automation** — each subagent gets its own context loop, preventing the main conversation from filling up with browser state
7. **Be specific in prompts** — provide URLs, selectors, and exact steps upfront to reduce exploratory navigation
8. **Disconnect MCP when not in use** — tool definitions consume ~3,400 tokens on every message whether used or not

For the complete optimization guide (auth state persistence, secrets management, architecture decisions), see `references/token-optimization.md`.

## Architecture: Use Subagents for Browser Work

For sessions involving more than a few browser interactions, **delegate to a subagent**. The Playwright maintainer explicitly recommends this pattern. Each subagent gets its own context loop — browser snapshots accumulate there instead of in the main conversation.

```
# In the main conversation, delegate browser work:
"Use a subagent to: navigate to http://localhost:3000/settings,
 verify the theme toggle exists, click it, and confirm the page
 switches to dark mode. Report back pass/fail."
```

## Self-Improvement

During browser automation, watch for signs of inefficiency or struggle:

- **Repeated failed interactions** (wrong refs, stale snapshots, elements not found)
- **Excessive navigation** (visiting many pages when `eval` or direct URLs would suffice)
- **Tool mismatch** (using MCP for a 30+ step session, or CLI for a quick 1-step check when MCP is already connected)
- **Missing knowledge** (workarounds for auth flows, dynamic content, SPAs, or specific UI frameworks that this skill doesn't cover)
- **Token waste** (taking screenshots when snapshots suffice, not batching form fills, redundant snapshots, not using `selector`/`depth` to scope down large pages)

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

- **`references/playwright-cli-reference.md`** — Full CLI command reference (63+ commands), session management, configuration, and snapshot system
- **`references/playwright-mcp-reference.md`** — Complete MCP tool catalog, all configuration options, capability groups, and interaction patterns
- **`references/token-optimization.md`** — Detailed token cost analysis, optimization strategies, and architecture-level decisions for minimizing consumption
