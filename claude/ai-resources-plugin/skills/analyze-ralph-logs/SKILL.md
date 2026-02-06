---
name: analyze-ralph-logs
description: This skill should be used when analyzing Ralph Loop workflow executions to diagnose failures, understand execution flow, or review what happened during the most recent run. Use when the user says "analyze ralph logs", "what happened with ralph", "ralph stopped", "ralph failed", "debug ralph", or wants to understand why a Ralph Loop execution ended unexpectedly.
---

# Analyze Ralph Logs

Diagnose Ralph Loop workflow executions by analyzing logs, state files, and error conditions. Provides failure analysis with concrete solutions.

## Overview

The Ralph Loop is an autonomous development system that executes Claude Code in iterations. When execution stops unexpectedly or behaves incorrectly, this skill provides a systematic approach to diagnose the cause and propose solutions.

## Quick Reference: Log File Locations

| File                                                | Purpose                                            | Format           |
| --------------------------------------------------- | -------------------------------------------------- | ---------------- |
| `.ralph/logs/ralph.log`                             | Main loop activity log                             | Timestamped text |
| `.ralph/logs/claude_output_YYYY-MM-DD_HH-MM-SS.log` | Per-execution Claude output                        | JSON or text     |
| `.ralph/status.json`                                | Current loop/API status                            | JSON             |
| `.ralph/.response_analysis`                         | Latest response analysis                           | JSON             |
| `.ralph/.circuit_breaker_state`                     | Circuit breaker state                              | JSON             |
| `.ralph/.exit_signals`                              | Rolling exit signal tracking                       | JSON             |
| `.ralph/.ralph_session`                             | Session lifecycle tracking                         | JSON             |
| `.ralph/live.log`                                   | Real-time streaming output (when `--live` enabled) | Text/JSON        |

## Diagnostic Workflow

### Step 1: Identify the Most Recent Execution

Find and read the most recent Claude output log:

```bash
ls -lt .ralph/logs/claude_output_*.log | head -1
```

Read this file to understand what Claude was doing in its last execution.

### Step 2: Read Key State Files

Read these files in parallel to understand the current state:

1. **`.ralph/status.json`** - Shows current loop count, API call usage, and last action
2. **`.ralph/.response_analysis`** - Shows how the last response was analyzed
3. **`.ralph/.circuit_breaker_state`** - Shows if stagnation was detected
4. **`.ralph/.exit_signals`** - Shows recent completion/test-only/done signals
5. **`.ralph/.ralph_session`** - Shows session lifecycle and any resets

### Step 3: Read Recent Loop Activity

Read the last 100 lines of the main loop log:

```bash
tail -100 .ralph/logs/ralph.log
```

Look for:

- Error messages (lines containing `[ERROR]`)
- Warning messages (lines containing `[WARN]`)
- State transitions (circuit breaker, session resets)
- Exit conditions

### Step 4: Diagnose the Failure

Match observations against the failure modes in the "Failure Modes Reference" section below.

### Step 5: Propose Solution

Based on the diagnosed failure mode, propose a concrete solution from the reference.

## Failure Modes Reference

### 1. Circuit Breaker Opened (Stagnation)

<failure-mode>
**Symptoms:**
- `.ralph/.circuit_breaker_state` shows `"state": "OPEN"`
- ralph.log contains "Circuit breaker OPEN"
- Execution halted without explicit completion

**Diagnosis:**
Check `consecutive_no_progress` and `consecutive_same_error` counts in circuit breaker state.

**Root Causes:**

- Claude making no file changes across multiple loops (no git diff)
- Same error repeating without resolution
- Output size declining significantly (>70% decline)

**Solutions:**

1. Review the task list in `.ralph/fix_plan.md` - tasks may be too vague
2. Check `.ralph/PROMPT.md` for unclear instructions
3. Reset circuit breaker and try again: `ralph --reset-circuit`
4. If same error repeats, manually fix the underlying issue before continuing
   </failure-mode>

### 2. Permission Denied

<failure-mode>
**Symptoms:**
- `.ralph/.response_analysis` shows `"has_permission_denials": true`
- ralph.log contains "Permission denied" or "HALT"
- Execution stopped immediately

**Diagnosis:**
Check `denied_commands` array in response analysis to see which tools were blocked.

**Root Causes:**

- `.ralphrc` `ALLOWED_TOOLS` missing required tool patterns
- Claude attempting tool not in allowlist

**Solutions:**

1. Review denied commands in `.ralph/.response_analysis`
2. Update `ALLOWED_TOOLS` in `.ralphrc` to include needed patterns:
   ```bash
   ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(npm *),Bash(pytest)"
   ```
