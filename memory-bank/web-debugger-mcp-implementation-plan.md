# Web Debugger MCP Server — Implementation Plan

## Overview

MCP server providing AI agents with runtime debugging for web apps. Two capabilities: structured log capture (JSONL files) and on-demand application state snapshots (JSON files). Runs stdio transport for Claude + a WebSocket server for web app clients. A unified client SDK works in both browser and Node.js, connecting to the WebSocket server.

All output goes to `.web-debugger/` in the project root. MCP tools return file paths (not payloads) for context efficiency.

## Architecture

```
┌─────────────┐  stdio   ┌─────────────────────────┐  WebSocket   ┌──────────────┐
│  Claude /    │◄────────►│  web-debugger-mcp        │◄────────────►│  Browser SDK  │
│  AI Agent    │          │  (MCP Server)            │              └──────────────┘
└─────────────┘          │                          │  WebSocket   ┌──────────────┐
                          │  - MCP tool handlers     │◄────────────►│  Server SDK   │
                          │  - WebSocket server      │              │  (Node/Bun)   │
                          │  - Session manager       │              └──────────────┘
                          │  - File writer           │
                          └──────────┬──────────────┘
                                     │ writes
                                     ▼
                          ┌──────────────────────┐
                          │  .web-debugger/       │
                          │  ├── logs/*.jsonl     │
                          │  └── snapshots/*.json │
                          └──────────────────────┘
```

**Data flow — Logging:** Client SDK → `log` WS message → MCP server appends to JSONL file → Agent calls `get_logs` tool → gets file path

**Data flow — Snapshots:** Agent calls `get_snapshot("react-query")` → MCP server sends `snapshot_request` over WS to registering client → client calls provider callback → serializes → sends `snapshot_response` → MCP server writes JSON file → returns path to agent

## Technology Stack

- **Runtime**: Bun (server and build)
- **MCP SDK**: `@modelcontextprotocol/sdk` ^1.17.5
- **Validation**: `zod` ^3.22.0
- **WebSocket server**: Bun built-in (`Bun.serve()` with WebSocket upgrade) — zero dependencies
- **WebSocket client** (SDK): Global `WebSocket` API (available in browsers, Bun, Node.js 22+)
- **Build**: `bun build --compile` for MCP server binary
- **Test**: `bun test`
- **TypeScript**: ^5.0.0, strict mode

## Package Structure

```
web-debugger-mcp/
├── package.json
├── tsconfig.json
├── src/                              # MCP server
│   ├── index.ts                      # Entry: stdio transport + WebSocket server startup
│   ├── schemas/
│   │   ├── messages.ts               # WebSocket protocol message schemas (Zod)
│   │   └── tools.ts                  # MCP tool input schemas (Zod)
│   ├── tools/
│   │   ├── get-logs.ts               # get_logs tool handler
│   │   ├── get-snapshot.ts           # get_snapshot tool handler
│   │   └── list-providers.ts         # list_providers tool handler
│   ├── lib/
│   │   ├── session.ts                # Session lifecycle (ID generation, file paths, active session state)
│   │   ├── file-writer.ts            # JSONL log appending, snapshot JSON writing, directory creation
│   │   ├── ws-server.ts              # Bun.serve WebSocket server, message routing
│   │   ├── provider-registry.ts      # In-memory provider tracking (name → WebSocket connection)
│   │   ├── snapshot-handler.ts       # Snapshot request/response correlation with timeout
│   │   └── errors.ts                 # Error classes and handleError utility
│   └── __tests__/
│       ├── session.test.ts
│       ├── file-writer.test.ts
│       ├── provider-registry.test.ts
│       ├── snapshot-handler.test.ts
│       ├── messages.test.ts
│       └── tools.test.ts
└── client/                           # Client SDK (browser + Node.js)
    ├── index.ts                      # createDebugger(), WebDebugger interface
    ├── transport.ts                  # WebSocket connection, reconnect, message send/receive
    ├── serialization.ts              # Custom serializer for Set, Map, Date, etc.
    └── __tests__/
        ├── serialization.test.ts
        ├── transport.test.ts
        └── client.test.ts
```

## WebSocket Protocol

All messages are JSON with a `type` discriminator field.

### Client → Server

