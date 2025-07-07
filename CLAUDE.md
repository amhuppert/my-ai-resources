# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a personal AI workflow resource repository containing documentation, commands, and templates for working with AI tools like Cursor and Claude Code. It provides instructions and helpers for other repositories that use dual-repo patterns.

## Repository Structure

- `agent-docs/` - Documentation specifically for AI agents, including the local-files-pattern.md which explains dual-repo setup
- `.cursor/` - Cursor IDE configuration and rules (memory-bank.mdc, core.mdc, etc.)
- `commands/` - Claude Code custom slash commands with markdown definitions
- `prompts/` - LLM prompt templates and saved prompts
- `scripts/` - Utility scripts for various tasks
- `install.sh` - Installation script that sets up AI tooling configurations

## Custom Claude Code Commands

The repository defines custom slash commands in `commands/`:

### /commit
- **Purpose**: Intelligent commit message generation with staged changes analysis
- **Tools**: Bash(git add, git status, git diff --cached, lgit commit)
- **Features**: Prevents commits to main branch, generates descriptive commit messages without AI attribution

### /local-commit
- **Purpose**: Commit changes to local private repository using lgit wrapper
- **Tools**: Bash(lgit add, lgit status, lgit diff --cached, lgit commit)
- **Usage**: For repositories using the dual-repo pattern described in agent-docs/

### /local-init
- **Purpose**: Initialize a new local private repository in current directory
- **Tools**: Bash(mkdir .local, git init --bare)
- **Usage**: Sets up the .local bare repository for dual-repo pattern

## Key Concepts

### Dual-Repo Pattern (for other projects)
This repository documents but doesn't implement a pattern where:
- Public repo (`.git/`) contains shared project files
- Private repo (`.local/`) contains personal configurations
- `lgit` command wraps git operations for private files
- Private files are ignored in public repo via `.gitignore`

### File Management
- This repository itself uses standard git workflow
- Contains templates and documentation for setting up dual-repo patterns in other projects
- Custom commands are designed to work in repositories that implement the dual-repo pattern

## Installation Scripts

The repository provides two installation scripts for different scopes:

### install-user.sh (User-level Installation)
Sets up user-wide configurations in home directory:
- Syncs `agent-docs` → `~/.claude/agent-docs` (Claude Code documentation)
- Syncs `claude/commands` → `~/.claude/commands` (Claude Code custom commands)
- Copies `scripts/lgit` → `~/.local/bin/lgit` (dual-repo git wrapper)
- Installs Claude Code settings using TypeScript installer

### install-project.sh (Project-level Installation)
Sets up project-specific configurations in current directory:
- Syncs `cursor/rules` → `.cursor/rules` (Cursor IDE configuration)

### Key Features
- **Backup Protection**: Uses rsync with timestamped backups (`__YYYYMMDD_HHMMSS.bk`)
- **Safe Sync**: Won't overwrite files without backing them up first
- **Executable Permissions**: Automatically makes lgit executable
- **Conflict Reporting**: Shows all backed up files after installation

### Usage
```bash
# Install user-level configurations (run once per user)
./install-user.sh

# Install project-level configurations (run in each project directory)
./install-project.sh
```

### Legacy install.sh
The original `install.sh` script is still available and performs both user and project installations in one step.

## Usage Notes

- Custom commands reference the dual-repo pattern but are meant for use in other repositories
- The `lgit` command is expected to be available in target repositories using the dual-repo pattern
- Agent documentation in `agent-docs/` provides context for AI agents working in dual-repo setups