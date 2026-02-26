# Voice-to-Text Vocabulary File Implementation Plan

## Overview

Split transcription context from cleanup context. A new `vocabularyFile` config option provides a flat list of terms to the OpenAI transcription model, replacing the full context file. The cleanup step (Claude) continues to receive context + instructions files, and additionally receives vocabulary files labeled as vocabulary.

## Architecture

**Current flow:**
```
Context files → readContextFilesContent() → transcription prompt → OpenAI
Context files → buildFileSections() → cleanup prompt → Claude
```

**New flow:**
```
Vocabulary files → buildTranscriptionPrompt() → transcription prompt → OpenAI
Context files + Vocabulary files → buildFileSections() → cleanup prompt → Claude
```

## File Changes

### 1. `voice-to-text/src/types.ts`

**ConfigSchema**: Add `vocabularyFile: z.string().optional()` (same pattern as `contextFile`).

**ResolvedConfig**: Add `vocabularyFiles: ResolvedFileRef[]` (same pattern as `contextFiles`).

### 2. `voice-to-text/src/utils/config.ts`

**SPECIAL_FILE_KEYS**: Add `"vocabularyFile"` to the array.

**collectFiles**: Widen the `field` parameter type from `"contextFile" | "instructionsFile"` to also accept `"vocabularyFile"`.

**resolveConfig return**: Add `vocabularyFiles: collectFiles("vocabularyFile")` to the returned config object.

### 3. `voice-to-text/src/utils/context.ts`

Replace `readContextFilesContent` with `buildTranscriptionPrompt`:

- **Signature**: `buildTranscriptionPrompt(vocabularyFiles: ResolvedFileRef[]): string`
- Read each vocabulary file, split by newlines, trim each line, filter empty lines
- Deduplicate terms across files (maintain insertion order)
- If no terms: return `"Accurately transcribe the spoken audio."`
- If terms exist: return `"Accurately transcribe the spoken audio. Domain vocabulary: {terms joined with ', '}."`

The function name changes to clearly indicate it builds a transcription prompt (not a generic context reader). All callers will be updated.

### 4. `voice-to-text/src/services/cleanup.ts`

**CleanupService.cleanup signature**: Add `vocabularyFiles: ResolvedFileRef[]` parameter after `instructionsFiles`.

**buildFileSections**: Extend the `type` parameter to accept `"vocabulary"` in addition to `"context"` and `"additional-instructions"`. When type is `"vocabulary"`, use label suffix `"Vocabulary"` and tag suffix `"-vocabulary"`. Example output:

```
Project Vocabulary:
<local-vocabulary>
{file content}
</local-vocabulary>
```

**Prompt templates**: Add `{VOCABULARY_SECTION}` placeholder immediately after `{CONTEXT_SECTION}` in both `CLEANUP_PROMPT_TEMPLATE` and `FILE_MODE_CLEANUP_PROMPT_TEMPLATE`.

**cleanup method body**: Build vocabulary section via `buildFileSections(vocabularyFiles, "vocabulary")` and inject into the template at `{VOCABULARY_SECTION}`.

### 5. `voice-to-text/src/main.ts`

**Import**: Change `readContextFilesContent` to `buildTranscriptionPrompt`.

**CLI option**: Add `--vocabulary-file <path>` option to the listen command.

**cliOpts mapping**: Add `vocabularyFile` from `opts.vocabularyFile`.

**Transcription call** (line ~231): Change `readContextFilesContent(config.contextFiles)` to `buildTranscriptionPrompt(config.vocabularyFiles)`.

**Cleanup call** (line ~262): Pass `config.vocabularyFiles` as the new parameter.

**Verbose logging**: Add vocabulary files logging block (same pattern as context/instructions files logging near lines 151-169).

### 6. `voice-to-text/src/server.ts`

**Import**: Change `readContextFilesContent` to `buildTranscriptionPrompt`.

**Transcription call** (line ~148): Change `readContextFilesContent(config.contextFiles)` to `buildTranscriptionPrompt(config.vocabularyFiles)`.

**Cleanup call** (line ~191): Pass `config.vocabularyFiles` as the new parameter.

**Verbose logging**: Add vocabulary files logging (same pattern as context/instructions files logging near lines 151-163).

### 7. `claude/ai-resources-plugin/skills/init-voice-config/SKILL.md`

Update the skill to generate a vocabulary file alongside the context file:

**allowed-tools frontmatter**: Add `Write(voice-vocabulary.md)`.

**"How voice-to-text uses the context file" section**: Replace with a section explaining the two-file system:
- `voice-vocabulary.md` → sent to transcription model as vocabulary hints for accurate word recognition
- `voice-context.md` → sent to Claude cleanup step for domain understanding and formatting

**Step 2**: Split into two sub-steps:
- **Step 2a: Generate voice-vocabulary.md** — A flat list of terms, one per line. Extract from the gathered project info: technology names, library names, key identifiers, acronyms, domain terms, slash command names. No markdown structure, no descriptions — just the terms themselves. Example:

```
TypeScript
Zod
Bun
Commander.js
Claude Code
CLAUDE.md
voice-context.md
ResolvedFileRef
ConfigSchema
/init-voice-config
/add-voice-context
```

- **Step 2b: Generate voice-context.md** — Keep existing format and guidelines. This file continues to provide rich context to the cleanup step.

**Step 3: Generate voice.json**: Update to include both file references:

```json
{
  "contextFile": "./voice-context.md",
  "vocabularyFile": "./voice-vocabulary.md"
}
```

### 8. `claude/ai-resources-plugin/skills/add-voice-context/SKILL.md`

Update the skill to support vocabulary file updates:

**Description**: Update to mention vocabulary file support.

**"How the context file works" section**: Add explanation that the vocabulary file is used for transcription accuracy while the context file is used for cleanup quality.

**Step 1 (locate files)**: For both project-level and global-level resolution, also locate the vocabulary file via the `vocabularyFile` config key. If no vocabulary file exists, note that one can be created.

**Step 2 (understand what to add)**: Add guidance:
- **Misheard terms** → Add to vocabulary file (for transcription recognition) AND context file (for cleanup understanding)
- **New terminology** → Add to both: bare term in vocabulary file, term with description in context file
- **Project context / naming conventions** → Context file only (these don't help the transcription model)

**Step 4 (add the entry)**: For vocabulary file entries, add one term per line (no markdown formatting, no descriptions). For context file entries, keep existing format.

**Step 5 (confirm)**: Update to report which file(s) were modified.

## Implementation Order

Execute in this order (each step depends on the previous):

1. `types.ts` — Schema and type additions
2. `config.ts` — Vocabulary file accumulation
3. `context.ts` — Replace context-based prompt with vocabulary-based prompt
4. `cleanup.ts` — Add vocabulary to cleanup prompt
5. `main.ts` — Wire vocabulary through listen command
6. `server.ts` — Wire vocabulary through server endpoint
7. `init-voice-config/SKILL.md` — Generate vocabulary file
8. `add-voice-context/SKILL.md` — Support vocabulary file updates

## Testing

After implementation, verify with `--verbose` flag:
- Transcription prompt shows only vocabulary terms, not full context
- Cleanup prompt includes context sections, vocabulary sections, and instructions sections
- Config resolution logs show vocabulary files being loaded from each layer
