# Web Debugger MCP Spec Review

Date: 2026-03-30

## Scope

Reviewed the TypeScript implementation in `web-debugger-mcp/` against the design spec for:

- protocol/schema compliance
- client SDK production and exception safety
- session/log/snapshot behavior
- provider lifecycle and reconnect behavior
- type safety and cleanup
- test coverage gaps

## Verification

- `cd web-debugger-mcp && bun test` -> passed (`110` tests)
- `cd web-debugger-mcp && bun run typecheck` -> passed

Passing tests do not cover several spec-critical paths listed below.

## Findings

### 1. High: Browser SDK becomes a permanent no-op when `process` is unavailable

Spec:
- The unified SDK must work in both browser and Node.js.
- Production safety is "no-op when `NODE_ENV !== \"development\"`", not "no-op when `process` is missing".

Observed:
- `client/index.ts:37-45` returns `false` from `isDevelopment()` whenever `process` is undefined.
- `client/index.ts:47-48` immediately returns the no-op debugger when `isDevelopment()` is false.

Impact:
- In real browser environments that do not expose `process`, `createDebugger()` always returns a no-op implementation.
- That disables browser log capture and browser-side snapshot providers entirely, which breaks one of the two core capabilities in the main target environment.

Why this is a spec deviation:
- The spec explicitly requires a browser-capable unified SDK. The current gate effectively requires a Node-style global for the browser path to function.

Recommended fix:
- Make the development check browser-safe instead of treating missing `process` as production.
- If the environment variable is unavailable, prefer a configurable opt-in or a safer default that still allows browser development builds to function.

### 2. High: Registered providers are lost after WebSocket reconnect and never re-registered

Spec:
- The client transport reconnects up to 3 times.
- On disconnect, the server removes all providers for that connection.
- The SDK API is synchronous and fire-and-forget; callers are not told to re-register providers after reconnect.

Observed:
- `client/index.ts:52` stores providers locally in a `Map`.
- `client/index.ts:123-126` only sends `register_provider` at initial registration time.
- `client/transport.ts:30-33` sends only the `connect` message after a connection opens or reopens.
- `src/lib/ws-server.ts:120-125` removes providers for the disconnected connection.

Impact:
- After any transient socket drop, `list_providers` becomes incomplete and `get_snapshot()` starts failing with `provider_not_found` unless the application manually re-registers everything.
- This breaks snapshot flow after reconnect, even though reconnect is a documented transport feature.

Recommended fix:
- On every successful transport open, replay all locally known provider registrations.
- Add an integration test that registers a provider, forces a reconnect, and verifies `get_snapshot()` still works.

### 3. High: The server does not enforce `connect` as the first WebSocket message

Spec:
- The client must immediately send `connect`.
- The server validates `connect` and associates the source with the connection before handling later messages.
- Log source must come from the connection's `connect` message.

Observed:
- `src/lib/ws-server.ts:69-117` accepts `log`, `register_provider`, and `snapshot_response` even when no `connect` message has been processed.
- `src/lib/ws-server.ts:89` writes log entries with `source: ws.data.source ?? "unknown"`.
- `src/lib/ws-server.ts:99-103` registers providers with `ws.data.source ?? "server"`.

Impact:
- A client can send `register_provider` before `connect` and be incorrectly recorded as `server`.
- A client can send logs before `connect` and get `source: "unknown"`, which violates the JSONL format contract.
- The connection lifecycle is no longer authoritative, so protocol bugs on the client side become silently accepted instead of rejected.

Recommended fix:
- Reject or ignore every non-`connect` message until the connection has been initialized.
- Add tests for out-of-order `log` and `register_provider` messages.

### 4. Medium: Serializer marks repeated references as circular even when they are not cycles

Spec:
- Circular detection should identify actual cycles and emit `{ "__type": "circular" }`.
- Serialization uses a new `WeakSet` per top-level call.

Observed:
- `client/serialization.ts:20-24` adds every visited object to `seen`.
- The serializer never removes objects from `seen` when unwinding recursion.
- `client/serialization.ts:54-61` reuses that same set for sibling branches.

Impact:
- Shared references are serialized incorrectly. Example:
  - Input: `const shared = { x: 1 }; serialize({ a: shared, b: shared })`
  - Actual result: `b` becomes `{ "__type": "circular" }`
  - Expected result: both `a` and `b` should serialize to `{ x: 1 }`
- This corrupts snapshot and log payloads for common object graphs that use aliasing without cycles.

Recommended fix:
- Track the current recursion stack rather than every visited object globally for the whole traversal, or remove the object from `seen` after finishing each branch.
- Add a test for repeated non-circular references.

### 5. Medium: Provider names are written into snapshot paths without sanitization

Spec:
- Snapshot files must be written under `.web-debugger/snapshots/{provider}-{timestamp}.json`.

Observed:
- `src/schemas/messages.ts:22-25` accepts any string for `register_provider.name`.
- `src/lib/file-writer.ts:35-36` builds the snapshot filename directly from `providerName`.

Impact:
- Provider names containing `/`, `..`, path separators, or reserved characters can escape the intended filename format, create nested paths, or fail unexpectedly on some platforms.
- Example provider names like `../outside` or `dir/name` can break the guarantee that snapshots stay inside `{outputDir}/snapshots/`.

Recommended fix:
- Restrict provider names at the schema boundary or sanitize them before building filenames.
- Add tests for invalid or hostile provider names.

### 6. Low: `dispose()` does not clear scheduled reconnect timers

Spec:
- Resource cleanup should clear timers and stop reconnect behavior cleanly.

Observed:
- `client/transport.ts:56-61` schedules reconnects with `setTimeout(doConnect, delay)`.
- `client/transport.ts:86-95` sets `disposed = true` and closes the socket, but it does not store or clear timeout handles.

Impact:
- Disposed debugger instances can leave pending timers alive until they fire.
- `doConnect()` exits early because `disposed` is true, so this does not usually reconnect incorrectly, but it is still avoidable timer leakage.

Recommended fix:
- Store timeout handles and clear them in `dispose()`.
- Add a test that disposes during a reconnect window and verifies no further timers remain active.

## Type Safety Notes

- `src/lib/ws-server.ts:102`
- `src/lib/ws-server.ts:123`

These lines use `wrapper as unknown as WebSocket` to satisfy the provider registry API. That is not a direct runtime bug today, but it weakens the static contract and hides the fact that the registry only needs a small send/identity interface, not a full DOM `WebSocket`.

## Test Coverage Gaps

- No test covers browser usage when `process` is absent.
- No test covers reconnect followed by snapshot provider reuse.
- No test covers protocol violations where `connect` is omitted or delayed.
- No test covers repeated non-circular object references in serialization.
- No test covers unsafe provider names in snapshot file generation.
- No test covers reconnect timer cleanup on `dispose()`.
- No test exercises concurrent snapshot requests for the same provider.

## Recommended Next Steps

1. Fix the three high-severity issues first: browser development gating, reconnect provider replay, and `connect` enforcement.
2. Sanitize provider names at the protocol boundary and in snapshot file generation.
3. Correct the serializer's circular detection logic.
4. Add regression tests for every gap listed above before making further protocol changes.
