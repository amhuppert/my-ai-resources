# Project: my-ai-resources

## Project

Centralized AI workflow resources repository providing Claude Code slash commands, Cursor IDE rules, MCP servers, and TypeScript configuration management tools for consistent AI-assisted development across projects.

## Technologies

- Bun (JavaScript/TypeScript runtime and bundler)
- Zod (runtime validation library)
- @modelcontextprotocol/sdk (MCP protocol SDK)
- Commander.js (CLI argument parsing)
- Eta (template rendering engine)
- SQLite (database for memory-bank-mcp)
- nanoid (unique ID generator)
- jsonc-parser (JSON with comments parser)
- proper-lockfile (file locking library)
- write-file-atomic (atomic file writes)
- clipboardy (clipboard access library)
- OpenAI SDK (for Responses API integration)

## Terminology

- **MCP** - Model Context Protocol, a protocol for AI tool integration via stdio servers
- **CLAUDE.md** - Project-level instruction file for Claude Code (not "cloud.md")
- **lgit** - Custom git wrapper script for the dual-repo `.local` directory pattern (not "legit")
- **mdc** - File extension for Cursor IDE rules (`.mdc` files)
- **frontmatter** - YAML metadata block at the top of markdown/mdc files
- **memory bank** - Persistent context files (project-brief.md, focus.md) for AI sessions
- **deep merge** - Settings installation strategy that preserves existing config values
- **worktree** - Git worktree for parallel development sessions
- **stdio** - Standard I/O transport used by MCP servers
- **slash commands** - Custom Claude Code commands invoked with `/command-name` syntax
- **alwaysApply** - Cursor rule frontmatter flag for rules that load on every request
- **code-tree** - CLI utility for directory visualization with depth control
- **read-file** - CLI utility that formats files as XML for LLM context
- **push-main** - CLI utility for branch deployment
- **ai install** - Main CLI command with `--scope user` and `--scope project` flags
- **init-document-map** - Command to generate a document map for codebase navigation
- **Eta** - Template engine (not "ETA" the acronym for estimated time of arrival)

## Naming Conventions

- camelCase for TypeScript functions and variables (e.g., `installUser`, `deepMerge`, `claudeCodeSettings`)
- PascalCase for TypeScript types and Zod schemas (e.g., `ClaudeSettings`, `McpServer`)
- kebab-case for file names, CLI commands, and MCP server names (e.g., `memory-bank-mcp`, `cursor-shortcuts-mcp`, `install-user.ts`)
- Hierarchical slugs use forward slashes: `feature-x/sub-feature-y`
