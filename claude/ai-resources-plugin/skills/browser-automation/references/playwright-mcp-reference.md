# Playwright MCP Server — Complete Reference

## Installation

```bash
# Add to Claude Code (project scope)
claude mcp add playwright -- npx @playwright/mcp@latest --headless

# Add with JSON config
claude mcp add-json playwright '{"type":"stdio","command":"npx","args":["@playwright/mcp@latest","--headless"]}'
```

Scopes: `--scope local` (default, private), `--scope project` (shared via `.mcp.json`), `--scope user` (all projects).

## Configuration Flags

Every flag has a corresponding env var prefixed with `PLAYWRIGHT_MCP_`.

| Flag | Description | Default |
|------|-------------|---------|
| `--browser` | `chrome`, `firefox`, `webkit`, `msedge` | `chromium` |
| `--headless` | Run without visible window | headed |
| `--viewport-size` | e.g., `1280x720` | browser default |
| `--user-data-dir` | Persistent profile directory | temp dir |
| `--isolated` | Ephemeral in-memory profile | `false` |
| `--storage-state` | Pre-load cookies/storage from file | none |
| `--caps` | Capability groups: `vision`, `pdf`, `devtools`, `testing`, `network`, `storage`, `config` | core only |
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
| `--init-page` | TypeScript file evaluated on page object | none |
| `--init-script` | JS files run before page scripts | none |
| `--secrets` | Dotenv file with secrets (prevents LLM from seeing values) | none |
| `--save-session` | Persist session to output dir | `false` |
| `--test-id-attribute` | Custom test ID attribute | `data-testid` |

## Complete Tool Catalog

### Core Automation (always enabled)

| Tool | Description | Read-only |
|------|-------------|-----------|
| `browser_navigate` | Navigate to a URL | No |
| `browser_navigate_back` | Go back in history | No |
| `browser_snapshot` | Capture accessibility tree snapshot (preferred over screenshot) | Yes |
| `browser_take_screenshot` | Take screenshot (use snapshot for actions, screenshot for visual verification) | Yes |
| `browser_click` | Click element (single/double, with modifiers) | No |
| `browser_hover` | Hover over element | No |
| `browser_type` | Type text into editable element | No |
| `browser_fill_form` | Fill multiple form fields at once | No |
| `browser_select_option` | Select dropdown option | No |
| `browser_press_key` | Press keyboard key | No |
| `browser_drag` | Drag and drop between two elements | No |
| `browser_file_upload` | Upload files | No |
| `browser_handle_dialog` | Accept/dismiss browser dialogs | No |
| `browser_evaluate` | Evaluate JavaScript on page or element | No |
| `browser_run_code` | Run arbitrary Playwright code snippet | No |
| `browser_wait_for` | Wait for text appear/disappear or time | No |
| `browser_resize` | Resize browser window | No |
| `browser_console_messages` | Return console messages (filterable by level) | Yes |
| `browser_network_requests` | List network requests since page load | Yes |
| `browser_close` | Close the page | No |

### Tab Management (always enabled)

| Tool | Description |
|------|-------------|
| `browser_tabs` | List, create, close, or select browser tabs |

### Testing (opt-in: `--caps=testing`)

| Tool | Description |
|------|-------------|
| `browser_generate_locator` | Generate Playwright locator for element |
| `browser_verify_element_visible` | Verify element visible by role + name |
| `browser_verify_list_visible` | Verify list with specific items is visible |
| `browser_verify_text_visible` | Verify text is visible on page |
| `browser_verify_value` | Verify element value (checkbox, input, etc.) |

### Network (opt-in: `--caps=network`)

| Tool | Description |
|------|-------------|
| `browser_network_state_set` | Set online/offline state |
| `browser_route` | Mock network requests matching URL pattern |
| `browser_route_list` | List active network routes |
| `browser_unroute` | Remove network routes |

### Storage (opt-in: `--caps=storage`)

