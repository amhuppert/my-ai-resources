# Codebase Document Map

**What this is:** A compact, AI-friendly directory of important files and their contents.
**Purpose:** Tell you (the agent) _where_ things live so you can decide _which files to open_ before reading them.
**Format:**

- `##` for groups (dirs/subsystems) → `###` for files (linked)
- 1–2 sentence **purpose blurb** per file
- Bullets = **structure summary** — docs use headings; code lists major exported symbols
  **Read a file when:** the blurb matches your task, a listed symbol/route/type is needed, or details exceed the summary.

## Core Infrastructure

### [agent-docs/claude-code-permissions.md](agent-docs/claude-code-permissions.md)

Comprehensive reference for Claude Code tool-specific permission syntax, enabling fine-grained control over what actions slash commands can perform through YAML frontmatter allowed-tools patterns.

- Supported Claude Code Tools - Complete tool catalog with permission requirements
- Tool-Specific Permission Rules Syntax - Pattern matching format (ToolName(pattern))
- Bash Tool Permissions - Exact match and prefix match with wildcard support
- Read & Edit Tool Permissions - Gitignore-style path patterns for file operations
- WebFetch Tool Permissions - Domain-specific restrictions
- MCP (Model Context Protocol) Tool Permissions - Server-level and tool-level matching

### [cursor/rules/memory-bank.mdc](cursor/rules/memory-bank.mdc)

Memory bank architecture specification defining hierarchical file structure (project-brief → productContext/systemPatterns/techContext → activeContext → progress) that provides persistent context across Cursor sessions.

- Memory Bank Structure - Hierarchical file dependency diagram
  - Core Files (Required) - Six mandatory files (project-brief, productContext, activeContext, systemPatterns, techContext, progress)
  - Additional Context - Optional files for complex features/integrations
- Integration with Core Workflow - When to read/update memory files
  - Research Mode - Must read ALL memory files at task start
  - Act Mode Memory Updates - Integrated workflow diagram
- Memory Bank Updates - Automatic update timing (start/end of Act mode)
- Project Intelligence (.cursor/rules) - Learning journal for project patterns

### [cursor/rules/000-cursor-rules.mdc](cursor/rules/000-cursor-rules.mdc)

Meta-system defining rule creation framework with naming conventions, glob patterns, frontmatter structure, and AI optimization guidelines for efficient Cursor rule authoring.

- Core Structure - MDC template with frontmatter and body sections
- File Organization - Location, naming prefixes (0XX-9XX), glob pattern examples
  - Naming Convention - Prefix-based categorization system
  - Glob Pattern Examples - Common patterns for different file types
- Required Fields - Frontmatter (description, globs) and body elements
  - Frontmatter - ACTION TRIGGER OUTCOME format specification
  - Body - Version, context, requirements, examples structure
- Formatting Guidelines - Concise markdown with limited XML tags
- AI Optimization Tips - Deterministic format, examples, token efficiency
- AI Context Efficiency - Character limits, hierarchy, information density

### [claude/commands/commit.md](claude/commands/commit.md)

Smart git commit slash command with main branch protection, automated commit message generation following project conventions, and context-aware analysis of staged changes.

### [claude/commands/update-project-brief.md](claude/commands/update-project-brief.md)

Parallel research-based project brief updater using Task tool for one-round multi-area analysis, enforcing actionable file linking format with context annotations for maintainable documentation.

## MCP Server

### [cursor-shortcuts-mcp/src/server.ts](cursor-shortcuts-mcp/src/server.ts)

MCP protocol entry point that registers two tools: `recommend-shortcuts` (AI-powered shortcut suggestions) and `update-shortcut` (safe keybindings.json updates). Handles stdio transport, error categorization (OpenAI/File/Keybindings), and structured JSON responses.

### [cursor-shortcuts-mcp/src/lib/openai.ts](cursor-shortcuts-mcp/src/lib/openai.ts)

OpenAI Responses API integration with exponential backoff retry logic (max 3 attempts). Calls prompt ID `pmpt_68c0898bb23081978687ee5fdf5f690d06a197956797278f` with frequency/task/OS/existing shortcuts as variables. Validates JSON response against Zod schema and handles rate limits, server errors, and network failures.

### [cursor-shortcuts-mcp/src/lib/file-ops.ts](cursor-shortcuts-mcp/src/lib/file-ops.ts)

Atomic keybindings.json read/write operations with proper-lockfile for concurrency control and write-file-atomic for crash safety. Creates timestamped backups before writes, parses JSONC (comments allowed), merges entries detecting conflicts, and automatically rolls back on errors.

### [cursor-shortcuts-mcp/src/lib/keybindings.ts](cursor-shortcuts-mcp/src/lib/keybindings.ts)

