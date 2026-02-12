# Ralph for Claude Code - Reference Guide for AI Agents

<Overview>
Ralph is an autonomous AI development loop that wraps Claude Code CLI, executing it repeatedly against a project until all tasks are complete. It implements rate limiting, circuit breaker patterns, session continuity, and intelligent exit detection to enable safe, continuous autonomous development. Install once globally, then use `ralph --monitor` in any project with a `.ralph/` directory.
</Overview>

## Installation

```bash
# Clone and install globally (one time)
git clone https://github.com/frankbria/ralph-claude-code.git
cd ralph-claude-code
./install.sh

# Verify: commands install to ~/.local/bin/
ralph --help
```

**Prerequisites**: Bash 4.0+, Node.js/npm, jq, git, GNU coreutils (`timeout`/`gtimeout`), tmux (optional but recommended)

**Uninstall**:

```bash
./uninstall.sh
# or: ./install.sh uninstall
```

**Installed commands**: `ralph`, `ralph-monitor`, `ralph-setup`, `ralph-import`, `ralph-migrate`, `ralph-enable`, `ralph-enable-ci`

**Installed locations**:

- Commands: `~/.local/bin/`
- Scripts: `~/.ralph/` (ralph_loop.sh, ralph_monitor.sh, setup.sh, etc.)
- Libraries: `~/.ralph/lib/` (circuit_breaker.sh, response_analyzer.sh, etc.)
- Templates: `~/.ralph/templates/`

## Core Concepts

- **Loop cycle**: Read PROMPT.md → Execute Claude Code → Parse response → Check exit conditions → Repeat
- **Dual-condition exit gate**: Ralph exits only when BOTH `completion_indicators >= 2` AND Claude's explicit `EXIT_SIGNAL: true` are present
- **Circuit breaker pattern**: Three states (CLOSED → HALF_OPEN → OPEN) to halt runaway loops when no progress is detected
- **Session continuity**: Preserves Claude Code context across loop iterations via `--resume <session_id>`
- **Rate limiting**: Configurable hourly API call limit (default: 100/hour) with automatic countdown and reset
- **`.ralph/` directory**: All Ralph config and state files live in a `.ralph/` subfolder, keeping the project root clean

## Project Setup

### Option A: Enable in Existing Project (recommended)

```bash
cd my-existing-project

# Interactive wizard - detects project type, imports tasks
ralph-enable

# With specific task source
ralph-enable --from beads
ralph-enable --from github --label "sprint-1"
ralph-enable --from prd --prd ./docs/requirements.md

# Non-interactive for CI/automation
ralph-enable-ci
ralph-enable-ci --from github --json
```

### Option B: Import from PRD/Requirements

```bash
ralph-import requirements.md my-project
cd my-project
# Review .ralph/PROMPT.md, .ralph/fix_plan.md, .ralph/specs/
ralph --monitor
```

### Option C: New Project from Scratch

```bash
ralph-setup my-project
cd my-project
# Edit .ralph/PROMPT.md, .ralph/fix_plan.md
ralph --monitor
```

## Project File Structure

```
my-project/
├── .ralph/                  # Ralph configuration and state
│   ├── PROMPT.md            # Main instructions for Claude (EDIT THIS)
│   ├── fix_plan.md          # Prioritized task list with checkboxes (EDIT THIS)
│   ├── AGENT.md             # Build/test commands (auto-maintained)
│   ├── specs/               # Detailed requirements (add files as needed)
│   │   └── stdlib/          # Reusable patterns/conventions
│   ├── logs/                # Execution logs (auto-generated)
│   │   └── ralph.log        # Main log file
│   ├── docs/generated/      # Auto-generated documentation
│   ├── live.log             # Live streaming output
│   ├── status.json          # Machine-readable loop status
│   ├── .call_count           # Current hour's API call count
│   ├── .last_reset           # Last rate limit reset timestamp
│   ├── .exit_signals         # Exit signal tracking (JSON)
│   ├── .response_analysis    # Last response analysis (JSON)
│   ├── .circuit_breaker_state # Circuit breaker state (JSON)
│   ├── .claude_session_id    # Claude CLI session ID
│   ├── .ralph_session        # Ralph session tracking (JSON)
│   └── .ralph_session_history # Session transition log (JSON, last 50)
├── .ralphrc                 # Project configuration (bash-sourced)
└── src/                     # Your source code
```

