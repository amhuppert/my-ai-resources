---
inclusion: always
---

# Project Structure

## Organization Philosophy

Feature-grouped directories at the top level, with shared TypeScript tooling compiled by Bun. Installation splits between user-level (home directory) and project-level (current directory) targets. AI tool configurations (Claude Code, Cursor) live in their own directories, compiled and installed separately.

## Directory Patterns

### `claude/` - Claude Code Plugin Source
Plugin definitions with standardized internal structure. Each plugin contains:
- `.claude-plugin/plugin.json` - Plugin manifest
- `skills/<skill-name>/SKILL.md` - Skill definitions
- `hooks/` - Event-driven shell scripts (optional)
- `agents/` - Agent definitions (optional)
- `scripts/` - Supporting TypeScript utilities (optional)

Primary plugin: `ai-resources-plugin/` (installed via `claude` CLI plugin system).

### `cursor/` - Cursor IDE Configuration Source
Rules (`.mdc` files with YAML frontmatter) and commands installed to target projects' `.cursor/` directory.

### `agent-docs/` - AI Agent Reference Documentation
Markdown reference docs installed to `~/.claude/agent-docs/`. Includes code standards, workflow documentation, and tool references.

### `typescript/` - Core TypeScript Tooling
Library code (`lib/`) and CLI scripts (`scripts/`) compiled to standalone executables in `dist/`. Entry point: `scripts/ai.ts` providing the `ai` CLI.

### `scripts/` - Shell Utilities
Standalone bash scripts installed to `~/.local/bin/`. Self-contained, no build step required.

### `cursor-shortcuts-mcp/` - MCP Server
TypeScript MCP server for keyboard shortcut management, compiled to `bin/` and globally linked via `bun link`.

### `memory-bank-mcp/` - MCP Server
TypeScript MCP server for structured memory bank management (objectives, features, tasks, tickets). Compiled to `bin/` and globally linked via `bun link`.

### `voice-to-text/` - Voice Transcription Tool
Standalone voice-to-text application with HTTP server mode and hotkey-driven recording (F9/F10). Uses OpenAI transcription API. Compiled to `dist/`.

### `notes-for-humans/` - Reference Documentation
Workflow guides, CLI cheat sheets, and skill pattern documentation for human consumption.

### `prompts/` - Prompt Templates
Specialized prompt templates for AI instruction optimization and content generation.

### `memory-bank/` - Session Tracking
Contains `focus.md` (gitignored) for tracking current work-in-progress across AI sessions.

### `.kiro/steering/` - Project Context
Kiro SDD steering files providing persistent project context for AI agents.

## Naming Conventions

- **Files**: kebab-case (`install-user.ts`, `setup-worktree`)
- **TypeScript**: camelCase functions, PascalCase types/Zod schemas
- **Skills**: `namespace:kebab-case` (`ai-resources:commit`)
- **CLI commands**: kebab-case subcommands (`ai install`, `ai worktree`)

## Key Interfaces

### Installation Pipeline
- `typescript/lib/installer-utils.ts` - File sync, CLAUDE.md merging with comment markers
- `typescript/scripts/install-user.ts` - User-level installation (home directory)
- `typescript/scripts/install-project.ts` - Project-level installation (current directory)

### Settings Management
- `typescript/lib/claude-code-settings.ts` - Zod schemas for Claude Code settings validation

### CLAUDE.md Template
- `claude/CLAUDE-project.md` - Standard instructions template merged between `<!-- Begin standard instructions -->` / `<!-- End of standard instructions -->` comment markers
