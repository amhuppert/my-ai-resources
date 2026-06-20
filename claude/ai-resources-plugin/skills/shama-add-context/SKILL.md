---
name: shama-add-context
description: Add terms, context, or instructions to Shama voice-to-text files for clipboard mode (Ctrl+Opt+Space) or shell-command mode (Ctrl+Opt+S), at project or global level.
allowed-tools: Read, Glob, Edit, Write
---

# Add Shama Context

Add new entries to Shama's vocabulary, context, or instructions files to improve transcription accuracy, cleanup formatting, or shell-command generation. This addresses cases where the transcriber misrecognizes words, the cleanup step formats text incorrectly, or shell-mode generates the wrong command.

Shama is the resident macOS voice-to-text app. It reads a per-project `voice.json` plus an optional global `voice.json`; the file keys below point at the markdown files that feed its pipelines.

Supports two context levels:

- **Project-level** (default) — files specific to the current project, stored alongside the project's `voice.json`
- **Global-level** — files shared across all projects, stored alongside `~/.voice/voice.json`

For each file key, Shama takes the **union** of global then project values: global file-list entries come first, project entries are appended (duplicates by resolved path removed). So a project-level entry adds to — it does not replace — the global one.

And two modes, each with its own trio of files:

- **Clipboard mode** (Control+Option+Space) — uses `contextFile`, `vocabularyFile`, `instructionsFile`
- **Shell-command mode** (Control+Option+S) — uses `shellContextFile`, `shellVocabularyFile`, `shellInstructionsFile`

## How the files work

Shama has multiple pipelines that consume different files:

- **Transcription step (OpenAI)** — uses the relevant `vocabularyFile` (or `shellVocabularyFile` in shell mode). A flat list of terms sent as hints for accurate word recognition. Affects what words the transcriber produces.
- **Cleanup step (Claude, clipboard mode)** — uses `contextFile` (project knowledge) and `instructionsFile` (how-to formatting rules). Affects how transcribed text is corrected and structured.
- **Shell-command generation (Claude, shell mode)** — uses `shellContextFile` (background for command generation) and `shellInstructionsFile` (rules for command output). Affects what shell command is produced.

When adding entries, identify which stage is failing:

- Wrong word recognized → vocabulary (or shell-vocabulary)
- Right word, wrong formatting / structure → context or instructions
- Shell command wrong style, tool choice, or OS flags → shell-context or shell-instructions

## Step 1: Determine the target level and locate the files

First, determine whether the user wants to update **project-level** or **global-level** files.

**Use global-level** if the user explicitly mentions "global", "global context", "global config", "global Shama context", or `~/.voice/`. Otherwise default to **project-level**.

### Global-level resolution

1. Read `~/.voice/voice.json` to find any of the six file keys: `contextFile`, `vocabularyFile`, `instructionsFile`, `shellContextFile`, `shellVocabularyFile`, `shellInstructionsFile`
2. Resolve all configured paths relative to `~/.voice/`
3. If `~/.voice/voice.json` does not exist or has none of these keys configured, inform the user that global Shama config has no context files yet. Offer to create one — see Step 4 ("Creating a missing file")
4. Read the contents of any files that exist

### Project-level resolution (default)

1. Read `voice.json` in the current directory to find any of the six file keys above
2. If `voice.json` does not exist, check for the conventional filenames in the current directory:
   - `voice-context.md`, `voice-vocabulary.md`, `voice-instructions.md`
   - `voice-shell-context.md`, `voice-shell-vocabulary.md`, `voice-shell-instructions.md`
3. If no project files exist at all, inform the user that Shama is not configured for this project and suggest running `/shama-init-config` first. Stop here.
4. Read the contents of any files that exist

## Step 2: Determine the mode and what to add

Determine which **mode** the user is targeting:

- **Clipboard mode** (default) — for Control+Option+Space dictation that becomes prose, notes, code comments, document text, etc.
- **Shell-command mode** — when the user mentions "shell", "shell mode", "shell command", "terminal", "Control+Option+S", or shell-mode dictation

Then determine what the user wants to add. Common cases:

- **Misheard word or phrase** — the transcriber consistently gets a word wrong. Example: "Zod" transcribed as "god", "CLAUDE.md" transcribed as "cloud.md"
- **New terminology** — a project term, library, or acronym that needs to be recognized
- **Naming convention** — a specific identifier pattern or casing rule that should be preserved
- **Cleanup formatting rule** — how cleaned text should be formatted (lists, code preservation, bullet style, etc.)
- **Shell-command behavior** — preferences for generated commands (preferred tools, output style, OS-specific flags)
- **Project context** — background information for cleanup or shell-command generation