**`connect`** — First message after WebSocket opens. Identifies client source.
```ts
{ type: "connect", source: "browser" | "server" }
```

**`log`** — Log entry. Source is inferred from connection (set during `connect`).
```ts
{ type: "log", level: "info" | "warn" | "error" | "debug", message: string, context?: Record<string, unknown>, timestamp: string }
```

**`register_provider`** — Register a state provider.
```ts
{ type: "register_provider", name: string }
```

**`snapshot_response`** — Response to a snapshot request from the server.
```ts
{ type: "snapshot_response", requestId: string, name: string, data: unknown, error?: string }
```

### Server → Client

**`snapshot_request`** — Request a snapshot from the client that registered this provider.
```ts
{ type: "snapshot_request", requestId: string, name: string }
```

### Connection lifecycle
1. Client opens WebSocket → immediately sends `connect` message
2. Server validates `connect`, associates source with this connection
3. If source is `"server"`: create a new session (new log file)
4. If source is `"browser"` and no session exists: create a session
5. On disconnect: remove all providers registered by this connection

## Component Specifications

### `client/serialization.ts` — Custom Serializer

Recursive function `serialize(value: unknown): unknown` that transforms non-JSON-serializable types before `JSON.stringify`. Applied automatically to log `context` and snapshot `data`.

Transformation rules:
| Input Type | Output |
|---|---|
| `Set` | `{ __type: "Set", values: [serialized elements] }` |
| `Map` | `{ __type: "Map", entries: [[serialized key, serialized value], ...] }` |
| `Date` | `{ __type: "Date", value: "ISO string" }` |
| `RegExp` | `{ __type: "RegExp", source: "pattern", flags: "gi" }` |
| `Error` | `{ __type: "Error", name: "TypeError", message: "...", stack: "..." }` |
| `BigInt` | `{ __type: "BigInt", value: "123" }` |
| `undefined` (as object value) | `{ __type: "undefined" }` |
| Circular reference | `{ __type: "circular" }` |
| `Function` | `{ __type: "Function", name: "fnName" }` |
| Arrays | Recursively serialize each element |
| Plain objects | Recursively serialize each value |
| Primitives (string, number, boolean, null) | Pass through unchanged |

Use a `WeakSet<object>` to track visited objects for circular reference detection. Create a new WeakSet per top-level `serialize()` call.

Export: `function serialize(value: unknown): unknown`

### `client/transport.ts` — WebSocket Transport

Manages WebSocket connection to MCP server. Fire-and-forget design — no promises exposed.

**State:** `"connecting" | "connected" | "disconnected"`

**Configuration:** `{ port: number, source: "browser" | "server" }`

**Behavior:**
- `connect()`: Opens WebSocket to `ws://localhost:{port}`, sends `connect` message on open
- `send(message)`: JSON.stringify and send if connected; silently drop if not
- `onMessage(handler)`: Register handler for incoming messages (for snapshot requests)
- `dispose()`: Close connection, stop reconnection
- On unexpected close: retry up to 3 times with delays of 1s, 2s, 4s. After exhaustion, enter disconnected state permanently.
- All operations wrapped in try/catch — transport never throws

Export: `function createTransport(config: TransportConfig): Transport`

### `client/index.ts` — Client SDK Entry Point

**Public API:**
```ts
interface DebuggerConfig {
  port?: number         // default: 7600
  source?: "browser" | "server"  // auto-detected if omitted
}

interface WebDebugger {
  log(level: "info" | "warn" | "error" | "debug", message: string, context?: Record<string, unknown>): void
  registerProvider(name: string, getSnapshot: () => unknown | Promise<unknown>): void
  dispose(): void
}

function createDebugger(config?: DebuggerConfig): WebDebugger
```

**Production safety:** If `typeof process !== "undefined" && process.env?.NODE_ENV !== "development"`, return a no-op implementation where all methods do nothing.

**Source auto-detection:** `typeof window !== "undefined" && typeof document !== "undefined"` → `"browser"`, else → `"server"`.

**Exception safety:** Every public method wraps its body in try/catch. Errors are silently swallowed (logged to `console.debug` if available, never propagated).

