# Codebase Document Map

**What this is:** A compact, AI-friendly directory of important files and their contents.
**Purpose:** Tell you (the agent) _where_ things live so you can decide _which files to open_ before reading them.
**Format:**

- `##` for groups (dirs/subsystems) → `###` for files (linked)
- 1–2 sentence **purpose blurb** per file OR directory
- Bullets = **structure summary** — For Markdown docs only; code files do not have the structure summary.
- **Directory-only sections:** Use `## path (Directory)` with purpose blurb when individual files aren't significant
  **Read a file when:** the blurb matches your task

## agent-docs (Directory)

Collection of instructions for AI agents. These are installed to the user-level Claude Code directory so they can be used in other projects. Reference documentation for Claude Code workflows: `claude-code-permissions.md` (tool permission syntax), `document-map-format.md` and `document-map-template.md` (document map creation), `local-files-pattern.md` (dual-repo workflow), `obsidian-context.md` (Obsidian vault interaction), and `code-standards/` (TypeScript, XState, general coding standards). Read when creating slash commands, implementing document maps, or enforcing code standards.

## cursor/rules (Directory)

A collection of Cursor IDE rules (workflows, memory management, etc.) that are installed to other projects by the project-level installer. Read when configuring Cursor workflow or creating new .mdc rules.

## claude/commands (Directory)

Custom slash commands for Claude Code that are installed to other projects by the project-level installer. Read when creating or editing custom slash commands for Claude Code.

## cursor-shortcuts-mcp (Directory)

MCP server providing AI-powered keyboard shortcut recommendations and safe keybindings.json updates for Cursor IDE.

## typescript (Directory)

TypeScript tooling for Claude Code configuration management. Core library includes `lib/claude-code-settings.ts` (Zod schemas for settings validation) and `lib/installer-utils.ts` (file sync, CLAUDE.md merging with comment markers). CLI scripts handle installation (`install-user.ts`, `install-project.ts`, `install-settings.ts`, `install-hooks.ts`), document map generation (`init-document-map.ts`), and diagnostics (`test-slash-args.ts`). All scripts compile to Bun executables in `dist/`. Read when modifying installation logic, settings schemas, or creating new CLI tools.

## scripts (Directory)

CLI utilities installed to `~/.local/bin/`: `lgit` (dual-repo git wrapper for `.local` directory), `code-tree` (directory visualizer with depth control), `read-file` (XML-formatted file reader for LLM context), and `push-main` (branch deployment utility). Read when implementing new CLI tools or understanding dual-repo workflow.

## Memory Bank

### [memory-bank/project-brief.md](memory-bank/project-brief.md)

Foundational project documentation defining the AI workflow resources ecosystem including directory structure, key components, installation procedures, and integration patterns. Read to understand project architecture and component relationships.

### [memory-bank/focus.md](memory-bank/focus.md)

Current work context tracking active development priorities. Read to understand immediate tasks and implementation approach.

## prompts (Directory)

Reusable LLM prompt templates for various tasks.