### Key File Relationships

```
PROMPT.md (high-level goals, instructions for Claude)
    ↓
specs/ (detailed requirements when PROMPT.md isn't enough)
    ↓
fix_plan.md (specific checkbox tasks Ralph executes)
    ↓
AGENT.md (build/test commands - auto-maintained by Ralph)
```

## PROMPT.md Structure

The PROMPT.md file instructs Claude Code during each loop iteration. Key sections:

- **Context**: What Claude is building
- **Current Objectives**: High-level goals
- **Key Principles**: Development philosophy
- **Testing Guidelines**: Limit testing to ~20% effort
- **Status Reporting**: RALPH_STATUS block format (critical for exit detection)

### RALPH_STATUS Block (Required in PROMPT.md)

Claude must output this block at the end of every response:

```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary>
---END_RALPH_STATUS---
```

**EXIT_SIGNAL rules**:

- Set `true` only when ALL tasks complete, tests pass, no errors remain, all specs implemented
- Set `false` when work remains, even if current phase is complete
- Ralph uses this to prevent premature exits during productive iterations

## fix_plan.md Format

Standard markdown checkbox list with priority sections:

```markdown
## High Priority

- [ ] Implement user authentication
- [ ] Create database schema

## Medium Priority

- [ ] Add input validation
- [ ] Write integration tests

## Completed

- [x] Project initialization
- [x] Basic server setup
```

- Ralph counts `- [ ]` (unchecked) and `- [x]`/`- [X]` (checked) items
- All items checked → triggers `plan_complete` exit condition
- Indented checkboxes are supported

## Configuration (.ralphrc)

Bash-sourced configuration file. Environment variables override `.ralphrc` values.

| Variable                      | Default                                                  | Description                                        |
| ----------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `PROJECT_NAME`                | `"my-project"`                                           | Project identifier for logging                     |
| `PROJECT_TYPE`                | `"unknown"`                                              | `javascript`, `typescript`, `python`, `rust`, `go` |
| `MAX_CALLS_PER_HOUR`          | `100`                                                    | Rate limit ceiling                                 |
| `CLAUDE_TIMEOUT_MINUTES`      | `15`                                                     | Per-invocation timeout (1-120)                     |
| `CLAUDE_OUTPUT_FORMAT`        | `"json"`                                                 | `json` or `text` (legacy)                          |
| `ALLOWED_TOOLS`               | `"Write,Read,Edit,Bash(git *),Bash(npm *),Bash(pytest)"` | Comma-separated tool permissions                   |
| `SESSION_CONTINUITY`          | `true`                                                   | Maintain context across loops                      |
| `SESSION_EXPIRY_HOURS`        | `24`                                                     | Session auto-reset interval                        |
| `CB_NO_PROGRESS_THRESHOLD`    | `3`                                                      | Loops with no file changes before circuit opens    |
| `CB_SAME_ERROR_THRESHOLD`     | `5`                                                      | Loops with same error before circuit opens         |
| `CB_OUTPUT_DECLINE_THRESHOLD` | `70`                                                     | Output decline percentage to trigger circuit       |
| `RALPH_VERBOSE`               | `false`                                                  | Enable detailed progress logging                   |
| `TASK_SOURCES`                | `"local"`                                                | `local`, `beads`, `github` (comma-separated)       |
| `GITHUB_TASK_LABEL`           | `"ralph-task"`                                           | GitHub Issues label filter                         |

## CLI Reference

### ralph (main loop)

```bash
ralph [OPTIONS]
  -h, --help              Show help
  -c, --calls NUM         Max API calls per hour (default: 100)
  -p, --prompt FILE       Prompt file path (default: .ralph/PROMPT.md)
  -s, --status            Show current status JSON and exit
  -m, --monitor           Start with tmux integrated monitoring
  -v, --verbose           Detailed progress updates
  -l, --live              Real-time streaming output to .ralph/live.log
  -t, --timeout MIN       Per-execution timeout in minutes (1-120, default: 15)
  --output-format FORMAT  json (default) or text
  --allowed-tools TOOLS   Override tool permissions
  --no-continue           Disable session continuity
  --reset-circuit         Reset circuit breaker state
  --circuit-status        Show circuit breaker status
  --reset-session         Clear session state manually
  --resume ID             Resume a specific Claude session by ID
```

