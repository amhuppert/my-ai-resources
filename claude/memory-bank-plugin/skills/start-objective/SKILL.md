---
name: start-objective
description: This skill should be used when starting work on a new or existing objective. It creates/resumes objectives, links features, creates tasks, builds context, and updates focus.md.
argument-hint: "<objective-description-or-existing-slug>"
allowed-tools: mcp__memory-bank__*, Task, AskUserQuestion, Read, Glob, Grep, Bash(bun run:*)
---

# Start or Resume Objective

Start work on a new objective or resume an existing one. Updates focus.md frontmatter for session context.

## Current Focus Frontmatter

!`bun run ${CLAUDE_PLUGIN_ROOT}/scripts/read-focus-frontmatter.ts`

## Arguments

$ARGUMENTS

## Instructions

### 1. Check if Argument is Existing Slug

- Call `mcp__memory-bank__get_objective` with the argument as slug
- If success: Go to **Resume Mode**
- If not_found error: Go to **Create Mode**

### 2. Resume Mode

1. Call `mcp__memory-bank__build_context` with the objective_slug
2. Run: `bun run ${CLAUDE_PLUGIN_ROOT}/scripts/write-focus-frontmatter.ts set-objective <slug>`
3. Present context to user
4. List pending tasks with their status

### 3. Create Mode

1. **Derive identifiers from description:**
   - Slug: lowercase, hyphens, e.g., "implement-oauth"
   - Name: Readable title

2. **Confirm with user:**
   - Use AskUserQuestion to confirm name and slug
   - Options: "Use suggested", "Modify slug", "Modify name", "Other"

3. **Search for related files:**
   - Use Glob/Grep to search codebase for files related to the objective
   - Present findings to user

4. **Link features:**
   - Call `mcp__memory-bank__list_features` to show available features
   - Ask user which features to link (or if they want to create new ones)
   - If features selected, call `mcp__memory-bank__link_objective_to_features`

5. **Create objective:**
   - Call `mcp__memory-bank__create_objective` with:
     ```json
     {
       "slug": "<slug>",
       "name": "<name>",
       "description": "<description>",
       "status": "in_progress"
     }
     ```

6. **Create initial tasks:**
   - Ask user for initial tasks to track
   - If provided, call `mcp__memory-bank__create_tasks`

7. **Update focus.md:**
   - Run: `bun run ${CLAUDE_PLUGIN_ROOT}/scripts/write-focus-frontmatter.ts set-objective <slug>`

8. **Build and present context:**
   - Call `mcp__memory-bank__build_context`
   - Present context summary to user

## Example Usage

```
# Resume existing objective
/start-objective implement-oauth

# Create new objective
/start-objective "Add user authentication with OAuth support"
```
