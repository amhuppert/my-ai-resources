---
name: shama-add-context
description: Add terms, project context, or formatting rules to Shama
  voice-to-text files for clipboard mode (Ctrl+Opt+Space) or shell-command mode
  (Ctrl+Opt+S), at project or global level.
---

# Add Shama context

Update Shama's vocabulary, context, or instructions files when speech transcription mishears terms, clipboard cleanup formats text poorly, or shell-command mode outputs the wrong style of command.

## How Shama loads these files

Shama is a resident macOS voice-to-text app that reads a global `~/.voice/voice.json` and a per-project `voice.json`. For every file key, Shama merges global entries first and appends project entries (deduplicated by resolved path), so project entries add to global ones rather than replacing them.

Two modes, three files each:

| Mode | Shortcut | `voice.json` keys |
| --- | --- | --- |
| Clipboard (default) | `Ctrl+Opt+Space` | `contextFile`, `vocabularyFile`, `instructionsFile` |
| Shell command | `Ctrl+Opt+S` | `shellContextFile`, `shellVocabularyFile`, `shellInstructionsFile` |

Match the failing stage to the right file type:

- **Wrong word recognized** (OpenAI transcription) -> vocabulary file (flat list of term hints).
- **Right word, wrong cleanup or project knowledge** (Claude clipboard cleanup) -> `contextFile` (domain facts/terminology) or `instructionsFile` (formatting/behavior rules).
- **Wrong shell tool, OS flag, or layout** (Claude shell generation) -> `shellContextFile` (project paths/workflows) or `shellInstructionsFile` (command output rules).

## 1. Locate target level and files

Use **global-level** only when the user explicitly says "global", "global config", "global context", or `~/.voice/`. Otherwise default to **project-level**.

- **Global-level:** read `~/.voice/voice.json`, resolve configured paths relative to `~/.voice/`, and read any existing target files. If `~/.voice/voice.json` is missing or defines none of the six keys, tell the user and offer to create the needed file(s) (see Step 3).
- **Project-level:** read `./voice.json` for configured keys. If `./voice.json` does not exist, check the conventional filenames in the current directory (`voice-context.md`, `voice-vocabulary.md`, `voice-instructions.md`, `voice-shell-context.md`, `voice-shell-vocabulary.md`, `voice-shell-instructions.md`). If no Shama project files exist at all, tell the user Shama is not configured here, suggest running `/shama-init-config` first, and stop.

## 2. Pick mode and target file(s)

Default to clipboard mode. Switch to shell-command mode when the user mentions "shell", "terminal", `Ctrl+Opt+S`, or shell-mode dictation.

Ask for clarification only if the request is too vague to act on (ask for the misheard word or bad command, the expected output, and any brief context).

**Clipboard mode:**

| Scenario | Vocabulary | Context | Instructions |
| --- | --- | --- | --- |
| Misheard term | Add exact term | Add term + definition + common mishearings | Skip |
| New terminology | Add exact term | Add term + definition | Skip |
| Naming convention | Skip | Add under Naming Conventions | Skip |
| Project knowledge | Skip | Add to matching section | Skip |
| Formatting or cleanup rule | Skip | Skip | Add rule |

**Shell-command mode:**

| Scenario | Shell vocabulary | Shell context | Shell instructions |
| --- | --- | --- | --- |
| Misheard term in shell dictation | Add exact term | Add term + definition | Skip |
| Tool or binary name | Add exact term | Add description if non-obvious | Skip |
| Preferred tool, style, or OS flag | Skip | Skip | Add rule |
| Project paths or shell workflows | Skip | Add to matching section | Skip |

## 3. Edit or create the file(s)

- **Vocabulary (`voice-vocabulary.md` / `voice-shell-vocabulary.md`):** one bare term per line with exact spelling and capitalization, no markdown or descriptions:
  ```text
  Zod
  CLAUDE.md
  ResolvedFileRef
  ```
- **Context (`voice-context.md` / `voice-shell-context.md`):** match the existing section style (`Technologies`, `Terminology`, `Naming Conventions`). Include common mishearings on correction notes:
  ```markdown
  - **Zod** - Runtime validation library (not "god", "sod", or "zawed")
  - **lgit** - Git wrapper for .local directory (not "legit" or "l-git")
  ```
- **Instructions (`voice-instructions.md` / `voice-shell-instructions.md`):** behavioral and formatting rules only, never project facts (e.g., `- Preserve fenced code blocks verbatim`, `- Prefer rg over grep`).
- **Missing target file:** create it using the conventional name relative to the project root (or `~/.voice/` for global) with a minimal heading plus the new entry, then register its path under the matching key in `voice.json` (creating `voice.json` if needed).

Keep context and instructions files compact because Shama injects them on every recording. Aim for under ~80 lines on project-level files (suggest pruning stale entries if a file approaches that), expand acronyms in context files, and skip ubiquitous terms (`JavaScript`, `React`, `Git`) unless they are actively being misheard.

## 4. Confirm

Done when the target file(s) (and `voice.json`, if a new file was created) have been updated cleanly. Report:

- Level (project or global), mode (clipboard or shell), and modified file path(s)
- Exact entries added (and whether `voice.json` was updated)
- Note that changes take effect on the next recording with no app restart needed
