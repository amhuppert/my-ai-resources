---
name: shama-init-config
description: "Initialize Shama voice-to-text config for the current project: create voice.json, voice-vocabulary.md, voice-context.md, and register the project in Shama's registry.toml."
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, Agent
---

# Initialize Shama project config

Create `voice.json`, `voice-vocabulary.md`, and `voice-context.md` in the current project directory, then register the project in Shama's `registry.toml`. This scaffolds the clipboard-mode baseline (`Ctrl+Opt+Space`); cleanup instructions and shell-command mode (`Ctrl+Opt+S`) can be added later via `/shama-add-context`.

Shama runs in the background on macOS (and Linux) and switches between registered projects from its tray menu. Its transcription step (OpenAI) reads `voice-vocabulary.md` as term hints; its clipboard cleanup step (Claude) reads `voice-context.md` plus the vocabulary file.

## 1. Gather project terminology

Inspect existing files (skip any that do not exist):

- `README.md`, `package.json`, `Cargo.toml`, `pyproject.toml`, or equivalent manifests
- `AGENTS.md`, `CLAUDE.md`, and project config files
- Source headers, exported types, and domain identifiers likely to be misspelled in dictation
- Project commands, skills, and agents so spoken names transcribe accurately:
  - `.claude/commands/*.md` (frontmatter `name` and `description`)
  - Every plugin matching `**/.claude-plugin/plugin.json` (skip `node_modules`, `dist`, and build output): scan `{plugin-dir}/skills/*/SKILL.md` and `{plugin-dir}/agents/**/*.md` (fallback to filename without `.md` if `name` is absent)

Collect: a 1 to 2 sentence project summary, exact-cased technologies/libraries (e.g. `Bun`, `Commander.js`), non-obvious domain terms and acronyms, casing conventions, frequent abstractions, and available commands/skills/agents.

## 2. Write `voice-vocabulary.md` and `voice-context.md`

### `voice-vocabulary.md`

Plain text, one bare term per line, exact capitalization, zero markdown or descriptions. Include technologies, key types/functions, acronyms, slash command names (`/shama-init-config`), and words speech recognition tends to mishear. Skip ubiquitous words (`JavaScript`, `React`, `Git`) unless they have unusual project casing.

### `voice-context.md`

Use this compact layout (aim for under 80 lines across the project sections because the whole file is injected into every cleanup prompt; the Commands & Skills section may run longer as needed):

```markdown
# Voice Context

## Project

{1 to 2 sentence project description}

## Technologies

- {Exact Name} ({short role})

## Terminology

- **{Term}** - {brief definition, acronym expansion, or common mishearing}

## Naming Conventions

- {Casing rules and exact identifier conventions}

## Commands & Skills

{Group by Commands, Skills, Agents (omit empty groups). Format: **/{name}** - one-line description.}
```

## 3. Write `voice.json`

```json
{
  "contextFile": "./voice-context.md",
  "vocabularyFile": "./voice-vocabulary.md"
}
```

Any omitted key falls back to `~/.voice/voice.json`, then Shama defaults. Optional keys (not scaffolded here; add later with `/shama-add-context` when needed): `instructionsFile`, `shellContextFile`, `shellVocabularyFile`, `shellInstructionsFile`, `claudeModel`, `shellClaudeModel`, `maxRecordingDuration`, `beepEnabled`, and `notificationEnabled`.

## 4. Register in `registry.toml`

Shama only discovers projects listed in its app registry:

- **macOS:** `~/Library/Application Support/Shama/registry.toml`
- **Linux:** `$XDG_CONFIG_HOME/shama/registry.toml` (fallback `~/.config/shama/registry.toml`)

1. Derive `id` (unique kebab-case, default to directory name), `name` (tray display name from manifest or title-cased directory name), and `project_root` (absolute or `~/` path to cwd; Shama resolves `<project_root>/voice.json`).
2. Read the existing `registry.toml` if present (otherwise create parent directories and the file).
3. If an entry already matches this `id`, `project_root`, or `voice_json`, do not add a duplicate (Shama ignores duplicate `id`s and logs a warning). Tell the user it is already registered and offer to update `name` if it changed.
4. Otherwise append:
   ```toml
   [[project]]
   id = "my-app"
   name = "My App"
   project_root = "/path/to/my-app"
   ```
   Each entry takes exactly one of `project_root` or `voice_json` (use `voice_json` only when `voice.json` sits outside the project root).

Shama polls `registry.toml` by mtime every ~5 seconds while idle, so the new project appears in the tray menu without restarting the app.

## 5. Confirm

Done when `voice-vocabulary.md`, `voice-context.md`, and `voice.json` are written and `registry.toml` contains a non-duplicate entry for this project. Show the generated vocabulary/context content, the `[[project]]` entry (or existing registration), note that cleanup instructions and shell mode can be added later via `/shama-add-context`, and remind the user to select the project in Shama's tray menu before recording with `Ctrl+Opt+Space`.
