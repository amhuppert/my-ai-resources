---
name: mb-status
description: This skill should be used to display a quick dashboard of memory bank status including active objectives and task progress.
allowed-tools: mcp__memory-bank__*
---

# Memory Bank Status Dashboard

Display a quick overview of memory bank status including objectives and task progress.

## Instructions

1. **Get Objectives:**
   - Call `mcp__memory-bank__list_objectives` with status="in_progress"
   - Call `mcp__memory-bank__list_objectives` with status="pending"

2. **Get Tasks for Each:**
   - For each objective, call `mcp__memory-bank__list_tasks` with the objective_slug

3. **Format Dashboard:**

```
## Memory Bank Status

### In Progress Objectives
- **objective-name** (slug)
  - Tasks: 3/5 completed
  - Linked features: auth, api

### Pending Objectives
- **other-objective** (other-slug)
  - Tasks: 0/2 completed

### Summary
- 2 objectives (1 in progress, 1 pending)
- 5 pending tasks total
```

4. **Handle Empty State:**
   - If no objectives exist, display: "No objectives in memory bank. Use /start-objective to create one."
