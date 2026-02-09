# Design Exploration: Voice-to-Text Conversation History

## Problem Statement

Each transcription is fully independent. The cleanup step (Claude CLI) has no knowledge of what was previously transcribed, which causes several problems:

1. **Fragmented thoughts** - Multi-clip dictation sessions produce disconnected outputs that don't read as continuous prose
2. **Inconsistent cleanup** - Without prior context, Claude may format or rephrase the same concept differently across clips
3. **No incremental document building** - Users must manually assemble clips in an editor; the tool can't append intelligently
4. **No correction mechanism** - Re-recording doesn't inform the tool that it should revise or replace prior output

## Goals

All four use cases must be supported:

| #   | Use Case                | Description                                                    |
| --- | ----------------------- | -------------------------------------------------------------- |
| 1   | Continue a thought      | Multiple recordings form one continuous output                 |
| 2   | Improve cleanup quality | Claude sees prior output for consistent formatting/terminology |
| 3   | Build up a document     | Incrementally dictate into a file, appending over time         |
| 4   | Contextual corrections  | Re-record to fix or revise previous output                     |

Additional constraints from requirements gathering:

- History must **persist across tool restarts** (on-disk storage)
- History grows until the user **explicitly clears** it
- File-based output **replaces clipboard** (not both)
- User typically pastes into a **text editor / IDE**

## Current Architecture (Relevant Parts)

```
record → transcribe (OpenAI) → cleanup (Claude CLI) → clipboard → auto-insert
                ↑                       ↑
          contextFiles            contextFiles + instructionsFiles
         (static hints)           (static domain knowledge + rules)
```

Key integration points:

- **Transcriber** (`transcriber.ts`): Accepts an optional `prompt` string for context hints. OpenAI uses this to improve word recognition, not for conversation history.
- **Cleanup service** (`cleanup.ts`): Builds a prompt with `{CONTEXT_SECTION}`, `{TRANSCRIPTION}`, and `{INSTRUCTIONS_SECTION}`. This is the primary place where history would improve output quality.
- **Output** (`main.ts:222-229`): Currently always copies to clipboard and optionally auto-inserts. This would need to be swapped/extended for file output.
- **Config** (`types.ts`, `config.ts`): Hierarchical config with global → local → specified → CLI layers. File references (`contextFile`, `instructionsFile`) accumulate across layers. New config fields would follow this pattern.

---

## Approach A: File-Based Context Mode

### Concept

Add an output mode where the tool writes/appends to a target file instead of copying to clipboard. On subsequent recordings, the entire file is sent as context to the cleanup step. The file becomes both the output destination and the history source.

### How It Works

```
                           ┌─────────────────┐
                           │  target file     │
                           │  (output.md)     │
                           └───┬─────────▲───┘
                    read as    │         │  append
                    context    │         │  cleaned text
                               ▼         │
record → transcribe → cleanup(text, file_contents) → write to file
```

1. User configures `outputFile: "path/to/draft.md"` in config or via `--output-file` flag
2. Before cleanup, the tool reads the current contents of the output file
3. The file contents are injected into the cleanup prompt as a `<prior-output>` section
4. Claude cleans the new transcription with full awareness of prior output
5. The cleaned text is **appended** to the file (with a newline separator)
6. Clipboard copy and auto-insert are **skipped** when outputFile is set

### Config Changes

```typescript
// New fields in ConfigSchema
outputFile: z.string().optional(); // Path to target file (enables file mode)
```

### Cleanup Prompt Modification

```
You are cleaning up voice-transcribed text...

{CONTEXT_SECTION}

Prior output (what has already been written to the document):
<prior-output>
{FILE_CONTENTS}
</prior-output>

Transcribed Text:
<transcription>
{TRANSCRIPTION}
</transcription>

Instructions:
1. Fix obvious transcription errors and typos
2. Continue naturally from the prior output
3. Maintain consistent formatting and terminology with prior output
4. If this appears to be a correction or revision of prior content, output ONLY the corrected portion
5. Output ONLY the new text to append, not the entire document
...
```

### Clearing History

- Delete or truncate the output file manually
- Add `--clear-output` CLI flag that empties the file on startup
- Optionally a hotkey to clear (e.g., triple-press)

### Evaluation Against Use Cases

| Use Case                | Fit          | Notes                                                                                                        |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| Continue a thought      | **Strong**   | File naturally accumulates continuous prose                                                                  |
| Improve cleanup quality | **Strong**   | Full prior output provides rich context                                                                      |
| Build a document        | **Strong**   | This is the primary design intent                                                                            |
| Corrections             | **Moderate** | Claude can be instructed to detect corrections, but the append-only model makes replacing prior text complex |

### Strengths

- **Simple mental model**: the file IS the history; no hidden state
- **Visible, editable output**: user can open the file in their editor and see/edit everything
- **Natural for document building**: directly produces a growing document
- **Persistence is free**: the file is already on disk
- **No new infrastructure**: just fs read/write operations
- **Integrates with editor workflow**: user already works in text editors

### Weaknesses

