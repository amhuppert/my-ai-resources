# Playwright MCP — Fallback Reference

Use the MCP **only** when the CLI is not an option:

- The client lacks shell/filesystem access (Claude Desktop, Cursor without terminal)
- A one-shot 1–3 step interaction where launching the CLI isn't worth it
- Specific need for inline snapshot inspection in the conversation

For everything else — interactive automation, debugging, multi-step flows, test running — use the Playwright CLI (~4× cheaper per session). See the parent SKILL.md for routing.

## Setup

### Standard install (Claude Code)

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

### Token-optimized install (recommended)

The defaults are wasteful. Pass these flags explicitly:

```bash
claude mcp add playwright -- npx @playwright/mcp@latest \
  --headless \
  --snapshot-mode incremental \
  --codegen none \
  --console-level error \
  --image-responses omit
```

Why each flag matters:

| Flag | Why |
|------|-----|
| `--headless` | No visible window; lower resource use |
| `--snapshot-mode incremental` (default) | Sends only diffs after the first snapshot |
| `--codegen none` | Stops generating TypeScript test code on every action (rarely needed interactively) |
| `--console-level error` | Default `info` caused a documented 6× token spike on error-heavy SPAs |
| `--image-responses omit` | Don't auto-inline screenshots; request them only when you need visual verification |

### Scopes

| Scope | When | Flag |
|-------|------|------|
| Local (default) | Personal use, this project only | none |
| Project | Shared via committed `.mcp.json` | `--scope project` |
| User | All your projects | `--scope user` |

### Config file alternative

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
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

## Configuration Flags

Every flag has an env-var equivalent prefixed with `PLAYWRIGHT_MCP_`.

| Flag | Description | Default |
|------|-------------|---------|
| `--browser` | `chrome`, `firefox`, `webkit`, `msedge` | `chromium` |
| `--headless` | Run without visible window | headed |
| `--viewport-size` | e.g., `1280x720` | browser default |
| `--user-data-dir` | Persistent profile directory | temp dir |
| `--isolated` | Ephemeral in-memory profile | `false` |
| `--storage-state` | Pre-load cookies/storage from file | none |
| `--caps` | Capability groups: `vision`, `pdf`, `devtools` | core only |
| `--snapshot-mode` | `incremental`, `full`, `none` | `incremental` |
| `--image-responses` | `allow`, `omit` | `allow` |
| `--codegen` | `typescript`, `none` | `typescript` |
| `--timeout-action` | Action timeout (ms) | `5000` |
| `--timeout-navigation` | Navigation timeout (ms) | `60000` |
| `--console-level` | `error`, `warning`, `info`, `debug` | `info` |
| `--output-dir` | Output file directory | none |
| `--output-mode` | `file`, `stdout` | `stdout` |
| `--allowed-origins` | Semicolon-separated allowed origins | all |
| `--blocked-origins` | Semicolon-separated blocked origins | none |
| `--proxy-server` | HTTP/SOCKS proxy | none |
| `--extension` | Connect to existing browser via bridge extension | `false` |
| `--config` | JSON config file path | none |
| `--secrets` | Dotenv file with secrets (masked from LLM) | none |
| `--save-session` | Persist session to output dir | `false` |
| `--test-id-attribute` | Custom test ID attribute | `data-testid` |

Only enable `--caps` you actually need — each capability group adds tool definitions that consume tokens on every message.

## Core Workflow

Every action automatically returns a snapshot inline. Be deliberate about minimizing calls.

### 1. Navigate and snapshot

```
browser_navigate → url: "http://localhost:3000"
browser_snapshot                        # accessibility tree with element refs (e.g. ref="e15")
```

### 2. Interact using refs

```
browser_click → ref: "e15"
browser_fill_form → fields: [           # CRITICAL: batch instead of N browser_type calls
  { ref: "e8",  value: "user@example.com" },
  { ref: "e12", value: "password123" }
]
browser_press_key → key: "Enter"
```

### 3. Verify state

```
browser_snapshot                        # check result (returned inline)
browser_take_screenshot                 # only for visual verification (CSS, layout, canvas)
```

### Close when done

```
browser_close
```

## Token-Saving Principles

- **Batch form fills.** `browser_fill_form` for multiple fields. Each `browser_type` triggers a fresh snapshot response.
- **Scope down snapshots.** On complex pages a full snapshot can be 50K–540K tokens. Use `selector` to limit to a subtree, `depth` to cap tree depth, or `filename` to redirect to disk.
- **Save large outputs to disk.** `browser_evaluate`, `browser_console_messages`, `browser_network_requests`, and `browser_snapshot` all accept `filename` to write results to disk instead of returning inline.
- **Use `browser_evaluate` for data extraction** instead of navigating multiple pages.
- **Wait for specific text** with `browser_wait_for` rather than arbitrary time waits.
- **Don't take redundant screenshots.** Snapshots come back automatically after every action; only call `browser_take_screenshot` for visual verification.
- **Disconnect when idle.** MCP tool definitions add ~3,400 tokens per message whether used or not. Toggle the server off via `/mcp` when you're not actively automating.

### Scoping examples

```
browser_snapshot → selector: "[role=dialog]"           # only the dialog
browser_snapshot → selector: "#main-content"           # specific section
browser_snapshot → depth: 3                            # cap depth on deeply nested UI
browser_snapshot → filename: "page-state.yml"          # write to disk instead of returning
browser_snapshot → selector: "[role=dialog]", depth: 4 # combine
```

