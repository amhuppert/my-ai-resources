# Verbose Flag Implementation Plan

## Overview

Add a `--verbose` CLI-only flag to the voice-to-text tool that enables detailed debug logging. Verbose output covers config resolution (which layers loaded, which files contributed), loaded context/instructions files, full prompts sent to both the transcription API and Claude cleanup, and full transcription/cleanup results (replacing the 50-char previews). The flag is not part of the Config schema or config files. When combined with `--no-terminal-output`, verbose wins.

## Architecture

Verbose logging flows through the existing `FeedbackService`, extended with a `verboseLog` method. Services that construct prompts (cleanup) return the prompt alongside their result so all logging is centralized in `main.ts`. Config resolution returns metadata about which config files were checked/loaded.

```
CLI --verbose
  → main.ts extracts verbose before config resolution
  → resolveConfig returns { config, loadedFrom[] }
  → If verbose: config.terminalOutputEnabled = true
  → createFeedbackService(config, verbose)
  → feedback.verboseLog() for all debug output
  → cleanup returns { text, prompt } → main.ts logs prompt via feedback
```

## File Changes

### 1. types.ts — Add ConfigResolution type

Add after `ResolvedConfig`:

```typescript
type ConfigSource = {
  layer: "global" | "local" | "specified";
  path: string;
  found: boolean;
};

type ConfigResolution = {
  config: ResolvedConfig;
  loadedFrom: ConfigSource[];
};
```

Export both new types.

### 2. config.ts — Return resolution metadata

**Change `resolveConfig` return type** from `ResolvedConfig` to `ConfigResolution`.

Track which config files were checked:

- Build a `loadedFrom: ConfigSource[]` array as each layer is processed
- Global: `{ layer: "global", path: CONFIG_PATH, found: existsSync(CONFIG_PATH) }`
- Local: `{ layer: "local", path: join(process.cwd(), LOCAL_CONFIG_NAME), found: localConfig !== null }`
- Specified: only include if `options.configPath` was provided — `{ layer: "specified", path: resolve(options.configPath), found: true }` (it exits on missing, so if we reach this point it was found)

Return `{ config: { ...parsed, contextFiles, instructionsFiles }, loadedFrom }`.

Update the import of `ConfigResolution` from types.

### 3. feedback.ts — Add verboseLog method

**Add `verbose` parameter** to `createFeedbackService`:

```typescript
function createFeedbackService(
  config: Config,
  verbose = false,
): FeedbackService;
```

**Add to FeedbackService interface**:

```typescript
verboseLog(label: string, content?: string): void;
```

**Implementation**:

- If `!verbose`, return immediately (no-op)
- Format timestamp the same way as `log()`: `new Date().toLocaleTimeString()`
- If `content` is undefined or single-line: print `[timestamp] [VERBOSE] label: content` (or just `label` if no content)
- If `content` is multi-line: print header then content with separators:

```
[HH:MM:SS] [VERBOSE] label:
────────────────────────────────
content here
────────────────────────────────
```

Use `"─".repeat(40)` for the separator line.

### 4. cleanup.ts — Return prompt alongside result

**Change `CleanupService.cleanup` return type** from `Promise<string>` to `Promise<{ text: string; prompt: string }>`.

In `createCleanupService.cleanup()`:

- After building the prompt (line 73-78), store it
- Change `return runClaudeCli(prompt, text, model)` to:
  ```typescript
  const result = await runClaudeCli(prompt, text, model);
  return { text: result, prompt };
  ```

**Remove the `console.log` on line 96-98** inside `runClaudeCli`. This debug output is now superseded by verbose logging in main.ts.

### 5. main.ts — Wire everything together

#### a. Add CLI option

Add after the existing `.option()` chain (before `.option("--max-duration ...")`):

```typescript
.option("--verbose", "Enable verbose debug logging")
```

#### b. Extract verbose early

After `const opts = program.opts();`, before building `cliOpts`:

```typescript
const verbose = opts.verbose === true;
```

Do NOT add verbose to `cliOpts` — it is not a Config field.

#### c. Update resolveConfig call

Change:

```typescript
const config = resolveConfig({ configPath: opts.config, cliOpts });
```

To:

```typescript
const { config, loadedFrom } = resolveConfig({
  configPath: opts.config,
  cliOpts,
});
```

#### d. Override terminalOutputEnabled when verbose

Immediately after resolveConfig:

```typescript
if (verbose) {
  config.terminalOutputEnabled = true;
}
```

Note: `config` is a plain object, so mutation is fine here.

#### e. Pass verbose to feedback service

```typescript
const feedback = createFeedbackService(config, verbose);
```

#### f. Verbose-log config resolution

After creating the feedback service, log config info:

```typescript
// Log which config files were checked
for (const source of loadedFrom) {
  feedback.verboseLog(
    `Config [${source.layer}]`,
    `${source.path} (${source.found ? "loaded" : "not found"})`,
  );
}

// Log resolved config values (exclude contextFiles/instructionsFiles, log those separately)
const { contextFiles, instructionsFiles, ...configValues } = config;
feedback.verboseLog("Resolved config", JSON.stringify(configValues, null, 2));

// Log context files
if (contextFiles.length > 0) {
  const lines = contextFiles.map((f) => `  [${f.source}] ${f.path}`).join("\n");
  feedback.verboseLog(`Context files (${contextFiles.length})`, lines);
} else {
  feedback.verboseLog("Context files", "none");
}

// Log instructions files
if (instructionsFiles.length > 0) {
  const lines = instructionsFiles
    .map((f) => `  [${f.source}] ${f.path}`)
    .join("\n");
  feedback.verboseLog(
    `Instructions files (${instructionsFiles.length})`,
    lines,
  );
} else {
  feedback.verboseLog("Instructions files", "none");
}
```

#### g. Verbose-log transcription prompt

In `handleHotkey`, after building the transcription prompt (`readContextFilesContent`) and before calling `transcriber.transcribe()`:

```typescript
feedback.verboseLog("Transcription prompt", transcriptionPrompt);
```

#### h. Update cleanup call site

Change:

```typescript
const cleanedText = await cleanupService.cleanup(
  transcription,
  config.contextFiles,
  config.instructionsFiles,
);
```

To:

```typescript
const { text: cleanedText, prompt: cleanupPrompt } =
  await cleanupService.cleanup(
    transcription,
    config.contextFiles,
    config.instructionsFiles,
  );
feedback.verboseLog("Cleanup prompt", cleanupPrompt);
```

#### i. Full output in verbose mode

Replace the two truncated preview log lines with conditional logic:

**Transcription output** — replace:

```typescript
const preview = transcription.slice(0, 50);
feedback.log(
  `Transcribed: ${preview}${transcription.length > 50 ? "..." : ""}`,
);
```

With:

```typescript
if (verbose) {
  feedback.verboseLog("Transcription result", transcription);
} else {
  const preview = transcription.slice(0, 50);
  feedback.log(
    `Transcribed: ${preview}${transcription.length > 50 ? "..." : ""}`,
  );
}
```

**Cleanup output** — replace:

```typescript
const cleanPreview = cleanedText.slice(0, 50);
feedback.log(`Cleaned: ${cleanPreview}${cleanedText.length > 50 ? "..." : ""}`);
```

With:

```typescript
if (verbose) {
  feedback.verboseLog("Cleanup result", cleanedText);
} else {
  const cleanPreview = cleanedText.slice(0, 50);
  feedback.log(
    `Cleaned: ${cleanPreview}${cleanedText.length > 50 ? "..." : ""}`,
  );
}
```

## Implementation Order

1. **types.ts** — Add `ConfigSource` and `ConfigResolution` types
2. **config.ts** — Update `resolveConfig` return type and build `loadedFrom` metadata
3. **feedback.ts** — Add `verbose` param and `verboseLog` method
4. **cleanup.ts** — Change return type to `{ text, prompt }`, remove console.log from `runClaudeCli`
5. **main.ts** — Add `--verbose` option, destructure config resolution, override terminalOutputEnabled, pass verbose to feedback, add all verbose logging calls, update cleanup destructuring, conditional full output

## Manual Testing

Run from a project directory that has a `voice.json` with context/instructions files configured:

1. **Without verbose** — confirm behavior is identical to current (truncated previews, no extra output, no `Running: claude ...` line from cleanup.ts)
2. **With `--verbose`** — confirm all debug sections appear: config sources, resolved config, context files, instructions files, transcription prompt, transcription result (full), cleanup prompt, cleanup result (full)
3. **With `--verbose --no-terminal-output`** — confirm verbose wins and all output appears
4. **With only `--no-terminal-output`** — confirm no terminal output (unchanged behavior)