**Snapshot request handling:** When transport receives a `snapshot_request`, look up the registered provider by name, call `getSnapshot()` (awaiting if it returns a Promise), serialize the result, send `snapshot_response`. If the provider throws, send `snapshot_response` with `error` field.

### `src/lib/session.ts` — Session Management

**Session ID format:** `YYYYMMDD-HHmmss-XXXX` where XXXX is 4 random hex chars. Example: `20260330-143000-a1b2`.

**State:** Module-level variable holding the current session (`{ id, logFile, startedAt }` or null).

**Functions:**
- `createSession(outputDir: string): Session` — Generate session ID, compute log file path, set as current session
- `getCurrentSession(): Session | null`
- `getOutputDir(): string` — Resolves to absolute path: `path.resolve(process.env.WEB_DEBUGGER_DIR ?? ".web-debugger")`

**Log file path:** `{outputDir}/logs/session-{sessionId}.jsonl`

### `src/lib/file-writer.ts` — File Writing

**Functions:**
- `appendLogEntry(logFile: string, entry: LogEntry): Promise<void>` — Serialize entry to JSON, append line to JSONL file. Create parent directory if needed (`mkdir -p`).
- `writeSnapshot(outputDir: string, providerName: string, data: unknown): Promise<string>` — Write JSON file, return absolute path. Filename: `{providerName}-{timestamp}.json` in `{outputDir}/snapshots/`.

**LogEntry shape** (written to JSONL):
```ts
{ timestamp: string, level: string, source: string, message: string, context?: Record<string, unknown> }
```

Use `appendFile` from `node:fs/promises` for log entries. Use `writeFile` for snapshots. Use `mkdir` with `recursive: true` for directory creation.

### `src/lib/provider-registry.ts` — Provider Registry

In-memory map tracking registered providers and their WebSocket connections.

**State:** `Map<string, { source: "browser" | "server", ws: WebSocket }>`

**Functions:**
- `registerProvider(name: string, source: string, ws: WebSocket): void`
- `unregisterProvider(name: string): void`
- `removeProvidersByConnection(ws: WebSocket): void` — Remove all providers for a disconnected client
- `getProvider(name: string): { source: string, ws: WebSocket } | undefined`
- `listProviders(): Array<{ name: string, source: string }>`

### `src/lib/snapshot-handler.ts` — Snapshot Request/Response

Manages the async flow: send request → wait for response → write file.

**Functions:**
- `requestSnapshot(providerName: string, outputDir: string): Promise<string>` — Look up provider in registry, send `snapshot_request` with a `crypto.randomUUID()` requestId, wait for matching `snapshot_response` (via a pending request map), write to file, return file path. Timeout: 10 seconds.
- `handleSnapshotResponse(response: SnapshotResponseMessage): void` — Resolve the pending request's promise.

**Pending requests:** `Map<requestId, { resolve, reject, timer }>`. Timer clears on response or fires timeout rejection.

### `src/lib/ws-server.ts` — WebSocket Server

Uses `Bun.serve()` with WebSocket upgrade.

**Responsibilities:**
- Start HTTP+WS server on configured port
- On WebSocket open: wait for `connect` message
- On `connect` from `"server"` source: call `createSession()`
- On `connect` from `"browser"` source: create session only if none exists
- On `log` message: append to current session's log file via `file-writer`
- On `register_provider` message: add to `provider-registry`
- On `snapshot_response` message: forward to `snapshot-handler`
- On WebSocket close: call `removeProvidersByConnection()`
- Validate all incoming messages against Zod schemas; ignore invalid messages (log warning to stderr)

