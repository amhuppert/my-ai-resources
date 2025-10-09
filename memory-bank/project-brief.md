# Project Brief

## Purpose

Centralized AI workflow resources for consistent tooling across development environments. This repository provides a complete ecosystem of Claude Code commands, Cursor IDE rules, MCP servers, and TypeScript-based configuration management.

## Directory Structure

```
.
├── agent-docs/                           # AI reference docs: permissions, dual-repo, Obsidian
│   ├── claude-code-permissions.md        # Tool permission syntax reference (126 lines)
│   ├── local-files-pattern.md            # Dual-repo workflow guide (71 lines)
│   └── obsidian-context.md               # Obsidian vault interaction guide (118 lines)
├── claude/commands/                      # Custom slash commands (6 total, 664 lines)
│   ├── commit.md                         # Smart git commits + branch protection
│   ├── compress.md                       # AI instruction optimizer
│   ├── reflection.md                     # CLAUDE.md improvement advisor
│   ├── test-user-command.md              # Command testing utility
│   ├── update-project-brief.md           # Project doc updater
│   └── local/                            # Dual-repo commands
│       ├── local-commit.md               # Private repo commits via lgit
│       └── local-init.md                 # Dual-repo setup
├── cursor/rules/                         # Cursor IDE workflow system (5 active, 507 lines)
│   ├── core.mdc                          # Four-mode workflow: Research→Plan→Act+Fast (133 lines)
│   ├── memory-bank.mdc                   # Persistent project context (146 lines)
│   ├── 000-cursor-rules.mdc              # Rule creation meta-system (114 lines)
│   ├── 301-typescript-standards.mdc      # Type safety enforcement (47 lines)
│   ├── 900-mermaid-ai-diagrams.mdc       # Self-documenting diagram standards (67 lines)
│   └── archived-rules/                   # Deprecated rules (empty)
├── cursor-shortcuts-mcp/                 # MCP server for keyboard shortcuts (NEW)
│   ├── bin/cursor-shortcuts-mcp          # Compiled Bun executable
│   ├── src/
│   │   ├── server.ts                     # MCP protocol implementation (main entry)
│   │   ├── lib/
│   │   │   ├── openai.ts                 # OpenAI Responses API integration
│   │   │   ├── file-ops.ts               # Atomic file operations with locking
│   │   │   ├── keybindings.ts            # Platform-specific path resolution
│   │   │   └── types.ts                  # TypeScript interfaces
│   │   └── utils/
│   │       └── validation.ts             # Zod schemas
│   ├── package.json                      # Dependencies: MCP SDK, OpenAI, Zod
│   └── tsconfig.json                     # TypeScript config (Bun target)
├── lib/
│   └── helpers.sh                        # Installer utilities: sync, backup, merge (156 lines)
├── memory-bank/                          # Persistent context for Claude Code (471 lines)
│   ├── project-brief.md                  # Project foundation (this file, 93 lines)
│   ├── focus.md                          # Current work focus (127 lines)
│   └── mcp-server-notes.md               # MCP technical implementation guide (251 lines)
├── prompts/                              # LLM templates (8 files, 668 lines)
│   ├── cleaning-product-guide.md         # Product analysis with safety data (182 lines)
│   ├── fix-song-lyrics.md                # Metadata removal (58 lines)
│   ├── improve-audio-transcription.md    # Transcript polishing (79 lines)
│   ├── suggest-keyboard-shortcut.md      # AI shortcut recommendations (71 lines)
│   ├── explain/
│   │   └── create-detailed-guide.md      # Technical guide generator (64 lines)
│   └── optimize-instructions-for-ai/     # Three-tier optimization system
│       ├── optimize-and-compress.md      # Max compression + examples (97 lines)
│       ├── thinking-with-examples.md     # Standard + examples (67 lines)
│       └── thinking-no-examples.md       # Basic optimization (57 lines)
├── scripts/                              # Utilities (154 lines)
│   ├── code-tree                         # Directory visualizer (47 lines)
│   ├── lgit                              # Local git wrapper for .local repo (2 lines)
│   └── read-file                         # File reader with XML formatting (105 lines)
└── typescript/                           # Settings management package
    ├── lib/
    │   └── claude-code-settings.ts       # Zod schemas + type definitions (4,067 bytes)
    ├── scripts/
    │   ├── install-settings.ts           # Settings installer with deep merge (203 lines)
    │   ├── install-hooks.ts              # Hooks installer (272 lines)
    │   └── json-to-zod-to-json-schema.ts # Schema conversion pipeline (94 lines)
    ├── dist/                             # Bun-compiled executables
    │   ├── install-settings.js           # Settings installer binary (121 KB)
    │   ├── install-hooks.js              # Hooks installer binary (122 KB)
    │   └── json-to-zod-to-json-schema.js # Schema converter binary (13 MB)
    ├── package.json                      # Dependencies: Zod, prettier, converters
    └── tsconfig.json                     # Strict TypeScript config
```

