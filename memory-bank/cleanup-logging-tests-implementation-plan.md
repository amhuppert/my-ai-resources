# Voice-to-Text Cleanup Logging & Tests Implementation Plan

## Overview

Add verbose logging and test coverage to the voice-to-text cleanup service (`voice-to-text/src/services/cleanup.ts`). The cleanup service spawns `claude` CLI as a subprocess. Changes: (1) verbose logging of the exact CLI command/args and elapsed time, (2) dependency injection of `spawn` for testability, (3) unit tests with mock spawn, (4) integration tests in a separate file.

## File Changes

| File                                                          | Action                                                   |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `voice-to-text/src/services/cleanup.ts`                       | Modify — add verbose logging, add `spawnFn` DI parameter |
| `voice-to-text/src/main.ts`                                   | Modify — pass `verbose` to `createCleanupService`        |
| `voice-to-text/package.json`                                  | Modify — update test scripts                             |
| `voice-to-text/src/services/cleanup.test.ts`                  | Create — unit tests                                      |
| `voice-to-text/tests/integration/cleanup.integration.test.ts` | Create — integration tests                               |

## Step 1: Modify `cleanup.ts`

### 1a. Update `createCleanupService` signature

Change from:

```
createCleanupService(model?: string): CleanupService
```

To:

```
createCleanupService(model?: string, verbose?: boolean, spawnFn?: typeof spawn): CleanupService
```

- `verbose` defaults to `false`
- `spawnFn` defaults to the real `spawn` imported from `node:child_process`
- Pass all three through to `runClaudeCli`

### 1b. Update `runClaudeCli` signature

Change from:

```
runClaudeCli(prompt, fallbackText, model?)
```

To:

```
runClaudeCli(prompt, fallbackText, model?, verbose?, spawnFn?)
```

- `spawnFn` defaults to the imported `spawn`
- Use `spawnFn` instead of `spawn` directly when creating the child process

### 1c. Add verbose logging to `runClaudeCli`

**Before spawning** (when `verbose` is true):

Build a display string showing the command without the full prompt. Format:

```
[cleanup] Spawning: claude -p <1234 chars> --model haiku
```

Logic: iterate `args` array, replace the element immediately after `"-p"` with `<N chars>` where N is the prompt's length. Join remaining args with spaces. Prepend `claude`.

**After completion** (when `verbose` is true):

Record `startTime = Date.now()` before spawning. In both the `close` and `error` handlers, compute `elapsed = Date.now() - startTime`.

On `close` event:

```
[cleanup] Completed in 2345ms (exit code: 0)
```

Or if non-zero:

```
[cleanup] Failed in 2345ms (exit code: 1)
```

On `error` event:

```
[cleanup] Spawn error after 150ms: <error.message>
```

Use `console.error` for all verbose output (keeps stdout clean since it carries the cleanup result).

## Step 2: Modify `main.ts`

Line 172 currently reads:

```typescript
const cleanupService = createCleanupService(config.claudeModel);
```

Change to:

```typescript
const cleanupService = createCleanupService(config.claudeModel, verbose);
```

No other changes to main.ts. The `verbose` variable already exists at line 79.

## Step 3: Update `package.json` test scripts

Replace the current test scripts:

```json
"test": "bun test src/",
"test:integration": "bun test tests/",
"test:all": "bun test",
"test:watch": "bun test --watch src/"
```

- `bun test src/` runs only unit tests (colocated in `src/`)
- `bun test tests/` runs only integration tests
- `bun test` runs everything
- `bun test --watch src/` watches unit tests

## Step 4: Create unit tests — `cleanup.test.ts`

Location: `voice-to-text/src/services/cleanup.test.ts`

### Mock spawn helper

Create a `createMockSpawn` helper function within the test file. It returns `{ spawnFn, calls }` where:

- `calls` is an array that records each invocation: `{ command: string, args: string[], options: object }`
- `spawnFn` returns an object satisfying the ChildProcess interface used by cleanup.ts (stdout/stderr as EventEmitters, plus `on("error")` and `on("close")` support)

