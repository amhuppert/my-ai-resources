---
name: add-voice-context
description: This skill should be used when the user wants to add context to the voice-to-text context or vocabulary files for the current project. Handles adding misheard words, terminology corrections, and project-specific information to improve transcription and cleanup quality. Also supports updating the global voice context/vocabulary files when the user specifies "global" (e.g., "add X to the global voice context").
allowed-tools: Read, Glob, Edit, Write
---

# Add Voice-to-Text Context

Add new entries to voice-to-text vocabulary and/or context files to improve transcription accuracy and cleanup quality. This addresses cases where the transcriber misrecognizes words or the cleanup step produces incorrect output.

Supports two context levels:

- **Project-level** (default) — files specific to the current project, stored alongside `voice.json`
- **Global-level** — files shared across all projects, stored alongside `~/.config/voice-to-text/config.json`

## How the files work

The voice-to-text tool uses two separate files for different stages:

- **Vocabulary file** (`voice-vocabulary.md`) — A flat list of terms sent to the OpenAI transcription model as hints for accurate word recognition. Affects what words the transcriber produces.
- **Context file** (`voice-context.md`) — Structured project knowledge sent to the Claude cleanup step. Affects how transcribed text is formatted, corrected, and cleaned up.

When adding terms, consider whether the issue is at the transcription level (wrong word recognized) or the cleanup level (right word recognized but formatted incorrectly).

## Step 1: Determine the target level and locate the files

First, determine whether the user wants to update **project-level** or **global-level** files.

**Use global-level** if the user explicitly mentions "global", "global context", "global config", "global voice context", or `~/.config/voice-to-text/`. Otherwise default to **project-level**.

### Global-level resolution

1. Read `~/.config/voice-to-text/config.json` to find `contextFile` and `vocabularyFile` values
2. Resolve paths relative to `~/.config/voice-to-text/`
3. If `config.json` does not exist or has neither file configured, inform the user that global voice-to-text is not configured. Stop here.
4. Read the file contents (whichever exist)

### Project-level resolution (default)

1. Read `voice.json` in the current directory to find `contextFile` and `vocabularyFile` paths
2. If `voice.json` does not exist, check for `voice-context.md` and `voice-vocabulary.md` in the current directory
3. If no voice files exist, inform the user that voice-to-text is not configured for this project and suggest running `/init-voice-config` first. Stop here.
4. Read the file contents (whichever exist)

## Step 2: Understand what to add

Determine what the user wants to add. Common cases:

- **Misheard word or phrase** — The transcriber consistently gets a word wrong. Example: "Zod" transcribed as "god", "CLAUDE.md" transcribed as "cloud.md"
- **New terminology** — A project term, library, or acronym that needs to be recognized
- **Naming convention** — A specific identifier pattern or casing rule that should be preserved
- **Project context** — Background information that helps the cleanup step make better decisions

If the user's request is vague, ask for:

- The word or phrase as it was **incorrectly** transcribed
- The **correct** form it should be cleaned up to
- Optionally, a brief definition or context note

## Step 3: Determine which file(s) to update

| Scenario | Vocabulary file | Context file |
|---|---|---|
| **Misheard term** (transcriber gets the word wrong) | Add the correct term | Add term with description and common mishearings |
| **New terminology** (term not yet in files) | Add the correct term | Add term with description |
| **Naming convention** (casing/formatting issue) | Not needed | Add to Naming Conventions section |
| **Project context** (background knowledge for cleanup) | Not needed | Add to appropriate section |

## Step 4: Add the entries

### Vocabulary file entries

Add one term per line. No markdown formatting, no descriptions — just the bare term with correct spelling and capitalization.

```
Zod
CLAUDE.md
ResolvedFileRef
```

### Context file entries

Add to the appropriate section, following the existing format:

- **Technologies**: `- {Name} ({brief description})`
- **Terminology**: `- **{Term}** - {brief definition or correction note}`
- **Naming Conventions**: `- {convention description}`

When adding a misheard word correction, include the common misheard form in the definition to help Claude recognize and correct it:

```markdown
- **Zod** - Runtime validation library (not "god", "sod", or "zawed")
- **lgit** - Git wrapper for .local directory (not "legit" or "l-git")
```

### Guidelines

- Keep the context file under 80 lines — it is injected into every cleanup prompt
- If the context file is approaching 80 lines, suggest removing less relevant entries before adding new ones
- Match the formatting style of existing entries in each file
- Include exact capitalization for each term
- For acronyms, include the expansion in the context file
- Omit widely known terms (JavaScript, React, Git) unless they are specifically being misheard

## Step 5: Confirm

After editing, display:

- Whether the **project-level** or **global-level** files were updated (and their paths)
- Which file(s) were modified (vocabulary, context, or both)
- The specific entries that were added
- A brief reminder: changes take effect on the next voice-to-text recording