- **Corrections are awkward**: Append-only doesn't naturally support "replace the last thing." Could be mitigated by having Claude output the full updated document instead of just new text, but this gets expensive and error-prone as the document grows.
- **Context grows unbounded**: For very long documents, the cleanup prompt could exceed Claude's context window. Requires either truncation strategy (send last N characters) or document summarization.
- **Different UX per mode**: Clipboard mode and file mode have different behaviors, which could be confusing.
- **No clipboard output**: The user explicitly wanted file to replace clipboard, but some quick one-off recordings might still benefit from clipboard mode.

---

## Approach B: Stateful History (Persisted Ring Buffer)

### Concept

The tool maintains a history of recent cleaned transcriptions in a persistent store (JSON file). Before each cleanup, the last N entries are injected as context. Output still goes to clipboard (default behavior preserved).

### How It Works

```
                        ┌──────────────────┐
                        │  history.json    │
                        │  [{text, ts}...] │
                        └──┬──────────▲───┘
                 read last │          │ append
                 N entries │          │ new entry
                           ▼          │
record → transcribe → cleanup(text, history) → clipboard
```

1. History stored at `~/.config/voice-to-text/history.json` (global) or configured per-project
2. Before cleanup, load the last N entries from history
3. Inject as a `<recent-history>` section in the cleanup prompt
4. After cleanup, append `{ text: cleanedText, timestamp: Date.now() }` to history
5. Output still goes to clipboard + auto-insert as normal

### Config Changes

```typescript
// New fields in ConfigSchema
historyEnabled: z.boolean().default(true); // Enable/disable history
historyFile: z.string().optional(); // Custom history file path
```

### History File Format

```json
{
  "entries": [
    { "text": "First transcription output...", "timestamp": 1707400000000 },
    { "text": "Second transcription output...", "timestamp": 1707400060000 }
  ]
}
```

### Cleanup Prompt Modification

```
You are cleaning up voice-transcribed text...

{CONTEXT_SECTION}

Recent transcription history (most recent last):
<recent-history>
[1] First transcription output...
[2] Second transcription output...
</recent-history>

Transcribed Text:
<transcription>
{TRANSCRIPTION}
</transcription>

Instructions:
1. Fix obvious transcription errors and typos
2. Be aware of the recent history for consistent terminology and style
3. If this appears to continue a prior thought, maintain flow and coherence
...
```

### Clearing History

- `--clear-history` CLI flag
- Delete the history file manually
- Could add a hotkey for clearing

### Evaluation Against Use Cases

| Use Case                | Fit          | Notes                                                                                                         |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| Continue a thought      | **Strong**   | History provides continuity context                                                                           |
| Improve cleanup quality | **Strong**   | Prior outputs inform consistent formatting                                                                    |
| Build a document        | **Weak**     | Clipboard output means user still manually assembles; history improves quality but doesn't produce a document |
| Corrections             | **Moderate** | Claude can see what was last generated and adjust, but the corrected text still goes to clipboard separately  |

### Strengths

- **Preserves existing UX**: Clipboard + auto-insert workflow unchanged
- **Works for all recording types**: Quick one-offs and extended sessions both benefit
- **Lightweight**: Small JSON file, minimal disk I/O
- **Clean separation**: History is a behind-the-scenes enhancement, not a new mode

### Weaknesses

- **No document building**: The user still has to manually paste and assemble text. History only improves quality, it doesn't produce a file.
- **Hidden state can confuse**: User might not realize old history is influencing new transcriptions. Needs clear feedback.
- **Corrections still go to clipboard**: If the user wants to fix something, they get a new clipboard entry but the old one is already pasted somewhere.

---

## Approach C: Hybrid (Recommended)

### Concept

Combine both approaches: always maintain a persisted history buffer (Approach B) to improve cleanup quality, and offer an optional file output mode (Approach A) for document building. The history buffer feeds context into cleanup regardless of output mode.

### How It Works

```
                   ┌──────────────┐     ┌──────────────┐
                   │ history.json │     │ output file   │
                   │ (always on)  │     │ (optional)    │
                   └──┬───────▲──┘     └───▲───────────┘
            read last │       │ append     │ append (if file mode)
            N entries │       │ entry      │
                      ▼       │            │
record → transcribe → cleanup(text, history) ─┬→ clipboard (default)
                                              └→ file (if configured)
```

Two independent features that complement each other:

1. **History buffer** (always active): Persisted JSON file with recent transcriptions. Fed to cleanup prompt for quality and continuity. Works in both clipboard and file mode.
2. **File output mode** (opt-in): When `outputFile` is configured, output is appended to the file instead of clipboard. The file contents are ALSO read as additional context (on top of history).

### Why Hybrid Is Better Than Either Alone

| Use Case                | History Only | File Only | Hybrid                                                                               |
| ----------------------- | ------------ | --------- | ------------------------------------------------------------------------------------ |
| Continue a thought      | Strong       | Strong    | **Strong** - history provides context in both modes                                  |
| Improve cleanup quality | Strong       | Strong    | **Strong** - always-on history improves all transcriptions                           |
| Build a document        | Weak         | Strong    | **Strong** - file mode handles this directly                                         |
| Corrections             | Moderate     | Moderate  | **Strong** - history tracks what was said; file mode can be enhanced for replacement |

