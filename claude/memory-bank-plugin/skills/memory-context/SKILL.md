---
name: memory-context
description: This skill should be used when the user needs context for their current work. It builds comprehensive context from the memory bank for the active objective or specified features.
argument-hint: "[objective-slug] [feature-slug...]"
allowed-tools: mcp__memory-bank__*, Read
---

# Build Memory Bank Context

Build comprehensive context from the memory bank for the active objective or specified features.

## Current Focus Frontmatter

!`bun run ${CLAUDE_PLUGIN_ROOT}/scripts/read-focus-frontmatter.ts`

## Arguments

$ARGUMENTS

## Instructions

### 1. Determine Slugs

- If `$ARGUMENTS` is provided:
  - First argument: use as objective_slug
  - Remaining arguments: use as feature_slugs
- If no arguments:
  - Use values from the injected frontmatter JSON:
    - `objective_slug` from frontmatter
    - `feature_slugs` from frontmatter

### 2. Build Context

- Call `mcp__memory-bank__build_context` with determined slugs:
  ```json
  {
    "objective_slug": "<objective_slug or null>",
    "feature_slugs": ["<feature1>", "<feature2>"]
  }
  ```
- Extract the context markdown from the response

### 3. Present Context

- Display the formatted context
- List key files with their descriptions
- Offer: "Would you like me to read any of these files into context?"

### 4. Optional File Reading

- If user selects files, use the Read tool to read them
- Present file contents to the user

## Example Usage

```
# Use active objective from focus.md
/memory-context

# Specify objective
/memory-context implement-oauth

# Specify objective and additional features
/memory-context implement-oauth auth api
```