## Key Components

<critical>
**Keyboard Shortcuts MCP Server** - AI-powered shortcut recommendations + safe keybindings updates
**Claude Code Commands** - 6 slash commands for git, optimization, reflection, docs
**Cursor Rules** - Research→Plan→Act+Fast workflow with persistent memory
**TypeScript Tools** - Type-safe settings management with Zod validation
**Installation System** - User/project-level with automatic backups
**Dual-Repo Workflow** - lgit wrapper for versioning private files alongside team repos
</critical>

### MCP Servers (NEW Component)

**Cursor Shortcuts MCP** - `cursor-shortcuts-mcp/` (TypeScript + Bun)

- **Tools**:
  1. `recommend-shortcuts` - AI-powered shortcut suggestions via OpenAI Responses API
  2. `update-shortcut` - Safe keybindings.json updates with locking + backups
- **Main Entry**: `cursor-shortcuts-mcp/src/server.ts` (MCP protocol handler)
- **AI Integration**: `cursor-shortcuts-mcp/src/lib/openai.ts` (OpenAI Responses API, prompt ID: `pmpt_68c0898bb23081978687ee5fdf5f690d06a197956797278f`)
- **File Operations**: `cursor-shortcuts-mcp/src/lib/file-ops.ts` (atomic writes, proper-lockfile, automatic backups)
- **Path Resolution**: `cursor-shortcuts-mcp/src/lib/keybindings.ts` (cross-platform: macOS/Windows/Linux)
- **Validation**: `cursor-shortcuts-mcp/src/utils/validation.ts` (Zod schemas)
- **Target File**: `~/.config/Cursor/User/keybindings.json` (Linux), platform-specific paths for macOS/Windows
- **Installation**: Compiled to `cursor-shortcuts-mcp/bin/cursor-shortcuts-mcp` (Bun executable)
- **Status**: Active development (see memory-bank/focus.md)

### Commands

**Git Workflows**:

- `/commit` - `claude/commands/commit.md` (main branch protection, smart commits, 102 lines)
- `/local-commit` - `claude/commands/local/local-commit.md` (private repo commits via lgit, 58 lines)
- `/local-init` - `claude/commands/local/local-init.md` (dual-repo initialization, 84 lines)

**Optimization & Reflection**:

- `/compress` - `claude/commands/compress.md` (AI instruction optimizer, 119 lines)
- `/reflection` - `claude/commands/reflection.md` (CLAUDE.md improvement suggestions, 143 lines)

**Documentation**:

- `/update-project-brief` - `claude/commands/update-project-brief.md` (project brief updater with parallel research, 158 lines)

**Architecture**: Markdown-based with YAML frontmatter (`allowed-tools` permissions), dynamic context injection via `!`command`` syntax

### Scripts

**Installation**:

- `lib/helpers.sh` - Shared installation functions: `sync_directory()`, `copy_file_with_backup()`, `install_claude_md()` (156 lines)
  - Timestamped backups (format: `file__YYYYMMDD_HHMMSS.bk`)
  - XML tag-based CLAUDE.md merging
  - Cross-platform (macOS/Linux)

**Utilities** (installed to `~/.local/bin/`):

- `scripts/code-tree` - Directory visualizer with depth control, filters node_modules/dist/build (47 lines)
- `scripts/lgit` - Git wrapper: `git --git-dir="$PWD/.local" --work-tree="$PWD"` for dual-repo workflow (2 lines)
- `scripts/read-file` - XML-formatted file reader for LLM context, supports project-relative paths (105 lines)

### Cursor Workflow

**Four Modes** (defined in `cursor/rules/core.mdc`):

1. **Research** → Context gathering, memory bank review, codebase search (default start)
2. **Plan** → Strategy development, requires approval before execution
3. **Act** → Implementation with integrated memory updates (start and end)
4. **Fast** → Bypass workflow constraints for direct execution

**Memory Bank** (defined in `cursor/rules/memory-bank.mdc`):

- Hierarchical structure: project-brief → productContext/systemPatterns/techContext → activeContext → progress
- 6 core files required for Cursor projects
- Mandatory reading at EVERY task start
- Automatic updates during Act mode

**Standards Enforcement**:

- `cursor/rules/301-typescript-standards.mdc` - No @ts-ignore, proper type fixes (47 lines)
- `cursor/rules/900-mermaid-ai-diagrams.mdc` - Self-documenting diagrams with inline comments (67 lines)

**Meta-System**:

- `cursor/rules/000-cursor-rules.mdc` - Rule creation framework with naming conventions (114 lines)

### TypeScript Package

**Core Schema** - `typescript/lib/claude-code-settings.ts` (current)

- `ClaudeCodeSettingsSchema` - Main validation schema
- `PermissionsSchema` - Tool control (allow/deny patterns)
- `HooksSchema` - Event-driven hooks (6 types: PreToolUse, PostToolUse, Notification, Stop, SubagentStop, PreCompact)
- TypeScript types via `z.infer<>`