```
browser_evaluate → expression: "...", filename: "eval-result.json"
browser_console_messages → filename: "console.log"
browser_network_requests → filename: "network.log", filter: "api/"
```

## Tool Catalog

### Core (always enabled)

| Tool | Description | Read-only |
|------|-------------|-----------|
| `browser_navigate` | Navigate to URL | No |
| `browser_navigate_back` | Go back in history | No |
| `browser_snapshot` | Capture accessibility tree. Accepts `selector`, `depth`, `filename` | Yes |
| `browser_take_screenshot` | Take screenshot (visual verification only) | Yes |
| `browser_click` | Click element (with modifiers) | No |
| `browser_hover` | Hover element | No |
| `browser_type` | Type into editable element | No |
| `browser_fill_form` | Fill multiple fields in one call | No |
| `browser_select_option` | Select dropdown option | No |
| `browser_press_key` | Press keyboard key | No |
| `browser_drag` | Drag and drop between elements | No |
| `browser_file_upload` | Upload files | No |
| `browser_handle_dialog` | Accept/dismiss dialogs | No |
| `browser_evaluate` | Eval JS on page or element. Accepts `filename` | No |
| `browser_run_code` | Run arbitrary Playwright code | No |
| `browser_wait_for` | Wait for text appear/disappear or time | No |
| `browser_resize` | Resize window | No |
| `browser_console_messages` | Console messages (filterable). Accepts `filename` | Yes |
| `browser_network_requests` | Requests since page load. Accepts `filename`, `filter` | Yes |
| `browser_close` | Close page | No |

### Tab management (always enabled)

| Tool | Description |
|------|-------------|
| `browser_tabs` | List, create, close, or select tabs |

### Vision (opt-in: `--caps=vision`)

For canvas, custom-drawn UI, or complex SVGs that the accessibility tree can't describe.

| Tool | Description |
|------|-------------|
| `browser_mouse_click_xy` | Click at x,y |
| `browser_mouse_down` | Press mouse button |
| `browser_mouse_drag_xy` | Drag from start to end coords |
| `browser_mouse_move_xy` | Move mouse |
| `browser_mouse_up` | Release mouse button |
| `browser_mouse_wheel` | Scroll wheel |

### DevTools (opt-in: `--caps=devtools`)

| Tool | Description |
|------|-------------|
| `browser_start_tracing` / `browser_stop_tracing` | Trace recording |
| `browser_start_video` / `browser_stop_video` | Video recording |

### PDF (opt-in: `--caps=pdf`)

| Tool | Description |
|------|-------------|
| `browser_pdf_save` | Save page as PDF |

## Snapshot Mode Details

| Mode | Behavior | When to use |
|------|----------|-------------|
| `incremental` (default) | After the first full snapshot (~3,800 tokens), sends only diffs | Default — best token economy |
| `full` | Sends the complete tree every time | Only when incremental diffs misbehave |
| `none` | Disables automatic snapshots; call `browser_snapshot` manually | When using vision mode or driving snapshots manually |

## Snapshot vs Vision

| Aspect | Snapshot (default) | Vision (`--caps=vision`) |
|--------|--------------------|--------------------------|
| Format | Accessibility tree (structured text) | Pixel screenshots |
| Token cost | ~3,800 tokens/page | ~10,000+ tokens/page |
| Element targeting | `ref` from accessibility tree | x,y coordinates |
| Covers 95% of cases | Yes | No |
| Required for | Standard web UIs | Canvas, custom drawing, complex SVGs |

Start with snapshot mode. Only enable vision when the accessibility tree cannot represent the elements you need.

## Element Targeting Priority

1. **`ref` from snapshot** — most reliable, preferred
2. **`selector` parameter** (CSS / role selector) — fallback when ref unavailable
3. **Coordinates** (vision mode) — last resort for non-accessible elements

## Auth State Persistence

```
# Save after authenticating
browser_storage_state                                  # writes to file (cookies + localStorage)

# Restore in a later session
browser_set_storage_state → path: "auth-state.json"
```

Or pre-load on startup via the config flag:

```bash
npx @playwright/mcp@latest --storage-state auth.json
```

## Secrets Management

Use `--secrets` to keep sensitive values out of LLM context:

```bash
# .env.playwright
LOGIN_EMAIL=admin@example.com
LOGIN_PASSWORD=secret123

npx @playwright/mcp@latest --secrets .env.playwright
```

The MCP server masks secret values in snapshots and responses.

## Visual Verification

```
browser_navigate → url: "http://localhost:3000/dashboard"
browser_take_screenshot                                # use only when CSS/layout matters
```

## Common Mistakes

1. **Using MCP when CLI is available** — 4× more expensive
2. **Taking screenshots after every action** — snapshots are returned automatically
3. **Leaving `--console-level` at default `info`** — 6× token spike on error-heavy SPAs
4. **Leaving `--codegen` at default `typescript`** — every response includes generated code you don't need
5. **Full-page snapshots on complex apps** — use `selector` and `depth`
6. **Not using `filename` for large outputs** — `browser_evaluate` returns can be huge
7. **Separate `browser_type` calls per field** — use `browser_fill_form`
8. **Leaving the MCP connected when idle** — ~3,400 tokens of tool definitions on every message
9. **Enabling all `--caps`** — each adds tool definitions that cost tokens on every message
