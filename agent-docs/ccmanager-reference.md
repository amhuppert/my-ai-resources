# CCManager Reference Guide for AI Agents

<Overview>
CCManager is a CLI application for managing multiple AI coding assistant sessions across Git worktrees and projects. It orchestrates parallel sessions with Claude Code, Gemini CLI, Codex CLI, Cursor Agent, Copilot CLI, Cline CLI, OpenCode, and Kimi CLI — providing real-time status tracking, worktree lifecycle management, and automation hooks from a single terminal interface.
</Overview>

## Installation

```bash
# Global install
npm install -g ccmanager

# Run without installing
npx ccmanager
```

Current version: v3.7.4

## Core Concepts

- **Session**: A running AI assistant process attached to a specific worktree
- **Worktree**: A Git worktree representing an isolated working directory/branch
- **Status states**: `idle` (no activity), `busy` (processing), `waiting` (awaiting user input)
- **Session data copying**: Transfers Claude Code conversation context (`~/.claude/projects/[path]`) between worktrees to preserve history
- **Configuration hierarchy**: Per-project `.ccmanager.json` overrides global `~/.config/ccmanager/config.json`

## CLI Usage

```bash
# Standard launch (single project)
ccmanager

# Multi-project mode
export CCMANAGER_MULTI_PROJECT_ROOT="/path/to/projects"
ccmanager --multi-project

# Devcontainer mode
ccmanager --devc-up-command "<start-cmd>" --devc-exec-command "<exec-cmd>"
```

| Flag                  | Purpose                             |
| --------------------- | ----------------------------------- |
| `--multi-project`     | Enable multi-repository management  |
| `--devc-up-command`   | Command to start devcontainer       |
| `--devc-exec-command` | Command to execute inside container |

## Keyboard Shortcuts

| Default Binding | Action                                    |
| --------------- | ----------------------------------------- |
| `Ctrl+E`        | Return to menu from active session        |
| `Escape`        | Cancel / go back in dialogs               |
| `/`             | Search/filter (multi-project mode)        |
| `B`             | Back to project list (multi-project mode) |
| `R`             | Refresh project list                      |
| `Q`             | Quit                                      |
| `0-9`           | Quick-select projects by number           |

### Shortcut Customization

Configure via UI (Global Configuration > Configure Shortcuts) or config file:

```json
{
  "shortcuts": {
    "returnToMenu": { "ctrl": true, "key": "r" },
    "cancel": { "key": "escape" }
  }
}
```

Restrictions: shortcuts require modifier keys (except special keys like Escape). Reserved: `Ctrl+C`, `Ctrl+D`, `Ctrl+[`.

## Configuration

### Global Config

Location: `~/.config/ccmanager/config.json` (Linux/macOS) or `%APPDATA%\ccmanager\config.json` (Windows)

### Per-Project Config

Location: `.ccmanager.json` in git repository root. Overrides global settings.

```json
{
  "command": {
    "name": "gemini",
    "args": []
  },
  "shortcuts": {
    "returnToMenu": { "ctrl": true, "key": "e" }
  }
}
```

<critical>
Per-project configuration is NOT available in `--multi-project` mode. Only global configuration applies.
</critical>

### Command Presets

Configure via UI: Global Configuration > Configure Command Presets

```json
{
  "command": {
    "name": "claude",
    "args": ["--resume", "--model", "opus"],
    "fallbackArgs": ["--model", "opus"]
  }
}
```

Execution order: primary args first, then fallback args, then no args as final fallback.

### Worktree Settings

```json
{
  "worktree": {
    "autoDirectory": true,
    "autoDirectoryPattern": "../{branch}",
    "copySessionData": true
  }
}
```

**Auto-directory pattern placeholders:**

| Placeholder                   | Value                 |
| ----------------------------- | --------------------- |
| `{branch}` or `{branch-name}` | Sanitized branch name |
| `{project}`                   | Git repository name   |

**Branch name sanitization:** slashes become dashes, special characters removed, lowercased, leading/trailing dashes stripped. Example: `feature/Login` becomes `feature-login`.

**Pattern examples:**

| Pattern                     | Branch          | Result                      |
| --------------------------- | --------------- | --------------------------- |
| `../{branch}`               | `feature/login` | `../feature-login`          |
| `.git/tasks/{branch}`       | `fix/bug-123`   | `.git/tasks/fix-bug-123`    |
| `~/work/{project}/{branch}` | `fix/typo`      | `~/work/myproject/fix-typo` |

## Supported AI Assistants

| Assistant    | Default Command |
| ------------ | --------------- |
| Claude Code  | `claude`        |
| Gemini CLI   | `gemini`        |
| Codex CLI    | `codex`         |
| Cursor Agent | `cursor-agent`  |
| Copilot CLI  | `copilot`       |
| Cline CLI    | `cline`         |
| OpenCode     | `opencode`      |
| Kimi CLI     | `kimi`          |

## Hooks

### Status Change Hooks

Execute commands when session status changes. Configure via Global Configuration > Configure Status Hooks.

Three hook types: **Idle**, **Busy**, **Waiting for Input**.

