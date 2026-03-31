# Token Optimization for Browser Automation

## Token Cost Baseline

| Source | Approximate Cost |
|--------|-----------------|
| MCP tool definitions (core 22 tools) | ~3,400 tokens per message |
| Accessibility snapshot (typical page) | ~3,800 tokens |
| Accessibility snapshot (complex enterprise app) | 50,000-540,000 tokens |
| Screenshot (typical page) | ~10,000+ tokens |
| Full MCP automation session | ~114,000 tokens |
| Equivalent CLI session | ~27,000 tokens |

The primary cost driver is **context accumulation**: MCP streams snapshots inline after every action, and all previous snapshots remain in the conversation history. CLI avoids this by saving snapshots to disk.

## Tool Choice: CLI vs MCP

**Default to Playwright CLI.** Microsoft benchmarked a 4x token reduction (114K → 27K) for equivalent tasks.

| Factor | CLI | MCP |
|--------|-----|-----|
| Snapshot delivery | Saved to disk as YAML | Streamed inline into context |
| Token accumulation at 20 steps | ~0 stale tokens (snapshots on disk) | ~60,000-80,000 stale tokens in context |
| Tool definition overhead | None | ~3,400 tokens per message (even when unused) |
| Parallel sessions | Named sessions (`-s=name`) | Not supported |

Use MCP only when CLI is unavailable or for quick 1-3 step interactions.

## Configuration-Level Optimizations (MCP)

The user-level MCP config already includes these flags. If reconfiguring:

### 1. Disable Codegen

`--codegen none` prevents Playwright from generating test code alongside actions. Every action response otherwise includes generated TypeScript code that is rarely needed during interactive automation.

### 2. Restrict Console Level

`--console-level error` eliminates console message noise. Users reported a **6x token increase** between MCP versions due to console message inclusion at the default `info` level. Error-heavy SPAs can produce enormous console output.

### 3. Omit Image Responses

`--image-responses omit` prevents screenshots from being included in responses. Use when snapshots (accessibility tree) are sufficient and visual verification is not needed.

### 4. Incremental Snapshots

`--snapshot-mode incremental` (default) sends only diffs after the first snapshot. Do not change unless debugging snapshot issues.

### 5. Headless Mode

`--headless` reduces resource consumption on Linux/CI. No direct token savings but improves performance.

### 6. Limit Capability Groups

Only enable `--caps` flags needed for the task. Each capability group adds tool definitions that consume tokens on every message:

```bash
# Minimal: core tools only (default)
npx @playwright/mcp@latest --headless

# With testing verification
npx @playwright/mcp@latest --headless --caps=testing

# Avoid enabling everything
# BAD: --caps=vision,pdf,devtools,testing,network,storage,config
```

### 7. Disconnect When Idle

MCP tool definitions load on every message (~3,400 tokens) whether tools are used or not. Toggle the Playwright MCP off with `/mcp` in Claude Code when browser automation is not actively needed.

### Recommended MCP Config

```json
{
  "mcpServers": {
    "playwright": {
      "command": "bunx",
      "args": [
        "@playwright/mcp@latest",
        "--headless",
        "--snapshot-mode", "incremental",
        "--codegen", "none",
        "--console-level", "error",
        "--image-responses", "omit"
      ]
    }
  }
}
```

## Tool-Call-Level Optimizations (MCP)

### Scope Down Large Snapshots

On complex pages, a single `browser_snapshot` can return 50K-540K tokens. Use parameters to scope it down:

```
# Snapshot only a dialog or section
browser_snapshot → selector: "[role=dialog]"

# Limit tree depth
browser_snapshot → depth: 3

# Save to disk instead of returning inline
browser_snapshot → filename: "page-state.yml"
```

### Batch Form Fills

Use `browser_fill_form` for multiple fields in one call. Each separate `browser_type` call triggers a snapshot response:

```
# Bad: 3 tool calls, 3 snapshots returned
browser_type → ref: "e8", text: "user@example.com"
browser_type → ref: "e12", text: "password123"
browser_type → ref: "e15", text: "John"

# Good: 1 tool call, 1 snapshot returned
browser_fill_form → fields: [
  { ref: "e8", value: "user@example.com" },
  { ref: "e12", value: "password123" },
  { ref: "e15", value: "John" }
]
```

