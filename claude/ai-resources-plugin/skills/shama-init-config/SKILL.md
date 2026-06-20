---
name: shama-init-config
description: Initialize Shama voice-to-text config for the project — create voice.json, voice-vocabulary.md, voice-context.md, and register the project in Shama's registry.toml.
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Agent
---

# Initialize Shama Project Config

Create a local `voice.json` config, a `voice-vocabulary.md` vocabulary file, and a `voice-context.md` context file in the current directory, then register the project in Shama's app-level `registry.toml` so the app can find it. These cover the **clipboard mode** baseline (Control+Option+Space). Advanced options — cleanup instructions and shell-command mode (Control+Option+S) — are described at the bottom and can be added later via `/shama-add-context`.

Shama is the resident macOS voice-to-text app. You don't run it per-directory: it runs in the background and switches between projects you've registered in `registry.toml`, selected from its tray menu.

## How Shama uses these files

Shama has multiple pipelines that consume different files:

**Transcription step (OpenAI)** — uses `voice-vocabulary.md`. A flat list of terms sent as vocabulary hints to help the transcription model accurately recognize domain-specific words. One term per line, no descriptions or markdown structure.

**Cleanup step (Claude, clipboard mode)** — uses `voice-context.md` for project knowledge (descriptions, terminology, naming conventions). The vocabulary file is included as additional reference.

**Optional cleanup customization** — an `instructionsFile` (conventionally `voice-instructions.md`) can be added to control *how* clipboard cleanup formats text: bullet style, code preservation, structural rules.

**Optional shell-command mode (Control+Option+S)** — a separate trio of files (`shellContextFile`, `shellVocabularyFile`, `shellInstructionsFile`) controls voice-driven shell-command generation. Not scaffolded by this skill — add via `/shama-add-context` when needed.

## Step 1: Gather project information

Research the current project to collect:

1. **Project purpose** — What is being built? (1-2 sentences from README, package.json, or similar)
2. **Technologies and libraries** — Language, runtime, frameworks, key dependencies with their names exactly as written (e.g., "Bun" not "bun", "Commander.js" not "commander")
3. **Domain terminology** — Non-obvious terms, acronyms, abbreviations, or jargon found in the codebase (variable names, function names, class names, config keys that a speech transcriber might misspell)
4. **Naming conventions** — camelCase, PascalCase, snake_case patterns and specific examples of important identifiers
5. **Key concepts** — Architectural patterns, custom abstractions, or domain entities that appear frequently
6. **Claude Code commands, skills, and agents** — All slash commands, plugin skills, and agents available in the project. The user may reference these by name while dictating.

