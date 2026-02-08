---
name: jog-users-memory
description: This skill should be used when the user returns after being away and needs a quick memory jog about current progress, upcoming steps, and open questions. Provides a brief, scannable summary—not a comprehensive report.
allowed-tools: Read, Bash(git log:*), Bash(git status:*), Bash(git diff:*)
---

# Context Refresh

Quick memory jog for returning to work after being away.

## Instructions

### 1. Gather Context (parallel where possible)

**From git:**

- Run `git log --oneline -15` to see recent commits
- Run `git status --short` to see uncommitted work

**From focus.md:**

- Read `memory-bank/focus.md` 

**From current conversation:**

- Read the current conversation

### 2. Present Summary

Format output as a brief, scannable summary using this structure:

```
## Context Refresh

### Current Objective
**<name>** — <one-line description>
Status: <status>

### Progress
- Completed: <brief list of completed task texts>
- **Up next:** <next 1-3 pending tasks>

### Recent Activity
<last 5-8 commits, one line each>

### Uncommitted Work
<git status summary, or "Clean working tree">
```

### 4. Formatting Rules

- Keep the entire output under 40 lines
- Omit any section that has no data
- Use bold for the single most important next action
- Do not read or summarize code files—this is a status overview only
- Do not offer follow-up actions unless the user asks