### Save Large Outputs to Disk

Several MCP tools accept a `filename` parameter to redirect output to disk instead of returning inline:

- `browser_snapshot` → `filename`
- `browser_evaluate` → `filename`
- `browser_console_messages` → `filename`
- `browser_network_requests` → `filename` (also accepts `filter` regex)

Use `filename` whenever the output might be large or when you don't need the data immediately in context.

### Avoid Redundant Screenshots

Snapshots are returned automatically after every action. Only call `browser_take_screenshot` for visual verification (CSS, layout, canvas/WebGL content). Never take screenshots "just to see what happened" — the snapshot already tells you.

## Prompt-Level Optimizations

### Be Maximally Specific

Vague prompts cause exploratory navigation that wastes tokens:

```
# Bad: vague, requires exploration
"Test the login page"

# Good: specific, reduces back-and-forth
"Navigate to http://localhost:3000/login, fill email with 'test@example.com'
and password with 'pass123', click Sign In, verify 'Dashboard' heading appears"
```

### Provide Selectors and URLs Upfront

Include `data-testid` values, element descriptions, and URLs in the initial prompt:

```
"Navigate to /settings. The theme toggle has data-testid='theme-toggle'.
Click it and verify the body class changes to 'dark-mode'."
```

### Minimize Navigation Steps

Each page load triggers a snapshot. Plan interaction sequences to minimize page transitions:

```
# Bad: navigate to each page separately
Navigate to /users → snapshot → navigate to /users/1 → snapshot → navigate to /users/1/edit → snapshot

# Good: go directly to the target
Navigate to /users/1/edit → snapshot → interact
```

## Architecture-Level Optimizations

### Use Subagents for Browser Work

The Playwright maintainer explicitly recommends using subagents. Each subagent gets its own context loop — browser snapshots accumulate there instead of in the main conversation:

```
# Delegate browser work to a subagent
"Navigate to /dashboard, verify all 5 widget cards are visible,
 click the Settings gear icon, toggle dark mode, verify the
 page background changes. Report pass/fail with any issues."
```

### Manual Auth + Automation

For headed browsers, authenticate manually before starting automation. Auth flows consume 5-10 tool calls that are pure overhead.

### Save and Restore Auth State

After authenticating once, save the state:

**CLI:**
```bash
playwright-cli state-save auth.json           # save
playwright-cli state-load auth.json           # restore
```

**MCP:**
```
browser_storage_state → path: "auth.json"     # save
browser_set_storage_state → path: "auth.json" # restore
```

**MCP config flag:**
```bash
npx @playwright/mcp@latest --storage-state auth.json   # auto-restore on startup
```

### Use JavaScript Evaluation for Data Extraction

Instead of navigating and snapshotting multiple pages to gather data, use `eval` (CLI) or `browser_evaluate` (MCP):

```bash
# CLI
playwright-cli eval "document.querySelectorAll('.item').length"

# MCP
browser_evaluate → expression: "document.querySelectorAll('.item').length"
```

## Secrets Management

Use the `--secrets` flag to prevent sensitive data from appearing in LLM context:

```bash
# .env.playwright
LOGIN_EMAIL=admin@example.com
LOGIN_PASSWORD=secret123

npx @playwright/mcp@latest --secrets .env.playwright
```

The MCP server masks secret values in snapshots and responses.

## Common Mistakes That Waste Tokens

1. **Using MCP when CLI is available** — 4x more expensive for equivalent work
2. **Taking screenshots after every action** — snapshots are returned automatically; screenshots are only for visual verification
3. **Leaving `--console-level` at default `info`** — can cause 6x token increase on error-heavy SPAs
4. **Leaving `--codegen` at default `typescript`** — every response includes generated test code you don't need
5. **Full-page snapshots on complex apps** — a single snapshot can be 50K-540K tokens; use `selector` and `depth`
6. **Not using `filename` for large outputs** — `browser_evaluate` results plus page state returned inline can be massive
7. **Separate `browser_type` calls for each form field** — use `browser_fill_form` to batch them
8. **Not disconnecting MCP when idle** — ~3,400 tokens of tool definitions on every message
9. **Enabling all `--caps` flags** — each adds tool definitions that cost tokens on every message
