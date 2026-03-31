# Web Debugger MCP Review

Canonical copy: `memory-bank/codex/web-debugger-mcp-review.md`

## Summary

I reviewed the implementation against the design spec and ran:

- `cd web-debugger-mcp && bun test` -> passed (`110` tests)
- `cd web-debugger-mcp && bun run typecheck` -> passed

The codebase is generally organized in line with the intended architecture, but it has several spec-critical gaps.

## Findings

### 1. High: Browser SDK becomes a no-op when `process` is missing

- `client/index.ts:37-48`
- In browser environments without a Node-style `process` global, `isDevelopment()` returns `false`, so `createDebugger()` returns the no-op implementation.
- This breaks browser logging and browser-side snapshot providers in the main target environment.

### 2. High: Providers disappear after reconnect and are never re-registered

- `client/index.ts:52`
- `client/index.ts:123-126`
- `client/transport.ts:30-33`
- `src/lib/ws-server.ts:120-125`
- The transport reconnects, but only re-sends `connect`. Because the server removes providers on disconnect, snapshot providers are lost after any transient socket drop.

### 3. High: The server does not require `connect` before other messages

- `src/lib/ws-server.ts:69-117`
- `src/lib/ws-server.ts:89`
- `src/lib/ws-server.ts:99-103`
- `log` and `register_provider` are processed even before the source is established, which allows `unknown` log sources and incorrectly defaults unconnected providers to `server`.

### 4. Medium: Shared references are serialized as circular

- `client/serialization.ts:20-24`
- `client/serialization.ts:54-61`
- The serializer never removes objects from its `WeakSet`, so sibling references to the same object are mis-encoded as `{ "__type": "circular" }`.

### 5. Medium: Snapshot filenames trust unsanitized provider names

- `src/schemas/messages.ts:22-25`
- `src/lib/file-writer.ts:35-36`
- Arbitrary provider names can influence the filesystem path and violate the spec's fixed `{outputDir}/snapshots/{provider}-{timestamp}.json` location.

### 6. Low: Reconnect timers are not cleared on dispose

- `client/transport.ts:56-61`
- `client/transport.ts:86-95`
- Disposed instances can leave scheduled reconnect timers alive until they fire.

## Coverage Gaps

- No browser test with `process` absent
- No reconnect/provider replay test
- No out-of-order protocol test for missing `connect`
- No shared-reference serialization test
- No provider-name sanitization test
- No timer-cleanup test for `dispose()`

## Type Safety Note

- `src/lib/ws-server.ts:102`
- `src/lib/ws-server.ts:123`

The server uses `as unknown as WebSocket` casts to store Bun socket wrappers in the registry. It works with the current call sites, but it weakens the static contract.
