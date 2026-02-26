---
name: init-voice-config
description: This skill should be used when the user wants to initialize voice-to-text configuration for the current project. Creates a voice.json config file and generates project-specific vocabulary and context files to improve transcription and cleanup quality.
allowed-tools: Read, Glob, Grep, Write(voice.json), Write(voice-context.md), Write(voice-vocabulary.md), Agent
---

# Initialize Voice-to-Text Project Config

Create a local `voice.json` config, a `voice-vocabulary.md` vocabulary file, and a `voice-context.md` context file in the current directory.

## How voice-to-text uses these files

The voice-to-text tool has two steps, each using different files:

**Transcription step (OpenAI)** — Uses `voice-vocabulary.md` only. This file is a flat list of terms sent as vocabulary hints to help the transcription model accurately recognize domain-specific words. It should contain only terms, one per line, with no descriptions or markdown structure.

**Cleanup step (Claude)** — Uses `voice-context.md` and `voice-vocabulary.md`. The context file provides rich project knowledge (descriptions, terminology definitions, naming conventions) to help Claude correctly format and clean up the transcribed text. The vocabulary file is included as additional reference.

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
- `CLAUDE.md`, `document-map.md`, `memory-bank/project-brief.md`
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
- Slash command names (e.g., `/init-voice-config`)
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
/init-voice-config
/add-voice-context
```

Guidelines:

- One term per line, no descriptions
- Include correct capitalization
- Omit widely known terms (JavaScript, React, Git) unless they have unusual capitalization in the project
- Keep focused on terms a transcription model might mishear or misspell

## Step 2b: Generate voice-context.md

Write `voice-context.md` in the current directory with the following structure:

```markdown
# Voice-to-Text Context

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

This config sets the context and vocabulary file paths. All other settings inherit from the global config at `~/.config/voice-to-text/config.json`.

## Step 4: Confirm

After creating all three files, display:

- The generated `voice-vocabulary.md` content
- The generated `voice-context.md` content
- Confirmation that `voice.json` was created
- Remind the user: run `voice-to-text` from this directory to use the local config
