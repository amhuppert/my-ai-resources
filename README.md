# My AI Resources

My personal AI workflow, config, prompts, etc. for Claude Code.

## File Structure

- `agent-docs/` - Documentation intended for consumption by AI agents (installed to `~/.claude/agent-docs/`)
- `claude/` - Claude Code configuration files, plugin definition, and user/project CLAUDE.md templates
- `.kiro/` - Kiro SDD steering files for project context
- `memory-bank/` - Working notes and implementation plans from AI-assisted development
- `prompts/` - Saved LLM prompts and prompt templates
- `scripts/` - CLI utility scripts (including local skill installation)
- `typescript/` - TypeScript tooling for installation and settings management
- `.claude/` - Claude Code project-level configuration for this repository

## Installation

This repository provides installation at two different scopes via the `ai install` command:

### User-level Installation

Installs user-wide configurations that apply across all projects:

**What gets installed:**

- `agent-docs/` → `~/.claude/agent-docs/` - AI agent documentation
- `scripts/lgit` → `~/.local/bin/lgit` - Dual-repo git wrapper script (executable)
- `scripts/code-tree` → `~/.local/bin/code-tree` - Directory visualizer with depth control (executable)
- `scripts/read-file` → `~/.local/bin/read-file` - XML-formatted file reader for LLM context (executable)
- `scripts/push-main` → `~/.local/bin/push-main` - Branch deployment utility (executable)
- `scripts/install-skills` → `~/.local/bin/install-skills` - Local skill installer for Claude Code and Codex
- `claude/settings.json` → Claude Code user settings (via TypeScript installer with deep merge)
- MCP server registration for Claude Code:
  - `context7` (third-party library documentation)
- `ai-resources` plugin - Installed via Claude Code plugin system from local marketplace

**Requirements:**

- `bun` runtime (for settings installation)
- `claude` CLI (for MCP server registration and plugin installation)
- `ffplay` (optional, for notification sounds in projects)

### Project-level Installation

Installs project-specific configurations in the current directory:

**What gets installed:**

- `claude/CLAUDE-project.md` → `CLAUDE.md` - Project-level Claude Code instructions (merged with existing)
- Notification hook - If `.claude/notification.mp3` exists, installs hook to play sound on tool completions

**Requirements:**

- `bun` runtime (for hook installation)
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

### Local Skill Installation

Point `LOCAL_SKILLS_REPO` at a local repository containing `skills/` and
optional `presets/` directories. Each preset is a text file with one skill
directory name per line.

```bash
export LOCAL_SKILLS_REPO="$HOME/path/to/local-skills"

# Choose skills and scope with Gum
install-skills

# Install a preset and choose the scope with Gum
install-skills --preset team.txt

# Install a preset non-interactively at user scope
install-skills --preset team.txt --scope global
```