**Connection metadata:** Track source per WebSocket using a `Map<WebSocket, { source: string }>` (or Bun's `ws.data` field).

**Port:** `parseInt(process.env.WEB_DEBUGGER_PORT ?? "7600")`

### `src/lib/errors.ts` — Error Handling

```ts
type ErrorType = "no_session" | "provider_not_found" | "snapshot_timeout" | "snapshot_error" | "internal_error"
```

- `WebDebuggerError` class extending `Error` with `type: ErrorType`
- `handleError(error: unknown): { error: { type: ErrorType, message: string } }` utility

### `src/schemas/messages.ts` — WebSocket Message Schemas

Zod schemas for all WebSocket protocol messages (as specified in the WebSocket Protocol section). Export both schemas and inferred types. Use `z.discriminatedUnion("type", [...])` for `ClientMessageSchema`.

### `src/schemas/tools.ts` — MCP Tool Input Schemas

```ts
GetLogsInputSchema = z.object({})
GetSnapshotInputSchema = z.object({ provider: z.string().describe("Name of the state provider to snapshot") })
ListProvidersInputSchema = z.object({})
```

### `src/tools/` — MCP Tool Handlers

Each tool file exports a handler function. Tool handlers are thin wrappers: validate → delegate to lib → return MCP response.

**`get-logs`**: Return `{ logFile: absolutePath }` from current session, or error `"No active session"`.

**`get-snapshot`**: Call `requestSnapshot()`, return `{ snapshotFile: absolutePath, provider: name }`, or error with type.

**`list-providers`**: Call `listProviders()`, return `{ providers: [...] }`.

**MCP response format:** `{ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }`. Use `isError: true` only for `get_snapshot` failures.

### `src/index.ts` — Entry Point

- Shebang: `#!/usr/bin/env bun`
- Create `McpServer` instance with name `"web-debugger"`, version `"1.0.0"`
- Register 3 tools using `server.registerTool(name, { title, description, inputSchema: Schema.shape }, handler)`
- Start WebSocket server via `ws-server`
- Connect stdio transport
- Module guard: `if (process.argv[1] === new URL(import.meta.url).pathname)`

## Implementation Steps (TDD Order)

Each step: write failing test → run to confirm red → implement minimum code → confirm green → refactor if needed.

### Phase 1: Client SDK Pure Logic

**Step 1 — `client/serialization.ts`**
Test cases:
- Primitives pass through unchanged (string, number, boolean, null)
- Set → `{ __type: "Set", values: [...] }`
- Map → `{ __type: "Map", entries: [...] }`
- Date → `{ __type: "Date", value: ISO string }`
- RegExp → `{ __type: "RegExp", source, flags }`
- Error → `{ __type: "Error", name, message, stack }`
- BigInt → `{ __type: "BigInt", value: string }`
- undefined as object value → `{ __type: "undefined" }`
- Function → `{ __type: "Function", name }`
- Circular reference → `{ __type: "circular" }`
- Nested objects/arrays with mixed types
- Set containing Maps, Map containing Sets (deep nesting)

### Phase 2: MCP Server Schemas

**Step 2 — `src/schemas/messages.ts`**
Test cases:
- Valid messages parse correctly for each type
- Invalid messages (missing fields, wrong type) fail validation
- Discriminated union selects correct schema by `type` field

**Step 3 — `src/schemas/tools.ts`**
Test cases:
- GetSnapshotInputSchema requires provider string
- Empty objects validate for get_logs and list_providers

### Phase 3: MCP Server Core Logic

**Step 4 — `src/lib/errors.ts`**
- WebDebuggerError has correct type and message
- handleError wraps known and unknown errors

**Step 5 — `src/lib/session.ts`**
Test cases:
- createSession generates unique IDs with correct format
- createSession returns correct log file path
- getCurrentSession returns null initially
- getCurrentSession returns session after creation
- getOutputDir resolves relative to CWD by default
- getOutputDir uses WEB_DEBUGGER_DIR env var when set

**Step 6 — `src/lib/file-writer.ts`**
Use a temp directory (via `import { mkdtemp } from 'node:fs/promises'`) for test isolation.
Test cases:
- appendLogEntry creates directory and file on first write
- appendLogEntry appends JSONL (one JSON object per line)
- Multiple appends produce multiple lines
- writeSnapshot writes JSON file and returns absolute path
- writeSnapshot creates snapshots directory

**Step 7 — `src/lib/provider-registry.ts`**
Test cases:
- registerProvider adds to registry
- getProvider returns registered provider
- getProvider returns undefined for unknown name
- removeProvidersByConnection removes all providers for a connection
- listProviders returns all registered providers with source
- Registering same name twice overwrites

**Step 8 — `src/lib/snapshot-handler.ts`**
Test with a mock/fake WebSocket (object with a `send` method).
Test cases:
- requestSnapshot sends snapshot_request message with valid requestId
- handleSnapshotResponse resolves pending request
- Timeout after 10s rejects with snapshot_timeout error
- Provider not found rejects with provider_not_found error
- Snapshot with error field rejects with snapshot_error

### Phase 4: MCP Tools

**Step 9 — `src/tools/get-logs.ts`, `get-snapshot.ts`, `list-providers.ts`**
Test each tool handler function directly (not through MCP server).
Test cases per tool:
- get_logs: returns log file path when session active; error when no session
- get_snapshot: returns snapshot file path on success; error for unknown provider; error on timeout
- list_providers: returns empty array initially; returns registered providers

### Phase 5: WebSocket Server Integration

**Step 10 — `src/lib/ws-server.ts`**
Integration test using real WebSocket connections (connect to local Bun.serve).
Test cases:
- Server starts and accepts connections
- `connect` message from `"server"` source creates a session
- `log` messages are written to session log file
- `register_provider` adds provider to registry
- `snapshot_request`/`snapshot_response` round-trip works
- Disconnect removes providers
- Invalid messages are ignored (logged to stderr)

### Phase 6: Client SDK Integration

**Step 11 — `client/transport.ts`**
Test with a local Bun.serve WebSocket server.
Test cases:
- Connects and sends connect message
- send() delivers messages when connected
- send() silently drops when disconnected
- Reconnects on unexpected close (up to 3 times)
- dispose() closes connection cleanly

**Step 12 — `client/index.ts`**
Test cases:
- createDebugger returns no-op when NODE_ENV is not "development"
- No-op implementation: log, registerProvider, dispose all do nothing without error
- Exception safety: methods never throw even if transport fails
- Source auto-detection: "browser" when window+document exist, "server" otherwise
- log() sends log message via transport with serialized context
- registerProvider() sends register_provider message
- Snapshot request calls provider callback and sends response

### Phase 7: Entry Point Wiring

**Step 13 — `src/index.ts`**
Wire everything together. Verify with manual test: start MCP server, connect from a test script, send log, call MCP tool, verify file output.

## Error Handling

| Scenario | Behavior |
|---|---|
| No active session when agent calls `get_logs` | Return `{ error: "No active session. Is the web app running?" }` |
| Unknown provider in `get_snapshot` | Return `{ error: "Provider 'X' not found" }`, `isError: true` |
| Provider timeout (10s) in `get_snapshot` | Return `{ error: "Snapshot timed out for provider 'X'" }`, `isError: true` |
| Provider callback throws in client SDK | Send `snapshot_response` with `error` field; SDK itself doesn't throw |
| Invalid WebSocket message received | Log warning to stderr, ignore message |
| WebSocket connection fails (client SDK) | Silently degrade to no-op mode |
| MCP server not running (client SDK) | Silently degrade to no-op mode |
| Production environment (client SDK) | All methods are no-ops |
| Any exception in SDK public method | Swallowed, logged to console.debug |

## Configuration

**Environment variables (MCP server):**
- `WEB_DEBUGGER_PORT` — WebSocket server port (default: `7600`)
- `WEB_DEBUGGER_DIR` — Output directory path (default: `.web-debugger` relative to CWD)

**Client SDK config:**
- `port` — WebSocket port (default: `7600`)
- `source` — `"browser" | "server"` (auto-detected if omitted)

**Claude Code .mcp.json configuration:**
```json
{
  "mcpServers": {
    "web-debugger": {
      "command": "web-debugger-mcp",
      "env": {
        "WEB_DEBUGGER_PORT": "7600"
      }
    }
  }
}
```

## Build & Package Config

**package.json:**
```json
{
  "name": "web-debugger-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "bin": {
    "web-debugger-mcp": "./bin/web-debugger-mcp"
  },
  "exports": {
    "./client": "./client/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --compile --outfile=bin/web-debugger-mcp",
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.5",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.0.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*", "client/**/*"]
}
```

## Output File Formats

**JSONL log entry** (one per line in `.web-debugger/logs/session-{id}.jsonl`):
```json
{"timestamp":"2026-03-30T14:30:00.123Z","level":"info","source":"server","message":"User logged in","context":{"userId":"123"}}
```

**Snapshot file** (`.web-debugger/snapshots/{provider}-{timestamp}.json`):
Contains the serialized snapshot data as a single JSON object. Non-serializable types use the `__type` wrapper format from the serialization spec.
