# OpenAI Codex CLI Cheat Sheet

Lightweight coding agent (built in Rust) that reads, edits, and runs code from your terminal.

## Core Commands

| Command | Description |
|---|---|
| `codex` | Launch interactive TUI |
| `codex "fix the login bug"` | Start session with initial prompt |
| `codex exec "add tests for utils.ts"` | Non-interactive execution, output to stdout |
| `codex exec --json "..."` | Emit newline-delimited JSON events |
| `codex resume --last` | Reopen most recent session |
| `codex resume <SESSION_ID>` | Resume a specific session |
| `codex fork <SESSION_ID>` | Fork a session into a new thread |
| `codex apply <TASK_ID>` | Apply cloud task diffs to local repo |

## Approval Modes & Sandbox

| Flag | Effect |
|---|---|
| `--sandbox read-only` | Codex can read but not write or execute |
| `--sandbox workspace-write` | Edits within working directory (default) |
| `--sandbox danger-full-access` | Unrestricted filesystem access |
| `--ask-for-approval untrusted` | Approve every command |
| `--ask-for-approval on-request` | Approve only when Codex asks |
| `--ask-for-approval never` | No approval prompts |
| `--full-auto` | Shortcut for low-friction local work |
| `--yolo` | Bypass all safety checks (hardened envs only) |

Change mid-session with `/permissions`.

## Customization: AGENTS.md

Persistent instructions loaded once per session, concatenated root-to-cwd.

| Scope | Path |
|---|---|
| Global | `~/.codex/AGENTS.md` |
| Global override | `~/.codex/AGENTS.override.md` (takes precedence) |
| Project | `<repo-root>/AGENTS.md` |
| Subdirectory | `<subdir>/AGENTS.md` |

- Override files at any level take precedence over base files
- Max combined size: 32 KiB (`project_doc_max_bytes`)
- Scaffold a new one: `/init`
- Verify loaded files: `codex status`

## Customization: config.toml

Located at `~/.codex/config.toml` (user) or `.codex/config.toml` (project). CLI `-c key=value` overrides both.

```toml
model = "gpt-5.4"
model_reasoning_effort = "high"      # minimal | low | medium | high | xhigh
personality = "pragmatic"            # none | friendly | pragmatic
sandbox_mode = "workspace-write"
web_search = "live"                  # disabled | cached | live
file_opener = "vscode"              # vscode | cursor | windsurf | none
commit_attribution = "Co-authored-by: Codex"

[history]
persistence = "save-all"             # save-all | none

[agents]
max_threads = 6
max_depth = 3
```

### Profiles

```toml
profile = "default"

[profiles.careful]
sandbox_mode = "read-only"
model_reasoning_effort = "xhigh"
```

Load with `codex -p careful` or `--profile careful`.

## Skills

Reusable instruction bundles that extend Codex. Detected automatically or invoked explicitly.

| Action | How |
|---|---|
| Invoke explicitly | Type `$skill-name` in prompt |
| Create a skill | `$skill-creator` or manually create `SKILL.md` |
| Install community skill | `$skill-installer linear` |
| Disable a skill | Set `enabled = false` in config.toml |

### Skill locations (searched in order)

| Scope | Path |
|---|---|
| Repo (local) | `./.agents/skills/` |
| Repo (root) | `$REPO_ROOT/.agents/skills/` |
| User | `~/.agents/skills/` |
| Admin | `/etc/codex/skills/` |
| System | Bundled with Codex |

### SKILL.md structure

```markdown
---
name: my-skill
description: When to trigger this skill
---
Step-by-step instructions for Codex
```

Optional dirs: `scripts/`, `references/`, `assets/`, `agents/openai.yaml`.

## Key Slash Commands

| Command | Description |
|---|---|
| `/review` | Review working tree changes against a branch |
| `/plan` | Switch to plan mode |
| `/model` | Change active model and reasoning effort |
| `/fast` | Toggle fast mode (GPT-5.4) |
| `/diff` | Show git diff including untracked files |
| `/mention` | Attach a file to the conversation |
| `/compact` | Summarize conversation to save tokens |
| `/mcp` | List configured MCP tools |
| `/apps` | Browse and insert connectors |
| `/fork` | Fork conversation into new thread |
| `/clear` | Clear terminal, fresh chat |
| `/status` | Show session config and token usage |
| `/init` | Generate AGENTS.md scaffold |

## MCP Integration

Add external tools via Model Context Protocol servers in config.toml.

```toml
[mcp_servers.my-server]
command = "npx my-mcp-server"       # stdio server
# url = "https://..."               # HTTP streamable server
enabled_tools = ["tool_a", "tool_b"]
startup_timeout_sec = 15
required = true                      # fail startup if server can't init
```

Manage with `codex mcp` subcommand.

## Automation with `exec`

```bash
# Run a task, write result to file
codex exec -o result.md "summarize recent changes"

# Validate JSON output against schema
codex exec --output-schema schema.json "generate config"

# Ephemeral run (no session saved)
codex exec --ephemeral "lint and fix src/"

# Skip git repo check for non-repo dirs
codex exec --skip-git-repo-check "analyze logs in /tmp/data"

# Cloud execution with best-of-N
codex cloud exec --env ENV_ID --attempts 4 "refactor auth module"
```

## Tips & Shortcuts

| Shortcut | Action |
|---|---|
| `@` in composer | Fuzzy file search |
| `!command` | Run shell command inline |
| `Enter` while running | Inject instructions mid-turn |
| `Ctrl+G` | Open `$EDITOR` for long prompts |
| `Esc Esc` | Edit previous message / fork branch |
| `-i img.png` | Attach image for visual context |
| `--add-dir ../other` | Add extra directories to workspace |
| `codex completion zsh` | Install shell tab completions |