Sources to check (read what exists, skip what doesn't):

- `README.md`, `package.json`, `Cargo.toml`, `pyproject.toml`, or equivalent
- `CLAUDE.md`, `.kiro/steering/product.md`, `.kiro/steering/tech.md`
- Source file headers and type definitions for domain terminology
- Config files for tool names and conventions

For Claude Code commands, skills, and agents, scan these locations:

- `.claude/commands/*.md` — Project-level slash commands. Read YAML frontmatter for `name` and `description`.
- Find plugin directories by globbing for `**/.claude-plugin/plugin.json` (skip `node_modules`, `dist`, and other build artifact directories). For each plugin found:
  - `{plugin-dir}/skills/*/SKILL.md` — Plugin skills. Read YAML frontmatter for `name` and `description`.
  - `{plugin-dir}/agents/**/*.md` — Plugin agents. Read YAML frontmatter for `name` and `description`. Use the filename (without `.md`) as the agent name if no `name` field exists.

## Step 2a: Generate voice-vocabulary.md

Write `voice-vocabulary.md` in the current directory. This file is a flat list of terms, one per line, with no markdown structure, headers, or descriptions. Include:

- Technology and library names (exact spelling and capitalization)
- Key type names, function names, and identifiers from the codebase
- Acronyms and abbreviations
- Slash command names (e.g., `/shama-init-config`)
- Domain terms that the transcription model might not recognize

Example:

```
TypeScript
Zod
Bun
Commander.js
Claude Code
CLAUDE.md
ResolvedFileRef
ConfigSchema
/shama-init-config
/shama-add-context
```

Guidelines:

- One term per line, no descriptions
- Include correct capitalization
- Omit widely known terms (JavaScript, React, Git) unless they have unusual capitalization in the project
- Keep focused on terms a transcription model might mishear or misspell

## Step 2b: Generate voice-context.md

Write `voice-context.md` in the current directory with the following structure:

```markdown
# Voice Context

## Project

{1-2 sentence description of the project}

## Technologies

{Bulleted list of technologies, libraries, and tools with exact spelling. Include the name as it should appear in text.}

## Terminology

{Bulleted list of project-specific terms, acronyms, and jargon. Format: **Term** - brief definition. Focus on words a speech transcriber is likely to mishear or misspell.}

## Naming Conventions

{Brief note on casing conventions and important identifiers that should be preserved exactly.}

## Claude Commands & Skills

{List all slash commands, skills, and agents available in the project. Group by type (Commands, Skills, Agents). Format each as: **/{name}** - one-line description.}
```

Guidelines for the context file:

- Keep it concise — aim for under 80 lines for project context sections (Technologies, Terminology, Naming Conventions). The Claude Commands & Skills section may exceed this as needed. The entire file is injected into every cleanup prompt
- Focus on terms that are **ambiguous when spoken aloud** (e.g., "Zod" might be transcribed as "zod", "god", or "sod")
- Include the correct capitalization for each term
- List acronyms with their expansions
- Omit widely known terms (JavaScript, React, Git) — only include terms the model might not know or might mishear

## Step 3: Generate voice.json

Write `voice.json` in the current directory:

```json
{
  "contextFile": "./voice-context.md",
  "vocabularyFile": "./voice-vocabulary.md"
}
```

This config sets the context and vocabulary file paths for clipboard mode (Control+Option+Space). Any keys not set here fall back to the global config at `~/.voice/voice.json`, then to Shama's built-in defaults.

Additional optional keys (not scaffolded by default):

- `instructionsFile` — formatting rules for clipboard cleanup (how to clean up the text)
- `shellContextFile`, `shellVocabularyFile`, `shellInstructionsFile` — for voice-driven shell-command mode (Control+Option+S)
- `claudeModel` / `shellClaudeModel` — override the cleanup model for each mode
- `maxRecordingDuration` (seconds), `beepEnabled`, `notificationEnabled` — per-project scalar overrides (local wins over global)

Add the file-key options via `/shama-add-context` if and when needed.

## Step 4: Register the project in Shama's registry

Shama only sees projects listed in its app-level registry. Add this project to it.

1. Locate the registry file:
   - macOS: `~/Library/Application Support/Shama/registry.toml`
   - Linux: `$XDG_CONFIG_HOME/shama/registry.toml` (fallback `~/.config/shama/registry.toml`)
2. Derive the entry fields:
   - `id` — a unique, stable, kebab-case identifier. Default to the project directory name (e.g., `my-ai-resources`).
   - `name` — a human-readable name shown in the tray menu (e.g., from `package.json` `name`, the repo name, or a title-cased directory name).
   - `project_root` — the **absolute** path to the current directory (Shama resolves `<project_root>/voice.json`). Use `~/`-prefixed or absolute; `~` and env vars are expanded.
3. Read the existing `registry.toml` if it exists:
   - If a `[[project]]` entry already points at this project (same `id`, or a `project_root`/`voice_json` resolving here), do **not** add a duplicate. Tell the user it's already registered; offer to update its `name` if it changed. (Shama ignores duplicate `id`s — it keeps the first and logs a warning.)
   - If the file or its parent directory does not exist, create them (`mkdir -p` the parent, then create the file).
4. Append a `[[project]]` entry:
   ```toml
   [[project]]
   id = "my-ai-resources"
   name = "My AI Resources"
   project_root = "/Users/alex/github/my-ai-resources"
   ```
   Each entry must specify **exactly one** of `project_root` or `voice_json`. Use `project_root` here since `voice.json` lives at the project root. Use `voice_json = "/abs/path/voice.json"` instead only when the config lives elsewhere.

Shama polls `registry.toml` by mtime every ~5 seconds while idle, so the project appears in the tray menu within seconds — no app restart needed.

## Step 5: Confirm

After creating the files and registering the project, display:

- The generated `voice-vocabulary.md` content
- The generated `voice-context.md` content
- Confirmation that `voice.json` was created
- Confirmation that the project was registered in `registry.toml` (show the `[[project]]` entry), or that it was already registered
- A note that cleanup instructions and shell-mode files are not scaffolded — point to `/shama-add-context` for adding them later
- Remind the user: select this project from Shama's tray menu to make it active, then record with Control+Option+Space; the project shows up within a few seconds of registering (no restart needed)