Cross-platform path resolution for Cursor's keybindings.json file. Returns platform-specific paths: macOS (`~/Library/Application Support/Cursor/User/keybindings.json`), Windows (`%APPDATA%\Cursor\User\keybindings.json`), Linux (`~/.config/Cursor/User/keybindings.json`). Includes OS name normalization for OpenAI API calls.

### [cursor-shortcuts-mcp/src/lib/types.ts](cursor-shortcuts-mcp/src/lib/types.ts)

TypeScript interfaces and custom error classes for the MCP server. Defines `KeybindingEntry`, `ShortcutRecommendation`, `ShortcutRecommendationResponse`, and `OpenAIRequestVariables`. Exports three error types: `KeybindingsError`, `FileOperationError`, `OpenAIError` with optional cause chaining.

### [cursor-shortcuts-mcp/src/utils/validation.ts](cursor-shortcuts-mcp/src/utils/validation.ts)

Zod schemas for runtime validation of MCP tool inputs and OpenAI API responses. Defines schemas for `RecommendShortcutsInput`, `UpdateShortcutInput`, `KeybindingEntry`, and `ShortcutRecommendationResponse`. Exports TypeScript types via `z.infer<>` for type safety.

### [cursor-shortcuts-mcp/package.json](cursor-shortcuts-mcp/package.json)

Package configuration for the MCP server with dependencies: `@modelcontextprotocol/sdk` (MCP protocol), `openai` (Responses API), `proper-lockfile` (concurrency), `write-file-atomic` (crash safety), `jsonc-parser` (comment-aware JSON), and `zod` (validation). Build script compiles to standalone Bun executable at `bin/cursor-shortcuts-mcp`.

### [cursor-shortcuts-mcp/tsconfig.json](cursor-shortcuts-mcp/tsconfig.json)

TypeScript configuration targeting ES2022 with ESNext modules and bundler resolution. Enables strict mode, Bun-specific settings (`allowImportingTsExtensions`, `noEmit`), and includes all files in `src/` while excluding `node_modules` and `bin/`.

## TypeScript Tooling

### [typescript/lib/claude-code-settings.ts](typescript/lib/claude-code-settings.ts)

Zod validation schemas and TypeScript types for Claude Code settings.json (permissions, hooks, environment configuration). Defines HooksSchema with 6 event types (PreToolUse, PostToolUse, Notification, Stop, SubagentStop, PreCompact) and PermissionsSchema for allow/deny patterns.

### [typescript/scripts/install-settings.ts](typescript/scripts/install-settings.ts)

CLI tool that deep-merges Claude Code settings into ~/.claude/settings.json. Preserves existing configuration while adding new settings, validates with Zod schemas, and creates settings directory if needed.

### [typescript/scripts/install-hooks.ts](typescript/scripts/install-hooks.ts)

CLI tool for installing Claude Code hooks to user/project-level settings.local.json. Supports duplicate detection, matcher-based hook grouping, and 6 hook event types with optional timeout configuration.

### [typescript/scripts/init-document-map.ts](typescript/scripts/init-document-map.ts)

Command-line utility using Commander.js and Eta templates to generate document map initialization instructions. Accepts directory path (-d) and custom instructions (-i) flags, renders init-document-map.eta template with context.

### [typescript/scripts/test-slash-args.ts](typescript/scripts/test-slash-args.ts)

Diagnostic tool for verifying argument passing from Claude Code slash commands to TypeScript scripts. Displays parsed arguments and raw process.argv using Commander.js argument handling.

### [typescript/package.json](typescript/package.json)

Build configuration and dependencies for TypeScript tooling package. Defines Bun build targets for three executables (install-settings, install-hooks, json-to-zod-to-json-schema), includes Zod, Commander.js, Eta, and schema conversion libraries.

### [typescript/tsconfig.json](typescript/tsconfig.json)

TypeScript compiler configuration targeting ESNext with bundler module resolution. Enables strict mode, path aliases (@/\*), and Bun-compatible settings (noEmit, allowImportingTsExtensions, verbatimModuleSyntax).

## Scripts & Utilities

### [scripts/lgit](scripts/lgit)

Git wrapper for dual-repo workflow: redirects git commands to `.local` private repository while maintaining current working directory as work tree.

### [scripts/code-tree](scripts/code-tree)

Directory structure visualizer with configurable depth (default 3), filters out build artifacts, dependencies, and hidden files using tree command.

### [scripts/read-file](scripts/read-file)

XML-formatted file reader for LLM context that supports project-relative paths, outputs structured XML with existence/description attributes as replacement for Claude Code @ syntax in user-level commands.

