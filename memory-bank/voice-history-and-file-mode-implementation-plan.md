# Voice-to-Text: Dual-Hotkey File Mode & Last-Transcription Store

## Overview

Add two features to the voice-to-text tool:

1. **Dual-hotkey output routing** — Two hotkeys: one starts a clipboard-mode recording (existing behavior), another starts a file-mode recording (appends to output file, file contents sent as cleanup context). Mode is per-generation, not per-session.
2. **Last-transcription store** — Always overwrite `.voice-last.json` in cwd with the most recent transcription for future correction support.

No new npm dependencies. All changes use Node.js built-in `fs` module.

## Architecture

```
                            ┌────────────────────┐
                            │ .voice-last.json   │ ← always overwritten
                            │ (last transcription)│
                            └────────▲───────────┘
                                     │ save (both modes)
                                     │
record → transcribe → cleanup ───────┼──┬→ clipboard + auto-insert  (clipboard mode)
                         ↑           │  └→ append to output file     (file mode)
                         │           │
              ┌──────────┴───┐       │
              │ prior output │       │
              │ (file mode   │       │
              │  only)       │◄──────┘
              └──────────────┘       read tail 8000 chars from output file
```

Mode is determined by which hotkey starts the recording. Either hotkey stops a recording in progress.

## File Structure

```
voice-to-text/src/
  types.ts                          ← MODIFY: add config fields, OutputMode, update AppState
  utils/config.ts                   ← MODIFY: handle new config fields, resolve outputFile path
  utils/hotkey.ts                   ← MODIFY: accept multiple keys, pass triggered key to callback
  services/cleanup.ts               ← MODIFY: add priorOutput parameter, file-mode prompt template
  services/file-output.ts           ← NEW: read/append/clear output file
  services/last-transcription.ts    ← NEW: save/load last transcription
  main.ts                           ← MODIFY: dual hotkey handling, output routing, new CLI flags
```

## Component Specifications

### 1. types.ts

Add to `ConfigSchema`:

```typescript
fileHotkey: z.string().default("F10"),
outputFile: z.string().optional(),
```

Add new type:

```typescript
export type OutputMode = "clipboard" | "file";
```

Update `AppState`:

```typescript
export interface AppState {
  status: AppStatus;
  recordingStartTime: number | null;
  audioFilePath: string | null;
  outputMode: OutputMode | null;
}
```

Update `ResolvedConfig`:

```typescript
export type ResolvedConfig = Config & {
  contextFiles: ResolvedFileRef[];
  instructionsFiles: ResolvedFileRef[];
  resolvedOutputFile?: string;
};
```

### 2. config.ts

**outputFile path resolution** — Add `outputFile` to the `FILE_KEYS` array (rename to `SPECIAL_FILE_KEYS` for clarity) so it's excluded from the normal scalar merge. Add a resolver function alongside `collectFiles`:

```typescript
function resolveOutputFile(
  globalConfig: Config,
  localConfig: Config | null,
  specifiedConfig: Config | null,
  specifiedConfigDir: string,
  cliOpts: Partial<Config>,
): string | undefined {
  if (cliOpts.outputFile !== undefined) {
    return resolveFilePath(cliOpts.outputFile, process.cwd());
  }
  let resolved: string | undefined;
  if (globalConfig.outputFile)
    resolved = resolveFilePath(globalConfig.outputFile, CONFIG_DIR);
  if (localConfig?.outputFile)
    resolved = resolveFilePath(localConfig.outputFile, process.cwd());
  if (specifiedConfig?.outputFile)
    resolved = resolveFilePath(specifiedConfig.outputFile, specifiedConfigDir);
  return resolved;
}
```

Call this in `resolveConfig()` and include the result in the returned `ResolvedConfig` as `resolvedOutputFile`.

**fileHotkey** — No special handling. It goes through the normal scalar per-key merge like `hotkey`.

### 3. utils/hotkey.ts

Change the public API signature:

```typescript
export async function createHotkeyListener(
  keys: string[],
  callback: (key: string) => void,
): Promise<HotkeyListener>;
```

The callback receives the original key string from the `keys` array (not a keycode or internal representation).

**createMacKeyServerListener** changes:

- Accept `keys: string[]` instead of `key: string`
- Build a lookup: `const targetKeys = new Map(keys.map(k => [normalizeKeyName(k), k]))`
- In `handleData`, when a keycode matches, look up the normalized name in `targetKeys`. If found, call `callback(targetKeys.get(keyName)!)` — this passes back the original key string from the `keys` array.

**createLinuxInputHotkeyListener** changes:

- Accept `keys: string[]`
- Build a lookup: `const keyCodeMap = new Map<number, string>()` mapping Linux keycode → original key string
- Populate by iterating `keys`: for each, call `keyNameToLinuxCode(k)`, map the code to `k`
- Throw if any key has no Linux code mapping
- In `processBuffer`, check `keyCodeMap.has(code)`. If matched, call `callback(keyCodeMap.get(code)!)`

**createStdinHotkeyListener** changes:

- Accept `keys: string[]` and `callback: (key: string) => void`
- Map terminal keys: Enter/Space → `keys[0]` (clipboard hotkey), `f` key → `keys[1]` (file hotkey, if `keys.length > 1`)
- In `onData`, check for `\n`, `\r`, or space → `callback(keys[0])`. Check for `f` or `F` → `callback(keys[1])`

### 4. services/cleanup.ts

Add an optional `priorOutput` parameter to the cleanup interface:

```typescript
export interface CleanupService {
  cleanup(
    text: string,
    contextFiles: ResolvedFileRef[],
    instructionsFiles: ResolvedFileRef[],
    priorOutput?: string,
  ): Promise<{ text: string; prompt: string }>;
}
```

Add a second prompt template for file mode. Use it when `priorOutput` is a non-empty string:

```
You are cleaning up voice-transcribed text. The cleaned text will be appended to an existing document.

{CONTEXT_SECTION}Prior document content (continue from where this ends):
<prior-output>
{PRIOR_OUTPUT}
</prior-output>

Transcribed Text:
<transcription>
{TRANSCRIPTION}
</transcription>

Instructions:
1. Fix obvious transcription errors and typos
2. Improve clarity and readability
3. Add appropriate markdown formatting
4. Continue naturally from the prior document content
5. Maintain consistent terminology, style, and tone with the prior content
6. Do not add information not present in the original transcription
7. Output ONLY the new text to append — do not repeat prior content
8. Output ONLY the cleaned text, no explanations or preamble

{INSTRUCTIONS_SECTION}
```

Selection logic: if `priorOutput` is provided and non-empty, use the file-mode template. Otherwise use the existing clipboard-mode template (unchanged).

The `createCleanupService` implementation applies the template replacements the same way, adding `{PRIOR_OUTPUT}` replacement when using the file-mode template.

### 5. services/file-output.ts (NEW)

```typescript
export interface FileOutputService {
  readTailContent(maxChars: number): string;
  appendText(text: string): void;
  clear(): void;
  readonly filePath: string;
}

export function createFileOutputService(filePath: string): FileOutputService;
```

Behavior:

- **readTailContent(maxChars)** — Return the last `maxChars` characters of the file. Return empty string if file doesn't exist or is unreadable.
- **appendText(text)** — If file doesn't exist, create it with `text` as content. If file exists and is empty, write `text`. If file exists and has content, append `"\n\n" + text` using `appendFileSync`.
- **clear()** — Write empty string to the file (creates it if it doesn't exist). Use `writeFileSync(filePath, "")`.
- **filePath** — Readonly property exposing the resolved path (for logging).

All operations use synchronous fs functions (matching existing codebase patterns). Errors in read operations return empty string silently. Errors in write operations are logged to stderr but do not throw.

### 6. services/last-transcription.ts (NEW)

```typescript
export interface LastTranscription {
  text: string;
  timestamp: number;
  mode: OutputMode;
}

export interface LastTranscriptionService {
  save(text: string, mode: OutputMode): void;
  load(): LastTranscription | null;
}

export function createLastTranscriptionService(): LastTranscriptionService;
```

Behavior:

- Always writes to `$CWD/.voice-last.json`
- **save** — Overwrite file with `JSON.stringify({ text, timestamp: Date.now(), mode }, null, 2)`
- **load** — Parse and return the JSON. Return `null` if file doesn't exist or is invalid JSON.
- Write errors logged to stderr, never thrown.

### 7. main.ts

**New CLI options:**

```
--file-hotkey <key>      Hotkey to start file-mode recording (default: F10)
--output-file <path>     Path to file for file-mode output (default: voice-output.md in cwd)
--clear-output           Clear the output file on startup
```

**Startup sequence changes (in order):**

1. Parse CLI args (add new options to commander)
2. Add `fileHotkey` and `outputFile` to `cliOpts` if provided
3. Resolve config (already handles new fields)
4. Validate hotkeys are different: `config.hotkey.toLowerCase() !== config.fileHotkey.toLowerCase()` — exit with error if same
5. Determine output file path: `config.resolvedOutputFile ?? join(process.cwd(), "voice-output.md")`
6. Create services: add `fileOutput = createFileOutputService(outputFilePath)` and `lastTranscription = createLastTranscriptionService()`
7. If `--clear-output`: call `fileOutput.clear()`, log it
8. Create hotkey listener with both keys: `createHotkeyListener([config.hotkey, config.fileHotkey], handleHotkey)`
9. Update startup message to show both hotkeys and output file path

**handleHotkey(triggeredKey: string) changes:**

In the `idle → recording` transition:

- Determine mode: `triggeredKey.toLowerCase() === config.fileHotkey.toLowerCase() ? "file" : "clipboard"`
- Store in `state.outputMode`
- Log with mode indicator: `"Recording (file mode)..."` or `"Recording (clipboard mode)..."`
- Notification includes mode: `"Recording started (file mode)"`

In the `recording → processing` transition, after transcription succeeds:

```
if state.outputMode === "file":
  priorContent = fileOutput.readTailContent(8000)
  { text, prompt } = cleanup(transcription, contextFiles, instructionsFiles, priorContent || undefined)
  fileOutput.appendText(text)
  log: "Text appended to {filename}"
  notification: "Appended to {filename}"
else:
  { text, prompt } = cleanup(transcription, contextFiles, instructionsFiles)
  copyToClipboard(text)
  cursorInsert if enabled
  log: "Text copied to clipboard."
  notification: "Done!"

// Both modes:
lastTranscription.save(text, state.outputMode)
```

In the `finally` block, also reset `state.outputMode = null`.

**Verbose logging additions:**

- Log which hotkey was pressed and corresponding mode
- In file mode: log output file path, prior content length
- Log last-transcription save

**Startup message:**

- Global hotkey mode: `"Voice-to-text ready. {hotkey}: clipboard, {fileHotkey}: file mode. Output file: {path}"`
- Stdin fallback mode: `"Voice-to-text ready. Enter/Space: clipboard, F: file mode. (Ctrl+C to exit)"`

## Implementation Steps

1. **types.ts** — Add `fileHotkey` and `outputFile` to ConfigSchema. Add `OutputMode` type. Add `outputMode` to AppState. Add `resolvedOutputFile` to ResolvedConfig.

2. **config.ts** — Add `"outputFile"` to the file-keys exclusion list. Add `resolveOutputFile()` function. Call it in `resolveConfig()` and include result in returned config.

3. **services/file-output.ts** — Create new file with `FileOutputService` interface and `createFileOutputService` factory.

4. **services/last-transcription.ts** — Create new file with `LastTranscription` type, `LastTranscriptionService` interface, and `createLastTranscriptionService` factory. Import `OutputMode` from types.

5. **services/cleanup.ts** — Add the file-mode prompt template as a second constant. Add `priorOutput?: string` parameter to the `cleanup` method. Select template based on whether `priorOutput` is non-empty.

6. **utils/hotkey.ts** — Change `createHotkeyListener` signature to accept `keys: string[]` and `callback: (key: string) => void`. Update all three listener implementations (Mac, Linux, Stdin) to handle multiple keys and pass the triggered key to the callback.

7. **main.ts** — Add new CLI options. Add config validation (hotkeys must differ). Create new services. Wire up dual-hotkey listener. Implement per-generation output routing in handleHotkey. Add clear-output startup logic. Update startup messages. Update verbose logging.

## Error Handling

| Scenario                                 | Behavior                                                  |
| ---------------------------------------- | --------------------------------------------------------- |
| Output file write fails                  | Log to stderr, fall back to clipboard for that generation |
| Output file read fails (for context)     | Log warning, proceed with cleanup without prior output    |
| Last-transcription write fails           | Log to stderr, don't block the generation                 |
| Last-transcription read fails            | Return null, no effect on generation                      |
| Both hotkeys configured to same key      | Exit with error at startup                                |
| File hotkey has no Linux keycode mapping | Throw during listener creation, fall back to stdin mode   |
| Output file path directory doesn't exist | fs write will fail, caught by error handler above         |

## Testing Notes

Existing tests in `__tests__/services/cleanup.test.ts` and `__tests__/utils/config.test.ts` will need updates:

- **cleanup.test.ts** — Add test cases for file-mode prompt template selection (with priorOutput, without, with empty string)
- **config.test.ts** — Add test cases for `resolvedOutputFile` path resolution across config layers
- **New test file: `__tests__/services/file-output.test.ts`** — Test appendText (new file, existing file, empty file after clear), readTailContent (within limit, exceeding limit, missing file), clear
- **New test file: `__tests__/services/last-transcription.test.ts`** — Test save/load round-trip, load with missing file, load with invalid JSON
