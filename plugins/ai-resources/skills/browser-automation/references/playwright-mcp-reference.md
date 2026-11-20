# Playwright MCP fallback reference

Use Playwright MCP only when the Playwright CLI is not an option: clients without shell/filesystem access, a quick 1 to 3 step check where CLI setup overhead outweighs savings, or an explicit need for inline snapshots. For multi-step automation, debugging, and test runs, use the CLI (see `../SKILL.md`).

## Setup

Default MCP flags waste tokens. Configure these flags explicitly:

```bash
# Claude Code (add --scope user or --scope project as needed)
claude mcp add playwright -- npx @playwright/mcp@latest \
  --headless \
  --snapshot-mode incremental \
  --codegen none \
  --console-level error \
  --image-responses omit
```

Equivalent JSON config for any MCP client:

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

Why these five flags matter:

| Flag | Effect |
| --- | --- |
| `--headless` | Skips a visible browser window, reducing resource overhead |
| `--snapshot-mode incremental` | Sends only accessibility-tree diffs after the first snapshot (default) |
| `--codegen none` | Stops emitting generated TypeScript test code on every action |
| `--console-level error` | Cuts console spam (default `info` caused a documented 6x token spike on noisy SPAs) |
| `--image-responses omit` | Stops auto-inlining screenshots; call `browser_take_screenshot` only for visual checks |

## Configuration flags

Every flag also accepts an environment variable prefixed with `PLAYWRIGHT_MCP_`.

| Flag | Meaning | Default |
| --- | --- | --- |
| `--browser` | `chrome`, `firefox`, `webkit`, or `msedge` | `chromium` |
| `--headless` | Run without a visible window | headed |
| `--viewport-size` | Viewport dimensions, e.g. `1280x720` | browser default |
| `--user-data-dir` | Persistent browser profile directory | temp dir |
| `--isolated` | Ephemeral in-memory profile | `false` |
| `--storage-state` | Pre-load cookies and localStorage from a JSON file | none |
| `--caps` | Opt-in tool groups (`vision`, `pdf`, `devtools`, `testing`) | core only |
| `--snapshot-mode` | `incremental`, `full`, or `none` | `incremental` |
| `--image-responses` | `allow` or `omit` | `allow` |
| `--codegen` | `typescript` or `none` | `typescript` |
| `--timeout-action` | Action timeout in ms | `5000` |
| `--timeout-navigation` | Navigation timeout in ms | `60000` |
| `--console-level` | `error`, `warning`, `info`, or `debug` | `info` |
| `--output-dir` | Directory for saved files | none |
| `--output-mode` | `file` or `stdout` | `stdout` |
| `--allowed-origins` | Semicolon-separated allowed origins | all |
| `--blocked-origins` | Semicolon-separated blocked origins | none |
| `--proxy-server` | HTTP/SOCKS proxy URL | none |
| `--extension` | Connect to an existing browser via bridge extension | `false` |
| `--config` | JSON config file path | none |
| `--secrets` | Dotenv file whose values are masked from model output | none |
| `--save-session` | Persist session state to output dir | `false` |
| `--test-id-attribute` | Custom test ID attribute | `data-testid` |

Enable only the `--caps` groups you need. Each capability group adds tool schemas that consume tokens on every message.

## Core workflow

Every MCP action returns an inline snapshot automatically. Keep calls tight:

1. Navigate and inspect: call `browser_navigate`, then `browser_snapshot` to read element refs (e.g. `ref="e15"`).
2. Interact via refs: prefer `browser_fill_form` for multiple fields (one call, one snapshot) over separate `browser_type` calls. Use `browser_click`, `browser_press_key`, and `browser_wait_for` (wait for specific text, not arbitrary sleeps).
3. Verify: read the returned snapshot. Call `browser_take_screenshot` only when checking CSS, layout, canvas, or WebGL.
4. Close with `browser_close` when finished. Disconnect the MCP server when idle (for example via `/mcp` in Claude Code) so its ~3,400-token tool schema stops loading on unrelated turns.

### Scoping large outputs

Complex pages can return 50K to 540K tokens in a single full snapshot. Narrow them with `selector`, `depth`, or `filename`:

```text
browser_snapshot          -> selector: "[role=dialog]", depth: 4
browser_snapshot          -> filename: "page-state.yml"
browser_evaluate          -> expression: "...", filename: "eval-result.json"
browser_console_messages  -> filename: "console.log"
browser_network_requests  -> filename: "network.log", filter: "api/"
```

### Auth state and secrets

Save cookies and localStorage once with `browser_storage_state`, then restore via `browser_set_storage_state` or `--storage-state auth.json` at startup. For credentials, pass `--secrets .env.playwright` so the MCP server masks secret values in snapshots and responses.

## Snapshot modes and element targeting

- `incremental` (default): one full tree (~3,800 tokens on a typical page), then diffs.
- `full`: complete tree every time. Use only when incremental diffs misbehave.
- `none`: disables automatic snapshots; call `browser_snapshot` manually or run in vision mode.

Target elements in this order: snapshot `ref` first, CSS/role `selector` second, and x/y coordinates (`--caps=vision`) last, only for canvas, custom drawing, or complex SVGs invisible to the accessibility tree.

## Tool catalog

### Core (always enabled)

| Tool | Purpose | Read-only |
| --- | --- | --- |
| `browser_navigate` | Navigate to a URL | No |
| `browser_navigate_back` | Go back in history | No |
| `browser_snapshot` | Capture accessibility tree (`selector`, `depth`, `filename`) | Yes |
| `browser_take_screenshot` | Capture screenshot (visual verification only) | Yes |
| `browser_click` | Click an element (supports modifiers) | No |
| `browser_hover` | Hover over an element | No |
| `browser_type` | Type into a single editable element | No |
| `browser_fill_form` | Fill multiple form fields in one call | No |
| `browser_select_option` | Select a dropdown option | No |
| `browser_press_key` | Press a keyboard key | No |
| `browser_drag` | Drag and drop between elements | No |
| `browser_file_upload` | Upload files | No |
| `browser_handle_dialog` | Accept or dismiss browser dialogs | No |
| `browser_evaluate` | Run JS on the page or element (`filename`) | No |
| `browser_run_code` | Execute arbitrary Playwright code | No |
| `browser_wait_for` | Wait for text to appear/disappear or for a delay | No |
| `browser_resize` | Resize the viewport | No |
| `browser_console_messages` | Read console output (`filename`) | Yes |
| `browser_network_requests` | List requests since page load (`filename`, `filter`) | Yes |
| `browser_tabs` | List, create, close, or select tabs | No |
| `browser_close` | Close the current page | No |

### Opt-in capability groups

- `--caps=vision`: `browser_mouse_click_xy`, `browser_mouse_down`, `browser_mouse_drag_xy`, `browser_mouse_move_xy`, `browser_mouse_up`, `browser_mouse_wheel` (~10K+ tokens per screenshot vs. ~3.8K for a snapshot).
- `--caps=devtools`: `browser_start_tracing`, `browser_stop_tracing`, `browser_start_video`, `browser_stop_video`.
- `--caps=pdf`: `browser_pdf_save`.