**CLI Tools**:

- `typescript/scripts/install-settings.ts` - Deep merge installer for `~/.claude/settings.json` (203 lines)
- `typescript/scripts/install-hooks.ts` - Hook installer with duplicate detection, user/project-level (272 lines)
- `typescript/scripts/json-to-zod-to-json-schema.ts` - Schema conversion pipeline (94 lines)

**Build System**:

- Bun-compiled executables in `typescript/dist/`
- `bun build --outdir=dist --target=bun --compile`
- Deployed by `install-user.sh`

### Documentation

**Agent Reference Docs** (agent-docs/, 315 lines total):

- `agent-docs/claude-code-permissions.md` - Complete tool permission syntax guide (126 lines)
- `agent-docs/local-files-pattern.md` - Dual-repo workflow patterns (71 lines)
- `agent-docs/obsidian-context.md` - Obsidian vault interaction rules (118 lines)

**Memory Bank** (memory-bank/, 471 lines total):

- `memory-bank/project-brief.md` - Project foundation (this file)
- `memory-bank/focus.md` - Current work focus and active tasks
- `memory-bank/mcp-server-notes.md` - MCP technical implementation details

**Prompts** (prompts/, 668 lines total):

- 8 reusable LLM prompt templates
- Three-tier optimization system (optimize-instructions-for-ai/)
- Domain-specific templates (audio transcription, lyrics, keyboard shortcuts, cleaning products)
- Technical guide generator (explain/)

## Installation

<required>
**User-level** (`install-user.sh` - installs to home directory):
- agent-docs → `~/.claude/agent-docs/`
- claude/commands → `~/.claude/commands/`
- scripts → `~/.local/bin/` (lgit, code-tree, read-file)
- Claude Code settings via `typescript/dist/install-settings.js`
- User-level CLAUDE.md → `~/.claude/CLAUDE.md`
- Context7 MCP server (if configured)
- rins_hooks fork (code formatter, notification hooks)

**Project-level** (`install-project.sh` - installs to current directory):

- cursor/rules → `.cursor/rules/`
- Project-level CLAUDE.md → `./CLAUDE.md`
- Notification hook (conditional, if `.claude/notification.mp3` exists)
- Code formatter hook via rins_hooks

**MCP Server Setup** (manual):

1. Build: `cd cursor-shortcuts-mcp && bun run build`
2. Configure: Add to `.cursor/mcp.json` or `~/.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "cursor-shortcuts-mcp": {
         "command": "/absolute/path/to/cursor-shortcuts-mcp/bin/cursor-shortcuts-mcp",
         "env": {
           "OPENAI_API_KEY": "sk-..."
         }
       }
     }
   }
   ```

**Safety Features**:

- Automatic timestamped backups before overwriting files
- Cross-platform compatibility (macOS, Linux, Windows paths)
- Deep merge for settings (preserves existing configuration)
- XML tag-based merge for CLAUDE.md files
- Idempotent (safe to run multiple times)
  </required>

## Integration Patterns

**Dual-Repository Workflow**:

- Public repo (`.git`) - Team code, tracked by regular git
- Private repo (`.local`) - Personal files (.cursor/, memory-bank/, CLAUDE.md), tracked by lgit
- `.git/info/exclude` - Ignores private files from team repo
- `.local/info/exclude` - Ignores team files, whitelists private files
- Post-checkout hook - Auto-syncs private repo branches with team repo

**Permission System** (Claude Code):

- Pattern-based tool restrictions in `allowed-tools` frontmatter
- Examples: `Bash(git add:*)`, `Write(memory-bank/project-brief.md)`, `Agent`
- Enables granular control over slash command capabilities

**Memory Bank Integration**:

- @ syntax references: `@memory-bank/project-brief.md`, `@memory-bank/focus.md`
- Automatic file injection into Claude Code context
- Persistent context across sessions
- Updated via slash commands (/update-project-brief)

**Hook System**:

- PostToolUse hook: Code formatter runs automatically after Edit/Write/MultiEdit
- Event-driven: 6 lifecycle events (PreToolUse, PostToolUse, Notification, Stop, SubagentStop, PreCompact)
- Matcher patterns: Regex-like tool name matching
- Timeout support for long-running commands

## Current Development Status

**Active Work**: MCP server for keyboard shortcuts (see memory-bank/focus.md)

**Completed Components**:

- Claude Code slash commands (6 total)
- Cursor workflow rules (5 active)
- TypeScript settings management
- Installation system with backups
- Dual-repo workflow utilities
- Agent documentation
- Prompt template library

**Tech Stack**:

- TypeScript + Bun (MCP server, settings management)
- Bash (installation, utilities)
- Zod (validation, type safety)
- MCP SDK (@modelcontextprotocol/sdk)
- OpenAI Responses API
