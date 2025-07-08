# My AI Resources

My personal AI workflow, config, prompts, etc.

Support for:

- Cursor
- Claude Code

## File Structure

- `agent-docs` - Documentation intended for consumption by AI agents
- `.cursor` - Cursor files used by Cursor in this project
- `cursor` - Shared Cursor files (to be installed to other projects)
- `commands` - Claude Code custom slash commands
- `prompts` - Saved LLM prompts / prompt templates
- `scripts` - Scripts for various tasks
- `lib` - Shared library functions for installer scripts

## Installation

This repository provides two installation scripts for different scopes:

### install-user.sh (User-level Installation)

Installs user-wide configurations that apply across all projects:

**What gets installed:**

- `agent-docs/` → `~/.claude/agent-docs/` - AI agent documentation
- `claude/commands/` → `~/.claude/commands/` - Claude Code custom slash commands
- `scripts/lgit` → `~/.local/bin/lgit` - Dual-repo git wrapper script (executable)
- `claude/settings.json` → Claude Code user settings (via TypeScript installer)
- Context7 MCP server registration for Claude Code

**Requirements:**

- `bun` runtime (for settings installation)
- `claude` CLI (for MCP server registration)

### install-project.sh (Project-level Installation)

Installs project-specific configurations in the current directory:

**What gets installed:**

- `cursor/rules/` → `.cursor/rules/` - Cursor IDE configuration files

### Usage

```bash
# Install user-level configurations (run once per user)
./install-user.sh

# Install project-level configurations (run in each project directory)
./install-project.sh
```
