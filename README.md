# My AI Resources

My personal AI workflow, config, prompts, etc.

Support for:

- Cursor
- Claude Code

## File Structure

- `agent-docs/` - Documentation intended for consumption by AI agents (installed to `~/.claude/agent-docs/`)
- `claude/` - Claude Code configuration files, plugin definition, and user/project CLAUDE.md templates
- `cursor/` - Shared Cursor files (rules, commands) to be installed to other projects
- `cursor-shortcuts-mcp/` - MCP server for AI-powered keyboard shortcut recommendations
- `memory-bank/` - Persistent context files (project-brief.md, focus.md) for AI memory
- `prompts/` - Saved LLM prompts and prompt templates
- `scripts/` - CLI utility scripts (lgit, code-tree, read-file, push-main)
- `typescript/` - TypeScript tooling for installation, settings management, and document map generation
- `.claude/` - Claude Code project-level configuration for this repository
- `.cursor/` - Cursor IDE configuration for this repository

## Installation

This repository provides installation at two different scopes via the `ai install` command:

### User-level Installation

Installs user-wide configurations that apply across all projects:

**What gets installed:**

- `agent-docs/` → `~/.claude/agent-docs/` - AI agent documentation
- `claude/CLAUDE-user.md` → `~/.claude/CLAUDE.md` - User-level Claude Code instructions
- `scripts/lgit` → `~/.local/bin/lgit` - Dual-repo git wrapper script (executable)
- `scripts/code-tree` → `~/.local/bin/code-tree` - Directory visualizer with depth control (executable)
- `scripts/read-file` → `~/.local/bin/read-file` - XML-formatted file reader for LLM context (executable)
- `scripts/push-main` → `~/.local/bin/push-main` - Branch deployment utility (executable)
- `cursor-shortcuts-mcp` - MCP server built and linked globally via `bun link`
- `claude/settings.json` → Claude Code user settings (via TypeScript installer with deep merge)
- MCP server registration for Claude Code:
  - `cursor-shortcuts` (keyboard shortcut recommendations)
  - `context7` (third-party library documentation)
- `rins_hooks` fork - Cloned to `~/.claude/rins_hooks` and linked globally via `bun link`
- `ai-resources` plugin - Installed via Claude Code plugin system from local marketplace

**Requirements:**

- `bun` runtime (for MCP builds, settings installation, and rins_hooks)
- `claude` CLI (for MCP server registration and plugin installation)
- `git` (for cloning rins_hooks fork)
- `ffplay` (optional, for notification sounds in projects)

### Project-level Installation

Installs project-specific configurations in the current directory:

**What gets installed:**

- `cursor/rules/` → `.cursor/rules/` - Cursor IDE rules (workflows, memory management)
- `cursor/commands/` → `.cursor/commands/` - Cursor IDE custom commands
- `claude/CLAUDE-project.md` → `CLAUDE.md` - Project-level Claude Code instructions (merged with existing)
- Notification hook - If `.claude/notification.mp3` exists, installs hook to play sound on tool completions
- Code-formatter hook - Installs via `rins_hooks` for automatic code formatting

**Requirements:**

- `bun` runtime (for hook installation)
- `rins_hooks` globally linked (installed by user-level installer)
- `ffplay` (optional, for notification sounds)

### Usage

```bash
# Install user-level configurations (run once per user)
ai install --scope user

# Install project-level configurations (run in each project directory)
ai install --scope project
# or simply (project is the default scope):
ai install
```
