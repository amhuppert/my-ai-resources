---
name: complete-objective
description: This skill should be used when completing an objective. It verifies task completion, captures learnings, updates the objective status, and clears focus.md.
argument-hint: "[objective-slug]"
allowed-tools: mcp__memory-bank__*, AskUserQuestion, Read, Bash(bun run:*)
---

# Complete Objective

Complete an objective by verifying task completion, capturing learnings, and clearing focus.md.

## Current Focus Frontmatter

!`bun run ${CLAUDE_PLUGIN_ROOT}/scripts/read-focus-frontmatter.ts`

## Arguments

$ARGUMENTS

## Instructions

### 1. Get Objective

- Use `$ARGUMENTS` as slug if provided
- Otherwise use `objective_slug` from injected frontmatter
- Call `mcp__memory-bank__get_objective_context` with the slug

### 2. Review Tasks

- Display all tasks with their status
- Count: completed, in_progress, pending
- If incomplete tasks exist, use AskUserQuestion:
  - Question: "Some tasks are not completed. How would you like to proceed?"
  - Options:
    - "Mark all complete"
    - "Update individual tasks"
    - "Cancel completion"

### 3. Reflect and Propose Learnings

- Review the objective context, tasks completed, and work done during this session
- Identify potential learnings worth recording:
  - New requirements discovered during implementation
  - Constraints or edge cases encountered
  - Patterns or conventions established
  - Dependencies or integration points identified
- If you identify learnings to record:
  - Present proposed additions to the user with clear descriptions
  - Use AskUserQuestion to confirm:
    - Question: "I've identified the following learnings to add to the memory bank. Approve these additions?"
    - Options:
      - "Approve all"
      - "Approve with modifications" (user can specify changes)
      - "Skip learnings"
  - If approved, call `mcp__memory-bank__create_requirements` for each learning
- If no meaningful learnings identified, proceed to step 4 without prompting

### 4. Complete Objective

- Call `mcp__memory-bank__update_objective` with:
  ```json
  {
    "slug": "<slug>",
    "status": "completed"
  }
  ```

### 5. Clear focus.md

- Run: `bun run ${CLAUDE_PLUGIN_ROOT}/scripts/write-focus-frontmatter.ts clear-objective`

### 6. Confirmation

- Display completion summary:
  - Objective name and slug
  - Number of tasks completed
  - Any learnings captured
  - Confirmation that focus.md has been cleared

## Example Usage

```
# Complete active objective from focus.md
/complete-objective

# Complete specific objective
/complete-objective implement-oauth
```