### Detailed Design

#### History Service

New service: `src/services/history.ts`

```typescript
interface HistoryEntry {
  text: string;
  timestamp: number;
}

interface HistoryService {
  getRecentEntries(): HistoryEntry[];
  addEntry(text: string): void;
  clear(): void;
}
```

- Storage: `~/.config/voice-to-text/history.json` (default), overridable via `historyFile` config
- Per-project history: If `voice.json` exists in the project, history could live alongside it
- Entries are appended after successful cleanup
- `clear()` empties the entries array

#### File Output Service

New service: `src/services/file-output.ts`

```typescript
interface FileOutputService {
  readCurrentContent(): string;
  appendText(text: string): void;
  clear(): void;
}
```

- Reads and appends to the configured `outputFile`
- Creates the file if it doesn't exist
- Appends with a double-newline separator between entries

#### Config Changes

```typescript
// Additions to ConfigSchema
outputFile: z.string().optional(); // Enables file output mode
historyFile: z.string().optional(); // Custom history file location
```

History is always on (no toggle needed). File output mode activates when `outputFile` is set.

#### CLI Changes

```
--output-file <path>     Write output to file instead of clipboard
--history-file <path>    Custom history file location
--clear-history          Clear history on startup
--clear-output           Clear output file on startup
```

#### Cleanup Prompt Changes

The cleanup prompt gains two new optional sections:

```
You are cleaning up voice-transcribed text...

{CONTEXT_SECTION}

{HISTORY_SECTION}

{PRIOR_OUTPUT_SECTION}

Transcribed Text:
<transcription>
{TRANSCRIPTION}
</transcription>

Instructions:
1. Fix obvious transcription errors and typos
2. Improve clarity and readability
3. Add appropriate markdown formatting
4. Maintain consistency with recent history (terminology, style, tone)
5. If continuing a thought from history, ensure smooth flow
6. Do not add information not present in the original
7. Output ONLY the cleaned text, no explanations or preamble

{INSTRUCTIONS_SECTION}
```

Where:

- `{HISTORY_SECTION}` = numbered list of recent transcription entries (always present if history exists)
- `{PRIOR_OUTPUT_SECTION}` = full file contents (only in file output mode)

#### Output Routing in main.ts

```
if (config.outputFile) {
  fileOutput.appendText(cleanedText)
  feedback.log("Text appended to output file.")
} else {
  copyToClipboard(cleanedText)
  if (cursorInsert) cursorInsert.insertAtCursor(cleanedText)
}

// Always record to history regardless of output mode
history.addEntry(cleanedText)
```

#### Corrections: Deferred Design Decision

Corrections are the most complex use case and warrant their own focused design. The hybrid approach provides the foundation: history lets Claude see what was previously output, and file mode provides a mutable document.

Possible correction strategies (to explore in a future iteration):

- **Voice command detection**: If the transcription starts with "actually" or "replace that with", Claude interprets it as a correction
- **Replace-last mode**: A hotkey modifier or flag that tells the tool to replace the last entry rather than append
- **Full-document rewrite**: In file mode, Claude could output the entire updated document (expensive, but accurate)

Recommendation: Ship history + file output first, gather usage feedback, then design corrections based on real pain points.

### Implementation Sequence

```
Phase 1: History service (high value, low risk)
  ├── Create history.ts service (read/write/clear JSON file)
  ├── Add historyFile config field
  ├── Inject history into cleanup prompt
  ├── Record entries after successful cleanup
  ├── Add --clear-history and --history-file CLI flags
  └── Update verbose logging to show history state

Phase 2: File output mode (medium complexity)
  ├── Create file-output.ts service (read/append/clear)
  ├── Add outputFile config field
  ├── Inject file contents into cleanup prompt
  ├── Route output to file instead of clipboard when configured
  ├── Add --output-file and --clear-output CLI flags
  └── Update verbose logging for file mode

Phase 3: Corrections (future, after usage feedback)
  └── Design TBD based on real-world patterns
```

### Token Budget Considerations

Both history and file contents add to the cleanup prompt size. Mitigation strategies:

- **History**: Send only the last 5-10 entries. At ~200 words per transcription, this is ~1000-2000 words (~1500-3000 tokens). Well within Claude's context.
- **File contents**: For large documents, send only the last N characters (e.g., last 4000 characters) as a sliding window. The user is most likely continuing from where they left off.
- **Combined**: Even with both active, the total context addition is modest. Only becomes an issue for very long dictation sessions, which the sliding window approach handles.

## Recommendation

**Go with the Hybrid approach (C)**, implemented in two phases:

1. **Phase 1 (History buffer)** delivers immediate value for use cases 1, 2, and 4 with minimal changes. Every transcription benefits from context, and the clipboard workflow is unchanged.

2. **Phase 2 (File output)** adds document building (use case 3) as an opt-in mode. It complements history rather than replacing it.

This avoids forcing a choice between approaches and lets the user use whichever mode fits their current task - quick clipboard transcriptions with history context, or focused document building with file output.