If the user's request is vague, ask for:

- The word or phrase as it was **incorrectly** transcribed (or the wrong shell command)
- The **correct** form it should produce
- Optionally, a brief definition or context note

## Step 3: Determine which file(s) to update

### Clipboard mode (Control+Option+Space)

| Scenario | Vocabulary file | Context file | Instructions file |
|---|---|---|---|
| **Misheard term** | Add correct term | Add term with description and common mishearings | — |
| **New terminology** | Add correct term | Add term with description | — |
| **Naming convention** | — | Add to Naming Conventions section | — |
| **Project context** | — | Add to appropriate section | — |
| **Cleanup formatting / style rule** | — | — | Add rule |

### Shell-command mode (Control+Option+S)

| Scenario | Shell vocabulary file | Shell context file | Shell instructions file |
|---|---|---|---|
| **Misheard term in shell request** | Add correct term | Add term with description | — |
| **Tool or binary name** | Add correct term | Add binary description if non-obvious | — |
| **Preferred tool / style** (e.g., "prefer `rg` over `grep`") | — | — | Add rule |
| **OS-specific behavior** | — | — | Add rule |
| **Project shell context** (paths, common workflows) | — | Add to appropriate section | — |

## Step 4: Add the entries

### Vocabulary file entries (clipboard or shell)

Add one term per line. No markdown formatting, no descriptions — just the bare term with correct spelling and capitalization.

```
Zod
CLAUDE.md
ResolvedFileRef
```

### Context file entries (clipboard mode)

Add to the appropriate section, following the existing format:

- **Technologies**: `- {Name} ({brief description})`
- **Terminology**: `- **{Term}** - {brief definition or correction note}`
- **Naming Conventions**: `- {convention description}`

When adding a misheard word correction, include the common misheard form in the definition to help Claude recognize and correct it:

```markdown
- **Zod** - Runtime validation library (not "god", "sod", or "zawed")
- **lgit** - Git wrapper for .local directory (not "legit" or "l-git")
```

### Instructions file entries (clipboard mode)

The instructions file controls *how* cleanup is performed. Add formatting rules, style preferences, or behavioral overrides — not project knowledge.

```markdown
- Always preserve fenced code blocks verbatim — do not edit, reformat, or summarize their contents
- Prefer hyphen-style bullet points (`-`) over asterisks (`*`)
- When listing steps, use numbered lists; when listing options, use bullets
```

### Shell-context file entries (shell mode)

Background information for the shell-command generator: project paths, repo layout, preferred tools, common workflows. Same structural format as the clipboard-mode context file but oriented toward shell usage.

### Shell-instructions file entries (shell mode)

Rules for shell-command output:

```markdown
- Prefer `rg` (ripgrep) over `grep` for content searches
- Prefer `fd` over `find` when available
- Quote paths that may contain spaces using double quotes
```

### Creating a missing file

If the user wants to add an entry but the target file does not yet exist:

1. Pick a conventional filename relative to the project root (or `~/.voice/` for global):
   - `voice-instructions.md`
   - `voice-shell-context.md`, `voice-shell-vocabulary.md`, `voice-shell-instructions.md`
2. Create the file with a minimal scaffold (top-level heading appropriate to the file's role, then the first entry)
3. Register the new file path in the relevant `voice.json`:
   - Project: add the corresponding key to the project's `voice.json` (create `voice.json` if it does not exist)
   - Global: add the key to `~/.voice/voice.json` (create it if it does not exist)

### Guidelines

- Keep each context / instructions file concise — every relevant file is injected into the prompt for its pipeline
- For project-level files, aim for under ~80 lines per file
- If a file is approaching the limit, suggest removing less relevant entries before adding new ones
- Match the formatting style of existing entries in each file
- Include exact capitalization for each term
- For acronyms, include the expansion in the context file
- Omit widely known terms (JavaScript, React, Git) unless they are specifically being misheard

## Step 5: Confirm

After editing, display:

- Whether the **project-level** or **global-level** files were updated (and their paths)
- Which **mode** the change targets (clipboard or shell)
- Which file(s) were modified (vocabulary, context, instructions, or their shell-mode equivalents)
- The specific entries that were added
- If a `voice.json` (`~/.voice/voice.json` for global) was updated to register a new file, mention that
- A brief reminder: changes take effect on the next Shama recording (Shama captures file contents per recording — no app restart needed)