### [scripts/push-main](scripts/push-main)

Branch deployment utility that merges current branch into main, pushes to remote, and returns to original branch for deploying feature changes without staying on main.

### [lib/helpers.sh](lib/helpers.sh)

Core installation library providing rsync-based sync/backup functions with timestamped backups (YYYYMMDD_HHMMSS.bk format), XML tag-based CLAUDE.md merging, and cross-platform macOS/Linux support.

## Documentation

### [memory-bank/project-brief.md](memory-bank/project-brief.md)

Foundational project documentation defining the AI workflow resources ecosystem including directory structure, key components, installation procedures, and integration patterns. Read to understand project architecture and component relationships.

- Purpose - Centralized AI workflow resources with Claude Code commands, Cursor rules, MCP servers, TypeScript tools
- Directory Structure - Complete file tree with line counts and descriptions for all components
- Key Components - Keyboard Shortcuts MCP Server, Claude Code Commands, Cursor Rules, TypeScript Tools, Installation System, Dual-Repo Workflow
- MCP Servers - cursor-shortcuts-mcp with AI-powered recommendations and safe keybindings updates
- Commands - Git workflows, optimization/reflection, documentation updates via slash commands
- Scripts - Installation utilities (helpers.sh) and CLI tools (code-tree, lgit, read-file)
- Cursor Workflow - Four modes (Research→Plan→Act+Fast) with memory bank integration
- TypeScript Package - Core schemas, CLI tools, Bun-compiled executables
- Installation - User-level and project-level setup with safety features
- Integration Patterns - Dual-repo, permission system, memory bank integration, hook system
- Current Development Status - Active MCP server work, completed components, tech stack

### [memory-bank/focus.md](memory-bank/focus.md)

Current work context tracking active development of TypeScript helper for Claude Code custom slash commands. Read to understand immediate priorities and implementation approach for argument parsing in TypeScript scripts.

- Usage - Implementing slash commands that invoke TypeScript scripts with argument handling

### [memory-bank/mcp-server-notes.md](memory-bank/mcp-server-notes.md)

Technical implementation guide for building MCP servers with TypeScript, Bun, and OpenAI Responses API. Read when implementing MCP tools, resources, or prompts, especially for keyboard shortcuts functionality.

- Tech Stack - Bun runtime, @modelcontextprotocol/sdk, Zod validation, stdio/HTTP transport
- Core Architecture - McpServer setup, three component types (Tools, Resources, Prompts)
- OS Detection & Paths - Cross-platform keybindings.json paths for macOS/Windows/Linux
- Keybindings Structure - JSON schema with required/optional fields
- OpenAI Responses API Integration - Prompt ID and response schema for shortcut recommendations
- Safe File Updates - Atomic writes, file locking, backups for keybindings.json updates
- MCP Server Deployment - Bun executable compilation and Cursor configuration
- Error Handling - API retry logic and file operation rollback patterns
- Key Implementation Tools - recommend-shortcuts and update-shortcut tool implementations
- Performance Considerations - Input validation with Zod
- Testing Strategy - Cross-platform paths, conflict detection, atomic operations

### [prompts/optimize-instructions-for-ai/optimize-and-compress.md](prompts/optimize-instructions-for-ai/optimize-and-compress.md)

Maximum compression LLM prompt template for optimizing AI instructions with context window efficiency. Read when implementing /compress slash command or optimizing any AI instructions for token reduction.

- Analyze original instructions - Key components, clarity assessment, improvement areas
- Remove redundancies and non-essential info - Identify and eliminate redundant content
- Optimize for AI context window efficiency - Hierarchical structure, high information density
- Create concise examples - Positive and negative examples with emojis
- Apply formatting guidelines - Markdown, XML tags, Mermaid syntax
- Ensure overall effectiveness and clarity - Maintain rule impact while compressing
- Compression Guidelines - Preserve essential info, use short phrases, be terse

### [prompts/suggest-keyboard-shortcut.md](prompts/suggest-keyboard-shortcut.md)

AI prompt for generating optimal IDE keyboard shortcut recommendations based on frequency, OS, and existing shortcuts. Used by OpenAI Responses API in cursor-shortcuts-mcp server.

- Task Analysis - Evaluate task nature and IDE workflow importance
- Frequency Consideration - Prioritize ergonomics for frequently used commands
- OS Compatibility - Consider platform-specific limitations and conventions
- Existing Shortcut Analysis - List keys and avoid conflicts
- Shortcut Generation - Generate 3+ options with memorability and ease ratings
- Option Comparison - Side-by-side strengths and weaknesses analysis
- Final Selection - Choose optimal shortcut(s) based on criteria