3. Use wildcard patterns for command families: `Bash(npm *)` allows all npm commands
4. Reset session after fixing: `ralph --reset-session`
   </failure-mode>

### 3. Timeout Error

<failure-mode>
**Symptoms:**
- ralph.log shows timeout message
- Claude output log may be truncated or missing
- Exit code 124 mentioned in logs

**Diagnosis:**
Check if execution consistently times out at same point.

**Root Causes:**

- Task too complex for single iteration
- Infinite loop in Claude's execution
- Slow tests or builds exceeding timeout

**Solutions:**

1. Increase timeout: `ralph --timeout 30` (minutes, max 120)
2. Set in `.ralphrc`: `CLAUDE_TIMEOUT_MINUTES=30`
3. Break large tasks into smaller items in `.ralph/fix_plan.md`
4. If tests are slow, consider marking some as skipped initially
   </failure-mode>

### 4. 5-Hour API Rate Limit

<failure-mode>
**Symptoms:**
- ralph.log contains "5.*hour.*limit" or "limit.*reached"
- Execution prompted for wait/exit choice
- Loop stopped or waiting

**Diagnosis:**
This is an Anthropic API limit, not a Ralph configuration issue.

**Solutions:**

1. Wait 60 minutes for limit to reset
2. Reduce work scope to complete within limit
3. Use `--calls` flag to limit API calls per hour
4. Check `.ralph/.call_count` to see current hour's usage
   </failure-mode>

### 5. Test-Only Loop Saturation

<failure-mode>
**Symptoms:**
- `.ralph/.exit_signals` shows multiple entries in `test_only_loops` array
- ralph.log mentions "test_saturation" exit reason
- Loop exited after 3 consecutive test-only iterations

**Diagnosis:**
Claude is only running tests without implementing changes.

**Root Causes:**

- All implementation tasks marked complete
- Claude stuck in verification mode
- Tests failing repeatedly without code changes

**Solutions:**

1. Review `.ralph/fix_plan.md` for incomplete implementation tasks
2. Check if tests are failing - fix underlying issues
3. Add specific implementation tasks if only tests remain
4. Clear exit signals and restart: `ralph --reset-session`
   </failure-mode>

### 6. Premature Completion Exit

<failure-mode>
**Symptoms:**
- Loop exited with "project_complete" reason
- Work clearly not finished
- `.ralph/.exit_signals` shows multiple `completion_indicators`

**Diagnosis:**
Claude signaled completion (EXIT_SIGNAL: true) with multiple completion indicators.

**Root Causes:**

- Ambiguous completion criteria in PROMPT.md
- Task list fully checked but work incomplete
- Claude misinterpreting "done" signals

**Solutions:**

1. Add explicit completion criteria to `.ralph/PROMPT.md`
2. Ensure `.ralph/fix_plan.md` has unchecked tasks for remaining work
3. Use explicit "do not exit until X" instructions in prompt
4. Reset and add new tasks: `ralph --reset-session`
   </failure-mode>

### 7. Session Issues

<failure-mode>
**Symptoms:**
- Context appears lost between loops
- Claude asking about already-completed work
- `.ralph/.ralph_session` shows recent `reset_at` timestamp

**Diagnosis:**
Check session file for reset reasons and last_used timestamps.

**Root Causes:**

- Session expired (default 24 hours)
- Manual reset triggered
- Circuit breaker or error caused reset

**Solutions:**

1. Increase session expiry: `SESSION_EXPIRY_HOURS=48` in `.ralphrc`
2. Check reset_reason in session file
3. If intentional reset, continue normally - context rebuilds
4. For critical context, add to PROMPT.md explicitly
   </failure-mode>

### 8. Claude Code Execution Failure

<failure-mode>
**Symptoms:**
- ralph.log shows "Claude Code failed" or non-zero exit code
- Output log may be empty or contain error message
- Loop retried after 30-second wait

**Diagnosis:**
Read the Claude output log for error details.

**Root Causes:**

- Claude Code CLI not installed or not in PATH
- Authentication issues
- Network connectivity problems
- Invalid command construction

**Solutions:**

1. Verify Claude Code is installed: `claude --version`
2. Check authentication: `claude` (should prompt or show ready)
3. Check network connectivity
4. Review ralph.log for the exact command that failed
   </failure-mode>

### 9. JSON Parsing Issues

<failure-mode>
**Symptoms:**
- `.ralph/.response_analysis` shows parsing errors or fallback to text mode
- `output_format` shows unexpected value
- Analysis results incomplete

**Diagnosis:**
Read the raw Claude output log - check if it's valid JSON.

**Root Causes:**

- Claude output truncated
- Mixed JSON/text output
- Claude Code output format changed

