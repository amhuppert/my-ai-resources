# Project Brief

## Overview

Centralized AI workflow resources for consistent tooling across development environments. This repository provides a complete ecosystem for enhancing AI-assisted development: Claude Code custom slash commands, Cursor IDE workflow rules, MCP servers for tool integration, and TypeScript-based configuration management.

The project operates as a "meta-repository" that installs AI development infrastructure to both user-level directories (for use across all projects) and project-level directories (for team-specific workflows). It bridges multiple AI tools (Claude Code, Cursor) with a unified set of commands, documentation standards, and workflow patterns.

Core use cases: automating git workflows with AI-aware commits, managing persistent context across AI sessions via memory banks, generating keyboard shortcuts with AI recommendations, optimizing AI instructions for token efficiency.

## Tech Stack

- **Languages**: TypeScript, Bash
- **Runtime**: Bun (for TypeScript compilation and execution)
- **Key Libraries**:
  - Zod (runtime validation and type safety)
  - @modelcontextprotocol/sdk (MCP protocol implementation)
  - openai (Responses API integration)
  - Commander.js (CLI argument parsing)
  - Eta (template rendering)
- **Build Tools**: Bun compiler (creates standalone executables)
- **File Operations**: proper-lockfile (concurrency), write-file-atomic (crash safety)

## Key Architectural Decisions

1. **Dual Repository Pattern** - Projects maintain two git repos: `.git` (team code) and `.local` (private AI configs). The `lgit` wrapper script manages the private repo while `git` handles team code. This allows personal AI configurations to be versioned without exposing them to the team.

2. **Markdown-Based Slash Commands** - Custom Claude Code commands are implemented as Markdown files with YAML frontmatter for permissions. The `allowed-tools` frontmatter uses pattern matching (e.g., `Bash(git add:*)`) for granular tool control. Commands can inject dynamic content via `` !`command` `` syntax and reference files via `@path/to/file` syntax.

3. **MCP Protocol for Tool Integration** - External tools (like keyboard shortcut recommendations) are implemented as MCP servers communicating via stdio. This provides a standard protocol for extending Claude Code and Cursor with custom capabilities.

4. **Deep Merge Settings Management** - Settings installers preserve existing user configurations by deep-merging new settings rather than overwriting. Uses Zod schemas for validation before merge to ensure type safety.

5. **Separation of User vs Project Installation** - Two distinct installers: `install-user.sh` (commands, scripts, agent-docs to home directory) and `install-project.sh` (Cursor rules, project-level configs to current directory). This allows shared tooling across projects while supporting project-specific customization.

6. **Document Map Pattern** - Separate navigation aid (document-map.md) from strategic overview (project-brief.md). Document map provides tactical file navigation; project brief provides strategic context. Reduces redundancy and improves maintainability.

7. **Bun-Compiled Executables** - TypeScript CLI tools are compiled to standalone executables in `dist/` directories. This eliminates the need for Node.js/npm in target environments and simplifies deployment.

8. **XML Tag-Based Merging** - CLAUDE.md files use XML tags (`<project-level-instructions>`, `<user-level-instructions>`) to enable safe merging of user-level and project-level instructions without conflicts.

## Key Commands

**Installation**:

- `./install-user.sh` - Install commands, scripts, and agent-docs to home directory (`~/.claude/`, `~/.local/bin/`)
- `./install-project.sh` - Install Cursor rules and project configs to current directory

**Build**:

- `cd typescript && bun run build` - Compile TypeScript tools to standalone executables in `dist/`
- `cd cursor-shortcuts-mcp && bun run build` - Compile MCP server to `bin/cursor-shortcuts-mcp`

**Utilities**:

- `code-tree [depth]` - Visualize directory structure (filters build artifacts)
- `lgit <git-command>` - Run git commands on `.local` private repository
- `read-file <path>` - Format file contents as XML for LLM context

**Document Management**:

- `/update-project-brief` - Claude Code slash command to update this file
- `/init-document-map` - Generate document map for a codebase
