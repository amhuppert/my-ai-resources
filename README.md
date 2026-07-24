# My AI Resources

My personal AI workflow, config, prompts, etc. for Claude Code and Codex.

## File Structure

- `agent-docs/` - Documentation intended for consumption by AI agents (installed to `~/.claude/agent-docs/`)
- `claude/ai-resources-plugin/` - Canonical skills and Claude Code plugin
- `plugins/ai-resources/` - Generated Codex plugin
- `.agents/plugins/marketplace.json` - Codex marketplace metadata
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
- `scripts/notify` → `~/.local/bin/notify` - Command-completion notifier for macOS and Linux
- `claude/settings.json` → Claude Code user settings (via TypeScript installer with deep merge)
- MCP server registration for Claude Code:
  - `context7` (third-party library documentation)
- `ai-resources` plugins - Installed for Claude Code and Codex from local marketplaces

**Requirements:**

- `bun` runtime (for settings installation)
- `claude` CLI (for MCP server registration and plugin installation)
- `codex` CLI (optional; required for Codex plugin installation)
- `ffplay` (optional, for notification sounds in projects)

The `notify` utility uses built-in notification, speech, and audio commands on
macOS. On Linux, its optional backends are `notify-send`, `spd-say` or
`espeak`, and `ffplay` or `mpv`.

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

### Command Completion Notifications

`notify` shows a native notification immediately, or after a wrapped command
finishes. Commands must follow `--`; their arguments and terminal I/O are
passed through unchanged.

```bash
notify
notify -m "Ready"
notify -a ./sounds/complete.wav
notify -- bun test
notify -m "Build finished" -a ./sounds/complete.wav -- bun run build
```

Use `-a FILE` or `--audio FILE` to play a specific audio file; relative paths
are resolved from the current directory. A selected file takes precedence over
text-to-speech and replaces the default MP3 lookup. If it cannot be played,
`notify` speaks the notification body. Without an audio file, an explicit
message is read with text-to-speech. Without either, `notify` plays the first
working sound from `.claude/notification.mp3` in the current project or
`~/.config/notify/notification.mp3`, then falls back to speaking the derived
command result. Visual and audio delivery are best effort with warnings;
wrapped commands retain their exit status, including signal-derived statuses.

### Shared Claude Code and Codex skills

Skills are authored once under `claude/ai-resources-plugin/skills/`. That
directory is also the Claude Code plugin source. Regenerate the Codex package
after changing a skill:

```bash
cd typescript
bun run build:codex-plugin
```

The generator removes Claude-only frontmatter, adds Codex
`agents/openai.yaml` metadata, and writes the result to
`plugins/ai-resources/skills/`. Do not edit those generated skill copies
directly.

`ai install --scope user` installs `ai-resources@ai-resources` for Claude Code
and `ai-resources@my-ai-resources` for Codex.

### Local Skill Installation

From this repository, the installer discovers the canonical skills
automatically. For another checkout, pass its Claude plugin directory:

```bash
install-skills --repo /path/to/repo/claude/ai-resources-plugin

# Or configure a default source for subsequent commands
export LOCAL_SKILLS_REPO=/path/to/repo/claude/ai-resources-plugin

# Choose skills and scope with Gum
install-skills

# Install a preset and choose the scope with Gum
install-skills --preset team.txt

# Install a preset non-interactively at user scope
install-skills --preset team.txt --scope global
```

`LOCAL_SKILLS_REPO` remains available as an environment-variable alternative.
