# Project Brief

## Purpose

Centralized AI workflow resources for consistent tooling across development environments.

## Directory Structure

```
.
├── agent-docs/                    # AI docs: permissions, dual-repo workflows
├── claude/commands/               # Custom slash commands (6 total)
│   ├── commit.md                  # Smart git commits + branch protection
│   ├── compress.md                # AI instruction optimizer
│   ├── reflection.md              # CLAUDE.md improvement advisor
│   ├── update-project-brief.md    # Project doc updater
│   └── local/                     # Dual-repo commands
│       ├── local-commit.md        # Private repo commits
│       └── local-init.md          # Private repo setup
├── cursor/rules/                  # Cursor IDE workflow system (5 active)
│   ├── core.mdc                   # Four-mode workflow: Research→Plan→Act+Fast
│   ├── memory-bank.mdc            # Persistent project context
│   └── archived-rules/            # Deprecated rules
├── lib/helpers.sh                 # Installer utilities + backup management
├── memory-bank/project-brief.md   # Persistent context for Claude Code
├── prompts/                       # LLM templates (4 files)
│   ├── explain/                   # Technical guide generators
│   └── optimize-instructions-for-ai/ # Three-tier optimization system
├── scripts/                       # Utilities
│   ├── code-tree                  # Directory visualizer
│   ├── lgit                       # Local git wrapper
│   └── read-file                  # File reader for LLM context (cat with XML formatting)
└── typescript/                    # Settings management package
    ├── lib/claude-code-settings.ts # Zod schemas + type definitions
    ├── scripts/install-settings.ts # CLI settings installer
    └── dist/install-settings.js   # Built executable
```

## Key Components

<critical>
**Claude Code Commands** - 6 slash commands for git, optimization, reflection, docs
**Cursor Rules** - Research→Plan→Act+Fast workflow with persistent memory
**TypeScript Tools** - Type-safe settings management with Zod validation
**Installation System** - User/project-level with automatic backups
</critical>

### Commands

- `/commit` - Smart git commits with branch protection
- `/compress` - AI instruction optimizer
- `/reflection` - CLAUDE.md improvement suggestions
- `/update-project-brief` - Automated project documentation
- `/local-commit` - Private repo commits via lgit
- `/local-init` - Dual-repo setup

### Scripts

- `code-tree` - Directory visualizer with depth control
- `lgit` - Local git wrapper for dual-repo workflows
- `read-file` - File reader for LLM context (cat with XML formatting)

### Cursor Workflow

- **Four modes**: Research → Plan → Act + Fast
- **Memory bank**: Hierarchical persistent context
- **TypeScript standards**: Type safety enforcement
- **Rule framework**: Meta-rules for configuration

### TypeScript Package

- **Type safety**: Zod-based schemas for settings validation
- **CLI tools**: Settings installation/merging utilities
- **Permissions**: Granular tool control
- **Build**: Bun-compiled executables

## Installation

<required>
**User-level** (`install-user.sh`):
- agent-docs → ~/.claude/agent-docs
- claude/commands → ~/.claude/commands
- lgit → ~/.local/bin/lgit
- Claude Code settings (TypeScript)
- User-level CLAUDE.md

**Project-level** (`install-project.sh`):

- cursor/rules → .cursor/rules
- Project-level CLAUDE.md

**Safety**: Automatic timestamped backups, cross-platform, merge support
</required>
