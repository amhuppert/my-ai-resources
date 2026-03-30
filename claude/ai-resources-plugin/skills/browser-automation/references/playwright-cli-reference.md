# Playwright CLI — Complete Reference

A CLI tool designed for AI coding agents. Saves snapshots to disk as YAML instead of streaming into context, reducing token consumption ~4x compared to MCP.

## Installation

```bash
npm install -g @playwright/cli@latest
playwright-cli install                    # install browsers
playwright-cli install --skills           # generate Claude Code skills files
```

## Session Management

Every command targets a session. Default session is unnamed; use `-s=<name>` for named sessions.

```bash
playwright-cli open http://localhost:3000                     # default session
playwright-cli -s=admin open http://localhost:3000/admin      # named session
PLAYWRIGHT_CLI_SESSION=app playwright-cli snapshot            # env var
playwright-cli list                                           # list sessions
playwright-cli close-all                                      # close all
playwright-cli kill-all                                       # force kill all
playwright-cli delete-data                                    # delete profile data
playwright-cli show                                           # open visual dashboard
```

### Persistence Modes

| Mode | Flag | Behavior |
|------|------|----------|
| Ephemeral (default) | none | In-memory, lost on close |
| Persistent | `--persistent` | Auto-generated profile directory |
| Custom profile | `--profile=/path` | Specified profile directory |

### Open Flags

| Flag | Description |
|------|-------------|
| `--browser=chrome` | Browser choice |
| `--headed` | Show browser (headless by default) |
| `--extension` | Connect via browser extension |
| `--persistent` | Use persistent profile |
| `--profile=<path>` | Custom profile directory |
| `--config=file.json` | Use config file |

## Snapshot System

After every command, the CLI outputs a snapshot reference:

```
### Page
- Page URL: https://example.com/
- Page Title: Example Domain
### Snapshot
[Snapshot](.playwright-cli/page-2026-02-14T19-22-42-679Z.yml)
```

Snapshots are YAML files with element refs (`e1`, `e2`, `e15`, etc.). Target elements by ref:

```bash
playwright-cli click e15              # click element
playwright-cli fill e8 "hello"        # fill input
```

Alternative selectors (when refs are insufficient):

- CSS: `#main > button.submit`
- Role: `role=button[name=Submit]`
- Chained selectors

## Complete Command Reference

### Core Interaction

| Command | Usage |
|---------|-------|
| `open [url]` | Launch browser, optionally navigate |
| `goto <url>` | Navigate to URL |
| `close` | Close page |
| `click <ref> [button]` | Click element (`left`/`right`/`middle`) |
| `dblclick <ref> [button]` | Double-click element |
| `fill <ref> <text>` | Fill input field |
| `type <text>` | Type into focused element |
| `drag <startRef> <endRef>` | Drag and drop |
| `hover <ref>` | Hover over element |
| `select <ref> <value>` | Select dropdown option |
| `upload <file>` | Upload file(s) |
| `check <ref>` | Check checkbox/radio |
| `uncheck <ref>` | Uncheck checkbox/radio |
| `eval <expression> [ref]` | Evaluate JavaScript |
| `resize <width> <height>` | Resize browser window |

### Navigation

| Command | Usage |
|---------|-------|
| `go-back` | Browser back |
| `go-forward` | Browser forward |
| `reload` | Reload page |

### Keyboard

| Command | Usage |
|---------|-------|
| `press <key>` | Press key (e.g., `Enter`, `Tab`, `ArrowDown`) |
| `keydown <key>` | Hold key down |
| `keyup <key>` | Release key |

### Mouse (coordinate-based)

| Command | Usage |
|---------|-------|
| `mousemove <x> <y>` | Move mouse to coordinates |
| `mousedown [button]` | Press mouse button |
| `mouseup [button]` | Release mouse button |
| `mousewheel <dx> <dy>` | Scroll |

### Screenshots & Export

| Command | Usage |
|---------|-------|
| `screenshot [ref]` | Screenshot page or specific element |
| `screenshot --filename=name.png` | Save with specific filename |
| `pdf` | Export page as PDF |
| `pdf --filename=name.pdf` | Export PDF with specific filename |

### Snapshots

| Command | Usage |
|---------|-------|
| `snapshot` | Capture page snapshot with element refs |
| `snapshot --filename=name.yml` | Save to specific file |

### Tabs