**Common usage patterns**:

```bash
ralph --monitor                    # Recommended: tmux dashboard
ralph --monitor --live             # With real-time Claude output
ralph --monitor --calls 50         # Lower rate limit
ralph --monitor --timeout 30       # Longer execution window
ralph --verbose --timeout 60       # Verbose with long timeout
ralph --no-continue                # Fresh context each loop
```

### ralph-enable (interactive wizard)

```bash
ralph-enable [OPTIONS]
  --from <source>      Task source: beads, github, prd
  --prd <file>         PRD file (with --from prd)
  --label <label>      GitHub label (with --from github)
  --force              Overwrite existing .ralph/
  --skip-tasks         Skip task import
  --non-interactive    Defaults without prompts
```

### ralph-enable-ci (non-interactive)

```bash
ralph-enable-ci [OPTIONS]
  --from <source>         Task source: beads, github, prd
  --project-type TYPE     Override auto-detection
  --json                  Machine-readable JSON output
```

Exit codes: 0 (success), 1 (error), 2 (already enabled)

### ralph-import (PRD conversion)

```bash
ralph-import <document> [project-name]
# Supports: .md, .txt, .json, .docx, .pdf
```

### ralph-setup (new project)

```bash
ralph-setup <project-name>
```

### ralph-monitor (dashboard)

```bash
ralph-monitor    # Separate terminal monitoring
```

### ralph-migrate (structure upgrade)

```bash
ralph-migrate    # Moves flat files → .ralph/ subfolder
```

## Exit Detection System

Ralph evaluates exit conditions after each loop iteration, in priority order:

| Priority | Condition           | Exit Reason              | Trigger                                              |
| -------- | ------------------- | ------------------------ | ---------------------------------------------------- |
| 0        | Permission denied   | `permission_denied`      | Claude denied tool access                            |
| 1        | Test-only loops     | `test_saturation`        | 3+ consecutive test-only loops                       |
| 2        | Done signals        | `completion_signals`     | 2+ consecutive done signals                          |
| 3        | Safety breaker      | `safety_circuit_breaker` | 5+ EXIT_SIGNAL=true responses                        |
| 4        | Dual-condition gate | `project_complete`       | `completion_indicators >= 2` AND `EXIT_SIGNAL: true` |
| 5        | Fix plan complete   | `plan_complete`          | All checkbox items in fix_plan.md checked            |

### Dual-Condition Exit Gate Detail

| completion_indicators | EXIT_SIGNAL | Result                          |
| --------------------- | ----------- | ------------------------------- |
| >= 2                  | `true`      | **EXIT**                        |
| >= 2                  | `false`     | Continue (Claude still working) |
| >= 2                  | missing     | Continue (defaults to false)    |
| < 2                   | `true`      | Continue (threshold not met)    |

## Circuit Breaker

Three states following the Release It! pattern:

- **CLOSED**: Normal operation, loop continues
- **HALF_OPEN**: Monitoring mode, checking for recovery
- **OPEN**: Execution halted, requires manual intervention or auto-recovery

**Triggers to OPEN**:

- 3 loops with no file changes (`CB_NO_PROGRESS_THRESHOLD`)
- 5 loops with identical errors (`CB_SAME_ERROR_THRESHOLD`)
- Output declines >70% (`CB_OUTPUT_DECLINE_THRESHOLD`)
- 2 loops with permission denials (`CB_PERMISSION_DENIAL_THRESHOLD`)

**State file**: `.ralph/.circuit_breaker_state` (JSON with state, counters, reason)

**Reset**: `ralph --reset-circuit`

## Session Management

- Sessions persist in `.ralph/.claude_session_id` with configurable expiration (default: 24 hours)
- Uses `--resume <session_id>` (not `--continue`) to prevent session hijacking
- Session history tracked in `.ralph/.ralph_session_history` (last 50 transitions)

**Auto-reset triggers**:

- Circuit breaker opens
- Manual interrupt (Ctrl+C)
- Project completion
- Manual reset (`--reset-session`)
- Session expiration (default: 24 hours)

## Response Analysis

The response analyzer (`lib/response_analyzer.sh`) handles three JSON formats:

1. **Flat format**: `{ status, exit_signal, work_type, files_modified }`
2. **Claude CLI object format**: `{ result, sessionId, metadata: { files_changed, has_errors } }`
3. **Claude CLI array format**: `[ {type: "system"}, {type: "assistant"}, {type: "result"} ]`

**Error detection** uses two-stage filtering:

1. Filter out JSON field patterns like `"is_error": false`
2. Match actual errors: `Error:`, `ERROR:`, `Exception`, `Fatal`

**Stuck loop detection**: Verifies ALL error lines appear in ALL recent history files using literal fixed-string matching (`grep -qF`)

## Rate Limiting

- Default: 100 API calls per hour
- Hourly reset with countdown display
- 5-hour Claude API limit detection with wait/exit prompt
- Call tracking persists across script restarts via `.ralph/.call_count`

## tmux Integration

`ralph --monitor` creates a 3-pane tmux session:

```
┌──────────────────┬──────────────────┐
│                  │ Claude Output    │
│  Ralph Loop      │ (tail live.log)  │
│                  ├──────────────────┤
│                  │ Status Monitor   │
│                  │ (ralph-monitor)  │
└──────────────────┴──────────────────┘
```

**tmux controls**:

- `Ctrl+B` then `D` → Detach (keeps running)
- `Ctrl+B` then `←/→` → Switch panes
- `tmux list-sessions` → View active sessions
- `tmux attach -t <name>` → Reattach

## Library Components

| File                       | Purpose                                                     |
| -------------------------- | ----------------------------------------------------------- |
| `lib/response_analyzer.sh` | Parse Claude output, detect completion, manage sessions     |
| `lib/circuit_breaker.sh`   | Stagnation detection, three-state circuit breaker           |
| `lib/date_utils.sh`        | Cross-platform ISO timestamps and epoch calculations        |
| `lib/timeout_utils.sh`     | Cross-platform timeout (`timeout` / `gtimeout`)             |
| `lib/enable_core.sh`       | Project detection, template generation, idempotency checks  |
| `lib/wizard_utils.sh`      | Interactive prompts, selection utilities, output formatting |
| `lib/task_sources.sh`      | Import tasks from beads, GitHub Issues, or PRD documents    |

## Configuring Ralph for a Project

### Step 1: Write PROMPT.md

Define what Claude should build. Include:

- Project context and technology stack
- Current objectives (prioritized)
- Key principles and constraints
- The RALPH_STATUS block template (always include this)

### Step 2: Write fix_plan.md

Create a prioritized checkbox list of tasks:

- High/Medium/Low priority sections
- One task per checkbox
- Be specific and actionable
- Ralph marks items complete as it works

### Step 3: Add specs/ if needed

- Simple projects: PROMPT.md + fix_plan.md is sufficient
- Complex features: Add `specs/feature-name.md` for detailed requirements
- Team conventions: Add `specs/stdlib/convention-name.md`

### Step 4: Configure .ralphrc

Adjust tool permissions and loop settings for your project:

```bash
ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(npm *),Bash(cargo *)"
CLAUDE_TIMEOUT_MINUTES=30
MAX_CALLS_PER_HOUR=50
```

### Step 5: Run

```bash
ralph --monitor
```

## Troubleshooting

| Issue                                | Solution                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Ralph exits too early                | Check if `EXIT_SIGNAL: false` in PROMPT.md instructions; review exit thresholds       |
| Ralph won't exit                     | Verify fix_plan.md items are being checked off; check RALPH_STATUS block in PROMPT.md |
| Permission denied halt               | Update `ALLOWED_TOOLS` in `.ralphrc`, then `ralph --reset-session`                    |
| Stuck loop / circuit open            | `ralph --reset-circuit` and review fix_plan.md for unclear tasks                      |
| `timeout: command not found` (macOS) | `brew install coreutils`                                                              |
| Session expired                      | Sessions expire after 24h by default; use `--reset-session` to start fresh            |
| Lost tmux session                    | `tmux list-sessions` then `tmux attach -t <name>`                                     |
| 5-hour API limit                     | Ralph detects and prompts: wait 60 min or exit                                        |

## Testing (Development)

```bash
npm install    # Install bats testing framework
npm test       # Run all tests (465 tests)
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
bats tests/unit/test_cli_parsing.bats  # Individual test file
```

Test framework: [BATS](https://github.com/bats-core/bats-core) (Bash Automated Testing System)