**Solutions:**

1. Ensure `CLAUDE_OUTPUT_FORMAT=json` in `.ralphrc`
2. Try text mode as fallback: `--output-format text`
3. Check if output is being truncated (timeout or size limit)
4. Review Claude Code version compatibility
   </failure-mode>

### 10. No Progress Detected

<failure-mode>
**Symptoms:**
- Circuit breaker shows increasing `consecutive_no_progress`
- No git changes detected
- Claude appears to be working but nothing changes

**Diagnosis:**
Check git status and compare to loop start SHA.

**Root Causes:**

- Claude making changes outside git tracking
- Changes reverted or overwritten
- Read-only operations (research, analysis)
- Working in wrong directory

**Solutions:**

1. Check `git status` for untracked files
2. Verify working directory matches project root
3. If research phase, add explicit "create file X" tasks
4. Check if `.gitignore` is excluding changed files
   </failure-mode>

## Reading JSON State Files

When reading `.ralph/*.json` files, extract these key fields:

### status.json

```json
{
  "loop_count": 42, // Total iterations
  "calls_made_this_hour": 15, // API usage
  "status": "running", // running|stopped|complete
  "exit_reason": "" // Why it stopped
}
```

### .circuit_breaker_state

```json
{
  "state": "CLOSED", // CLOSED|HALF_OPEN|OPEN
  "consecutive_no_progress": 0, // Loops without changes
  "consecutive_same_error": 0, // Repeated errors
  "consecutive_permission_denials": 0, // Permission blocks
  "reason": "" // Why state changed
}
```

### .response_analysis

```json
{
  "loop_number": 42,
  "analysis": {
    "has_completion_signal": false,
    "is_test_only": false,
    "has_progress": true,
    "exit_signal": false, // Claude says done
    "has_permission_denials": false,
    "denied_commands": [] // Blocked tools
  }
}
```

### .exit_signals

```json
{
  "test_only_loops": [], // Recent test-only iterations
  "done_signals": [], // Recent completion signals
  "completion_indicators": [] // Loops with EXIT_SIGNAL=true
}
```

## Example Analysis Session

<example>
<user-request>
Ralph stopped unexpectedly after about 20 loops. What happened?
</user-request>

<diagnostic-steps>
1. Find most recent log: `ls -lt .ralph/logs/claude_output_*.log | head -1`
2. Read in parallel:
   - `.ralph/status.json`
   - `.ralph/.circuit_breaker_state`
   - `.ralph/.response_analysis`
3. Read tail of `.ralph/logs/ralph.log`
4. Analyze findings
</diagnostic-steps>

<findings>
- status.json: `"status": "stopped", "exit_reason": "stagnation_detected"`
- circuit_breaker_state: `"state": "OPEN", "consecutive_no_progress": 3`
- ralph.log: Shows 3 loops with no git changes, then circuit breaker opened
</findings>

<diagnosis>
Circuit breaker opened due to stagnation. Claude was working but not making file changes for 3 consecutive loops. This typically means:
- Task too vague to produce concrete output
- Claude stuck in analysis/planning mode
- Required changes blocked by permissions
</diagnosis>

<solution>
1. Review `.ralph/fix_plan.md` - make tasks more specific with concrete deliverables
2. Check `.ralph/.response_analysis` for permission denials
3. Reset and restart: `ralph --reset-circuit --reset-session`
4. Consider adding explicit "create file X" or "modify Y" tasks
</solution>
</example>

## Configuration Reference

Key `.ralphrc` settings that affect execution:

```bash
# Rate limiting
MAX_CALLS_PER_HOUR=100          # API calls per hour limit
CLAUDE_TIMEOUT_MINUTES=15       # Per-execution timeout

# Tool permissions
ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(npm *)"

# Session management
SESSION_CONTINUITY=true         # Maintain context across loops
SESSION_EXPIRY_HOURS=24         # Session lifetime

# Circuit breaker thresholds
CB_NO_PROGRESS_THRESHOLD=3      # Opens after N no-progress loops
CB_SAME_ERROR_THRESHOLD=5       # Opens after N repeated errors
CB_OUTPUT_DECLINE_THRESHOLD=70  # Opens if output declines >70%
```

## Command Reference

Useful commands for recovery:

```bash
# Show current status
ralph --status

# Show circuit breaker state
ralph --circuit-status

# Reset circuit breaker only
ralph --reset-circuit

# Reset session only
ralph --reset-session

# Reset both and restart
ralph --reset-circuit --reset-session

# Start with increased timeout
ralph --timeout 30

# Start with verbose logging
ralph --verbose

# Start with live output
ralph --live
```