| Command | Usage |
|---------|-------|
| `tab-list` | List all tabs |
| `tab-new [url]` | Open new tab |
| `tab-close [index]` | Close tab |
| `tab-select <index>` | Switch to tab |

### Dialogs

| Command | Usage |
|---------|-------|
| `dialog-accept [prompt]` | Accept dialog with optional prompt text |
| `dialog-dismiss` | Dismiss dialog |

### Storage State

| Command | Usage |
|---------|-------|
| `state-save [filename]` | Save cookies + storage to JSON |
| `state-load <filename>` | Load saved state |

### Cookies

| Command | Usage |
|---------|-------|
| `cookie-list [--domain=X]` | List cookies |
| `cookie-get <name>` | Get cookie |
| `cookie-set <name> <value>` | Set cookie |
| `cookie-delete <name>` | Delete cookie |
| `cookie-clear` | Clear all cookies |

### LocalStorage

| Command | Usage |
|---------|-------|
| `localstorage-list` | List entries |
| `localstorage-get <key>` | Get value |
| `localstorage-set <key> <value>` | Set value |
| `localstorage-delete <key>` | Delete entry |
| `localstorage-clear` | Clear all |

### SessionStorage

| Command | Usage |
|---------|-------|
| `sessionstorage-list` | List entries |
| `sessionstorage-get <key>` | Get value |
| `sessionstorage-set <key> <value>` | Set value |
| `sessionstorage-delete <key>` | Delete entry |
| `sessionstorage-clear` | Clear all |

### Network

| Command | Usage |
|---------|-------|
| `route <pattern> [opts]` | Mock network requests |
| `route-list` | List active routes |
| `unroute [pattern]` | Remove route(s) |

### DevTools

| Command | Usage |
|---------|-------|
| `console [min-level]` | List console messages |
| `network` | List network requests |
| `run-code <code>` | Run Playwright code snippet |
| `tracing-start` | Start trace recording |
| `tracing-stop` | Stop trace recording |
| `video-start` | Start video recording |
| `video-stop [filename]` | Stop video recording |

## Configuration File

Default location: `.playwright/cli.config.json`

```json
{
  "browserName": "chromium",
  "launchOptions": {
    "headless": true
  },
  "contextOptions": {
    "viewport": { "width": 1280, "height": 720 }
  },
  "allowedOrigins": ["localhost:*"],
  "blockedOrigins": [],
  "timeout": {
    "action": 5000,
    "navigation": 60000
  },
  "outputDir": ".playwright-cli",
  "outputMode": "file",
  "consoleLevel": "info",
  "testIdAttribute": "data-testid"
}
```

## Playwright Test Runner CLI (`npx playwright`)

This is the **test framework CLI**, separate from `playwright-cli`. Use for running test suites and generating test code.

### Test Execution

```bash
npx playwright test                              # run all tests
npx playwright test tests/login.spec.ts          # specific file
npx playwright test my-spec.ts:42                # specific line
npx playwright test -g "login"                   # filter by name
npx playwright test --headed                     # visible browser
npx playwright test --debug                      # with inspector
npx playwright test --ui                         # interactive UI mode
npx playwright test --project=chromium           # specific browser
npx playwright test --workers=4                  # parallel workers
npx playwright test --retries=3                  # retry flaky tests
npx playwright test --last-failed                # rerun failures
npx playwright test --only-changed               # changed files only
npx playwright test --reporter=html              # HTML report
npx playwright test --trace on                   # force tracing
npx playwright test --list                       # list without running
npx playwright test -u                           # update visual baselines
```

### Code Generation

```bash
npx playwright codegen [url]                     # record interactions → test code
npx playwright codegen -o output.spec.ts         # save to file
npx playwright codegen --target=python           # generate Python
npx playwright codegen --device="iPhone 13"      # emulate device
npx playwright codegen --save-storage=auth.json  # save auth state
npx playwright codegen --load-storage=auth.json  # load auth state
```

### Reports & Traces

```bash
npx playwright show-report                       # open HTML report
npx playwright show-trace trace.zip              # open trace viewer
```

### Visual Regression in Tests

```typescript
await expect(page).toHaveScreenshot('name.png');
await expect(page).toHaveScreenshot({ maxDiffPixels: 100 });
await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.1 });
```

Update baselines: `npx playwright test --update-snapshots`

Snapshots stored in `<test-file>-snapshots/` directory with browser/platform suffix.
