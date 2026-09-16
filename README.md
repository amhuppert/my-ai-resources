# My AI Resources

My personal AI workflow, config, prompts, etc. for Claude Code and Codex.

## File Structure

- `agent-docs/` - Documentation intended for consumption by AI agents (installed to `~/.claude/agent-docs/`)
- `claude/*-plugin/` - Canonical skills and Claude Code plugins
- `plugins/` - Generated Codex plugins
- `.agents/plugins/marketplace.json` - Codex marketplace metadata
- `.kiro/` - Kiro SDD steering files for project context
- `memory-bank/` - Working notes and implementation plans from AI-assisted development
- `prompts/` - Saved LLM prompts and prompt templates
- `scripts/` - CLI utility scripts (including local skill installation)
- `typescript/` - TypeScript tooling for installation and plugin generation
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
- `scripts/orphaned-playwright` → `~/.local/bin/orphaned-playwright` - Review and close abandoned browser automation sessions with Gum
- `ai-resources` and `agentic-engineering-principles` plugins - Installed for Claude Code and Codex from local marketplaces

**Requirements:**

- `bun` runtime (for building the installed utilities and Codex plugins)
- `claude` CLI (for plugin installation)
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

### Playwright Cleanup

Run `./scripts/orphaned-playwright` to review potential abandoned Playwright
sessions in a Gum multi-selection menu. It shows session names, ages, process
counts, and memory footprint; termination requires confirmation. SIGTERM comes
first, with a separate opt-in for SIGKILL if processes survive.

```bash
./scripts/orphaned-playwright                  # interactive review and optional cleanup
./scripts/orphaned-playwright --list           # read-only report
./scripts/orphaned-playwright --json           # read-only structured report
./scripts/orphaned-playwright --all            # also show younger or attached sessions
./scripts/orphaned-playwright --min-age-hours 8
```

Requires Python 3.9+ on macOS or Linux, plus Gum for interactive use
(`brew install gum` on macOS). Run as your regular user. The default filter is
roots with parent PID 1 and age at least two hours; these are clues, not proof
that a session is abandoned. [Detection limits and prevention design](notes-for-humans/playwright-cleanup.md).

### Shared Claude Code and Codex skills

Skills are authored once in each plugin's `skills/` directory under `claude/`.
Those directories are also the Claude Code plugin sources. Regenerate the
Codex packages after changing a skill:

```bash
cd typescript
bun run build:codex-plugin
```

The generator removes Claude-only frontmatter, adds Codex
`agents/openai.yaml` metadata, and writes the results to the matching
directories under `plugins/`. Do not edit those generated skill copies
directly.

`ai install --scope user` can install both `ai-resources` and
`agentic-engineering-principles` for Claude Code and Codex.

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

A source repository needs a `skills/<name>/SKILL.md` directory per skill —
exactly one level below `skills/` — and, for `--preset`, a `presets/` directory
whose files list one skill name per line.

For skills from multiple sources, use a manifest. Each `source` value is passed
unchanged to the `skills` CLI and followed by one or more skills from that
source. Blank lines and lines beginning with `#` are ignored:

```text
source vercel-labs/skills
skill find-skills

source mattpocock/skills
skill improve-codebase-architecture
skill writing-great-skills
```

Install a manifest at either scope:

```bash
install-skills --manifest skill-manifests/global.skills --scope global
```

`--manifest` cannot be combined with `--repo` or `--preset`. The checked-in
`skill-manifests/global.skills` file reproduces this repository's global skill
set.

#### Keeping installed copies out of git

`--local` adds each installed skill's directory and `skills-lock.json` to the
consuming repository's `.git/info/exclude`, so project-scope installs do not
show up in `git status`:

```bash
install-skills --preset team.txt --scope project --local
```

Because exclude patterns containing a slash are anchored to the repository
root, `--local` installs at the repository root even when invoked from a
subdirectory. It requires project scope and a git repository, and skips any
skill directory that already contains git-tracked files.
