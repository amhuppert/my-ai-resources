---
name: init-voice-config
description: This skill should be used when the user wants to initialize voice-to-text configuration for the current project. Creates a voice.json config file and generates a project-specific context file to improve transcription cleanup quality.
allowed-tools: Read, Glob, Grep, Write(voice.json), Write(voice-context.md), Agent
---

# Initialize Voice-to-Text Project Config

Create a local `voice.json` config and a `voice-context.md` context file in the current directory. The context file is the primary deliverable — it provides project-specific knowledge to the Claude cleanup step so transcribed text is corrected accurately.

## How voice-to-text uses the context file

During cleanup, the transcribed text is sent to Claude with a prompt that includes:

```
Project Context:
<context>
{contents of the context file}
</context>
```

Claude uses this context to:

- Correctly spell project-specific terms, library names, and acronyms
- Understand domain vocabulary that may be misheard by the transcriber
- Recognize technical terms and format them appropriately (e.g., camelCase, PascalCase)

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

## Step 2: Generate voice-context.md

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
  "contextFile": "./voice-context.md"
}
```

This config sets only the context file path. All other settings inherit from the global config at `~/.config/voice-to-text/config.json`.

## Step 4: Confirm

After creating both files, display:

- The generated `voice-context.md` content
- Confirmation that `voice.json` was created
- Remind the user: run `voice-to-text` from this directory to use the local config
