---
name: web-debugger
description: This skill should be used when the user asks to "debug a web app", "check app logs", "get application state", "inspect runtime state", "get a snapshot", "check what the app is doing", "view server logs", "debug React state", "check the query cache", or mentions runtime debugging, application state inspection, or structured log analysis for a web application that has the web-debugger SDK integrated.
---

# Web App Debugger

Runtime debugging for web applications via the `web-debugger-mcp` server. Provides structured logs and on-demand state snapshots from both browser and server — all saved to files for context-efficient consumption.

## Architecture

```
┌─────────────┐  WebSocket   ┌──────────────────┐  stdio   ┌───────────┐
│  Web App     │────────────→│  web-debugger-mcp │←────────→│  Claude   │
│  (SDK)       │  port 7600  │  (MCP server)     │          │  (agent)  │
└─────────────┘              └──────────────────┘          └───────────┘
```

The web app uses the client SDK to send logs and register state providers. The MCP server receives these over WebSocket, writes them to `.web-debugger/`, and exposes three MCP tools for the agent.

## MCP Tools

| Tool | Purpose | Returns |
|------|---------|---------|
| `get_logs` | Get path to current session's JSONL log file | `{ logFile: "<path>" }` |
| `get_snapshot` | Request state snapshot from a provider | `{ snapshotFile: "<path>", provider: "<name>" }` |
| `list_providers` | List all registered state providers | `{ providers: [{ name, source }] }` |

## Setup

The MCP server is bundled with the `ai-resources` plugin. When the plugin is installed, the `web-debugger` MCP server starts automatically — no manual `claude mcp add` needed.

The server listens on WebSocket port 7600 (override with `WEB_DEBUGGER_PORT` env var). Output directory defaults to `.web-debugger/` (override with `WEB_DEBUGGER_DIR` env var).

After building (`cd web-debugger-mcp && bun run build`), the binary is placed in the plugin's `servers/` directory.

### Client SDK Integration

The web app must integrate the client SDK. This is done by the app developer, not the agent.

```typescript
import { createDebugger } from "web-debugger-mcp/client";

const dbg = createDebugger();

// Log events
dbg.log("info", "User logged in", { userId: "abc123" });

// Register state providers for on-demand snapshots
dbg.registerProvider("app-state", () => store.getState());
dbg.registerProvider("react-query", () => queryClient.getQueryCache().getAll());
```

The SDK auto-detects browser vs server environment, silently degrades when the MCP server isn't running, and is a no-op in production (`NODE_ENV` explicitly set to non-`development`).

## Debugging Workflow

### 1. Check Available Providers

Always start by discovering what state the app exposes:

```
list_providers → see what's available
```

### 2. Read Logs

Get the log file path and read it to understand what happened:

```
get_logs → { logFile: ".web-debugger/logs/session-20260330-143022-a1b2.jsonl" }
```

Then read the file. Each line is a JSON object:

```json
{"timestamp":"2026-03-30T14:30:22.000Z","level":"error","source":"server","message":"Failed to fetch user","context":{"userId":"abc","statusCode":500}}
```

Log fields: `timestamp`, `level` (info/warn/error/debug), `source` (browser/server), `message`, `context` (optional structured data).

### 3. Take Snapshots

Request a snapshot from a specific provider to inspect runtime state:

```
get_snapshot → provider: "app-state"
→ { snapshotFile: ".web-debugger/snapshots/app-state-20260330-143045-c3d4.json" }
```

Then read the snapshot file. Snapshots are pretty-printed JSON.

### 4. Combine with Playwright

For full debugging, combine with browser automation:

1. Use Playwright to reproduce the issue (navigate, click, fill forms)
2. Use `get_logs` to check what errors occurred during the interaction
3. Use `get_snapshot` to inspect application state at the point of failure
4. Use Playwright to verify the fix

See `/browser-automation` for Playwright tool usage.

## Serialization Format

Snapshots automatically serialize non-JSON-native types. When reading snapshot files, recognize these tagged objects:

| Type | Serialized Form |
|------|----------------|
| `Set` | `{ "__type": "Set", "values": [...] }` |
| `Map` | `{ "__type": "Map", "entries": [[key, value], ...] }` |
| `Date` | `{ "__type": "Date", "value": "2026-03-30T..." }` |
| `RegExp` | `{ "__type": "RegExp", "source": "\\d+", "flags": "gi" }` |
| `Error` | `{ "__type": "Error", "name": "TypeError", "message": "...", "stack": "..." }` |
| `BigInt` | `{ "__type": "BigInt", "value": "12345" }` |
| `undefined` | `{ "__type": "undefined" }` |
| `Function` | `{ "__type": "Function", "name": "myFunc" }` |
| Circular ref | `{ "__type": "circular" }` |

## File Locations

All output is under `.web-debugger/` (relative to the project root):

```
.web-debugger/
├── logs/
│   └── session-YYYYMMDD-HHmmss-XXXX.jsonl    # one per server connect
└── snapshots/
    └── <provider>-YYYYMMDD-HHmmss-XXXX.json  # one per snapshot request
```

## Troubleshooting

- **`get_logs` returns "No active session"** — The web app hasn't connected yet. Start the dev server and ensure the SDK is initialized.
- **`list_providers` returns empty** — No providers registered. The app must call `debugger.registerProvider()`.
- **`get_snapshot` returns "provider_not_found"** — The provider name doesn't match. Use `list_providers` to check exact names.
- **`get_snapshot` returns "snapshot_timeout"** — The provider took >10s to respond. The app may be frozen or the provider callback is hanging.
- **No WebSocket connection** — Check that the MCP server is running and the port matches (default 7600).