| Tool | Description |
|------|-------------|
| `browser_cookie_list` | List cookies (filter by domain/path) |
| `browser_cookie_get` | Get cookie by name |
| `browser_cookie_set` | Set cookie with optional flags |
| `browser_cookie_delete` | Delete specific cookie |
| `browser_cookie_clear` | Clear all cookies |
| `browser_localstorage_list` | List all localStorage pairs |
| `browser_localstorage_get` | Get localStorage item |
| `browser_localstorage_set` | Set localStorage item |
| `browser_localstorage_delete` | Delete localStorage item |
| `browser_localstorage_clear` | Clear all localStorage |
| `browser_sessionstorage_list` | List all sessionStorage pairs |
| `browser_sessionstorage_get` | Get sessionStorage item |
| `browser_sessionstorage_set` | Set sessionStorage item |
| `browser_sessionstorage_delete` | Delete sessionStorage item |
| `browser_sessionstorage_clear` | Clear all sessionStorage |
| `browser_set_storage_state` | Restore storage state from file |
| `browser_storage_state` | Save storage state to file |

### Vision (opt-in: `--caps=vision`)

Coordinate-based interaction for canvas, custom-drawn UI, complex SVGs.

| Tool | Description |
|------|-------------|
| `browser_mouse_click_xy` | Click at x,y coordinates |
| `browser_mouse_down` | Press mouse button down |
| `browser_mouse_drag_xy` | Drag from start to end coordinates |
| `browser_mouse_move_xy` | Move mouse to coordinates |
| `browser_mouse_up` | Release mouse button |
| `browser_mouse_wheel` | Scroll mouse wheel |

### DevTools (opt-in: `--caps=devtools`)

| Tool | Description |
|------|-------------|
| `browser_start_tracing` | Start trace recording |
| `browser_stop_tracing` | Stop trace recording |
| `browser_start_video` | Start video recording |
| `browser_stop_video` | Stop video recording |

### PDF (opt-in: `--caps=pdf`)

| Tool | Description |
|------|-------------|
| `browser_pdf_save` | Save page as PDF |

### Config (opt-in: `--caps=config`)

| Tool | Description |
|------|-------------|
| `browser_get_config` | Get resolved config after merging CLI/env/config file |

## Snapshot Mode Details

### `incremental` (default, recommended)

Sends only what changed since the last snapshot. Dramatically reduces token usage in multi-step sessions. After the first full snapshot (~3,800 tokens), subsequent snapshots send only diffs.

### `full`

Sends the complete accessibility tree every time. Use when incremental diffs are unreliable (rare).

### `none`

Disables automatic snapshots. Manually call `browser_snapshot` when needed. Useful when combining with vision mode.

## Snapshot vs Vision Mode

| Aspect | Snapshot (default) | Vision (`--caps=vision`) |
|--------|-------------------|--------------------------|
| Data format | Accessibility tree (structured text) | Screenshots (pixel data) |
| Token cost | ~3,800 tokens/page | ~10,000+ tokens/page |
| Element targeting | `ref` from accessibility tree | x,y coordinates |
| Covers 95% of cases | Yes | No |
| Required for | Standard web UIs | Canvas, custom drawing, complex SVGs |

**Start with snapshot mode.** Only enable vision when the accessibility tree cannot represent the elements needed.

## Interaction Patterns

### Element Targeting Priority

1. **`ref` parameter** (from snapshot) — most reliable, preferred
2. **`selector` parameter** (CSS/role selectors) — fallback when ref unavailable
3. **Coordinates** (vision mode) — last resort for non-accessible elements

### Efficient Form Filling

Instead of separate `browser_type` calls per field:

```
# Inefficient: 3 tool calls
browser_type → ref: "e8", text: "user@example.com"
browser_type → ref: "e12", text: "password123"
browser_type → ref: "e15", text: "John"

# Efficient: 1 tool call
browser_fill_form → fields: [
  { ref: "e8", value: "user@example.com" },
  { ref: "e12", value: "password123" },
  { ref: "e15", value: "John" }
]
```

### Waiting Strategies

```
# Wait for specific text to appear
browser_wait_for → text: "Dashboard"

# Wait for text to disappear (loading indicator)
browser_wait_for → textGone: "Loading..."

# Wait for time (last resort)
browser_wait_for → time: 2000
```

### Auth State Persistence

Save authentication state to avoid re-authenticating:

```
# After logging in manually or via automation
browser_storage_state     # saves cookies + localStorage to file

# In a later session, restore state
browser_set_storage_state → path: "auth-state.json"
```

### Quick Data Extraction

Use `browser_evaluate` instead of navigating and snapshotting:

```
# Extract data directly
browser_evaluate → expression: "document.querySelectorAll('.item').length"
browser_evaluate → expression: "JSON.stringify(Array.from(document.querySelectorAll('tr')).map(r => r.textContent))"
```