Constructor parameters:

- `stdoutData: string` — data to emit on stdout (default: `"cleaned text"`)
- `exitCode: number` — code to emit on close (default: `0`)
- `shouldError: boolean` — if true, emit an error event instead of close (default: `false`)

Use `EventEmitter` from `node:events` for the mock child process and its stdout/stderr. Schedule event emissions with `queueMicrotask` so they fire after the caller has registered its listeners.

Cast `spawnFn` as `typeof spawn` when passing to `createCleanupService`.

### Test cases

All tests call `createCleanupService(model, false, mockSpawnFn).cleanup(text, [], [])` with empty context/instructions arrays (avoids file system mocking).

**Test 1: "passes --model flag when model is provided"**

- Create service with model `"haiku"`
- Call `cleanup("test input", [], [])`
- Assert `calls[0].args` contains `"--model"` followed by `"haiku"`
- Assert `calls[0].command` is `"claude"`

**Test 2: "omits --model flag when model is undefined"**

- Create service with model `undefined`
- Call `cleanup("test input", [], [])`
- Assert `calls[0].args` does NOT contain `"--model"`

**Test 3: "returns cleaned text from stdout"**

- Mock spawn with stdoutData `"cleaned output"`
- Call cleanup and assert result `.text` equals `"cleaned output"`

**Test 4: "falls back to raw text on non-zero exit code"**

- Mock spawn with exitCode `1`
- Call cleanup with text `"raw input"`
- Assert result `.text` equals `"raw input"`

**Test 5: "falls back to raw text on spawn error"**

- Mock spawn with `shouldError: true`
- Call cleanup with text `"raw input"`
- Assert result `.text` equals `"raw input"`

**Test 6: "prompt contains transcription in correct tags"**

- Call cleanup with text `"hello world"`
- Assert the prompt (from `calls[0].args[1]`) contains `<transcription>\nhello world\n</transcription>`

**Test 7: "uses file mode template when priorOutput is provided"**

- Call `cleanup("test", [], [], "prior text")`
- Assert prompt contains `<prior-output>\nprior text\n</prior-output>`
- Assert prompt contains `"continue from where this ends"` (file mode marker)

**Test 8: "spawn options include timeout and stdio config"**

- Assert `calls[0].options.timeout` is `60000`
- Assert `calls[0].options.stdio` deep equals `["ignore", "pipe", "pipe"]`

## Step 5: Create integration tests — `cleanup.integration.test.ts`

Location: `voice-to-text/tests/integration/cleanup.integration.test.ts`

Create the directory `voice-to-text/tests/integration/`.

### Test cases

These tests call the real `claude` CLI. Use a long timeout (30 seconds) per test via `{ timeout: 30000 }` in the test options.

**Test 1: "invokes claude CLI and returns cleaned text"**

- Create service with no model (uses Claude CLI default): `createCleanupService()`
- Call `cleanup("hello world this is a test", [], [])`
- Assert result `.text` is a non-empty string
- Assert result `.text` is not equal to the raw input (was actually processed)

**Test 2: "invokes claude CLI with model flag"**

- Create service with model `"haiku"`: `createCleanupService("haiku")`
- Call `cleanup("hello world this is a test", [], [])`
- Assert result `.text` is a non-empty string

**Test 3: "returns prompt used for cleanup"**

- Call cleanup and assert result `.prompt` contains `<transcription>`

## Step 6: Build and verify

1. Run `bun test src/` from `voice-to-text/` — all 8 unit tests should pass
2. Run `bun test tests/` from `voice-to-text/` — integration tests should pass (requires `claude` CLI available and authenticated)
3. Run the tool with `--verbose` and verify logging output appears on stderr showing the command and timing

## Error Handling

- Verbose logging uses `console.error` only — no stdout pollution
- All logging is behind the `verbose` flag — zero overhead when disabled
- Mock spawn helper must use `queueMicrotask` for event scheduling to match real async behavior
- Integration tests must have generous timeouts (30s) since they make real API calls