**Environment variables available in hooks:**

| Variable                    | Description        |
| --------------------------- | ------------------ |
| `CCMANAGER_OLD_STATE`       | Previous state     |
| `CCMANAGER_NEW_STATE`       | Current state      |
| `CCMANAGER_WORKTREE_PATH`   | Worktree directory |
| `CCMANAGER_WORKTREE_BRANCH` | Git branch name    |
| `CCMANAGER_SESSION_ID`      | Unique session ID  |

<example>
Desktop notification on idle:
```bash
noti -t "CCManager" -m "Session on $CCMANAGER_WORKTREE_BRANCH is now $CCMANAGER_NEW_STATE"
```
</example>

Hooks run in the worktree directory context. Ensure commands are in `PATH`.

### Worktree Hooks

**Pre-creation hook**: Runs before worktree creation in git root directory. Non-zero exit aborts creation.

```json
{
  "worktreeHooks": {
    "pre_creation": {
      "command": "your-validation-command",
      "enabled": true
    }
  }
}
```

**Post-creation hook**: Runs after worktree creation in the new worktree directory. Failures are logged but don't prevent creation. Runs asynchronously.

```json
{
  "worktreeHooks": {
    "post_creation": {
      "command": "npm install",
      "enabled": true
    }
  }
}
```

**Environment variables for worktree hooks:**

| Variable                    | Description            |
| --------------------------- | ---------------------- |
| `CCMANAGER_WORKTREE_PATH`   | Absolute worktree path |
| `CCMANAGER_WORKTREE_BRANCH` | Branch name            |
| `CCMANAGER_GIT_ROOT`        | Repository root path   |
| `CCMANAGER_BASE_BRANCH`     | Base branch (optional) |

## Multi-Project Mode

```bash
export CCMANAGER_MULTI_PROJECT_ROOT="/path/to/projects"
ccmanager --multi-project
```

- Recursively discovers git repositories (excludes worktrees and `node_modules`)
- Tracks recent projects in `~/.config/ccmanager/recent-projects.json`
- Shows session counts per project as `[active/busy/waiting]`
- Vi-style `/` search for filtering
- Maintains separate session managers per project with background persistence

## Git Worktree Status Enhancement

Enable enhanced status display:

```bash
git config extensions.worktreeConfig true
```

Displays per-worktree: file changes (`+10 -5`), ahead/behind counts (`↑3 ↓1`), and parent branch name. CCManager stores parent branch as `ccmanager.parentBranch` in worktree-specific git config.

Status format: `<branch-name> [<ahead-behind> <parent>] <file-changes>`
Example: `feature/auth [↑5 ↓2 develop] +120 -45`

## Session Data Copying

When creating worktrees, CCManager can copy Claude Code session data to preserve conversation context:

- Source: `~/.claude/projects/[source-path]`
- Target: `~/.claude/projects/[target-path]`
- Enable by default in Global Configuration > Configure Worktree

## Auto Approval (Experimental)

Automatically evaluates waiting prompts and approves safe operations without manual intervention.

Enable via Global Configuration > Other & Experimental, or:

```json
{
  "autoApproval": {
    "enabled": true
  }
}
```

**How it works:**

1. Session enters waiting state
2. CCManager captures recent terminal output (up to 300 lines)
3. Runs approval helper (default: Claude Haiku) to evaluate safety
4. Auto-approves (sends Enter) or keeps paused for manual review

**Custom approval command:**

```json
{
  "autoApproval": {
    "enabled": true,
    "customCommand": "your-approval-tool"
  }
}
```

Custom command receives `DEFAULT_PROMPT` and `TERMINAL_OUTPUT` as environment variables. Must return JSON: `{"needsPermission": true|false, "reason"?: "string"}`. 60-second timeout; failures default to manual approval.

<critical>
- Auto-approval only sends Enter keypresses — not suitable for CLIs requiring arbitrary text input
- Press any key to interrupt and review manually
- Per-worktree toggle available (v3.7.3+)
</critical>

## Devcontainer Integration

Run AI sessions inside containers while managing from host:

```bash
ccmanager --devc-up-command "devcontainer up --workspace-folder ." \
          --devc-exec-command "devcontainer exec --workspace-folder ."
```

- `--devc-up-command`: Ensures container is running when a worktree is selected
- `--devc-exec-command`: Executes AI assistant inside the container
- CCManager auto-appends preset command after `--` separator
- All preset features (args, fallback) work with devcontainers
- Host retains status notifications and management capabilities

## Troubleshooting

- **Keyboard unresponsive after session**: Update to v3.7.4+ (fixed)
- **Worktree hooks not running**: Verify commands are in `PATH` and test manually first
- **Multi-project not finding repos**: Ensure directories contain `.git` folders, check `CCMANAGER_MULTI_PROJECT_ROOT` path, verify read permissions
- **Auto-directory conflict**: If directory exists, change branch name, modify pattern, or disable auto-generation temporarily
- **Git status not showing ahead/behind**: Run `git config extensions.worktreeConfig true` in the repository
- **Per-project config ignored**: Not supported in `--multi-project` mode — use global config instead
