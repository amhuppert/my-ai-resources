# Project Brief

## Purpose

The repository serves as a centralized collection of AI workflow resources that can be installed across different development environments to provide consistent tooling and configuration for AI-assisted development.

## Directory Structure

```
.
├── agent-docs/                    # Docs intended for AI
├── claude/                        # Support for Claude Code
│   └── commands/                  # Custom Claude Code slash commands
│       └── local/                 # Dual-repo specific commands
├── cursor/                        # Support for Cursor IDE
│   ├── archived-rules/            # Rules that won't be installed
│   └── rules/                     # General Cursor project rules
├── lib/                           # Shared utility functions
├── prompts/                       # LLM prompt templates
│   ├── explain/                   # Content creation templates
│   └── optimize-instructions-for-ai/ # Instruction optimization templates
├── scripts/                       # Utility scripts
└── typescript/                    # TypeScript utilities
    ├── lib/                       # Core TypeScript library
    └── scripts/                   # TypeScript scripts
```

## Key Components

### TypeScript Tools (`typescript/`)

- **CLI Interface**: Command-line tools for settings management / installation helpers

## Installation System

The repository provides two installation scripts:

### User-Level Installation (`install-user.sh`)

- Syncs agent-docs → ~/.claude/agent-docs
- Syncs claude/commands → ~/.claude/commands
- Installs lgit script → ~/.local/bin/lgit
- Installs Claude Code settings using TypeScript utilities
- Installs user-level CLAUDE.md

### Project-Level Installation (`install-project.sh`)

- Syncs cursor/rules → .cursor/rules (Cursor IDE configuration)
- Installs project-level CLAUDE.md
