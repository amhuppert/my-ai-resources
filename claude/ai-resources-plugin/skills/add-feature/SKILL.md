---
name: add-feature
description: This skill should be used when the user wants to add a feature to the memory bank. It researches the feature by finding related files, requirements, and codebase patterns, then uses parallel subagents to explore different areas before consolidating a plan for user approval.
argument-hint: "<feature-description>"
allowed-tools: Task, AskUserQuestion, Read, Glob, Grep, mcp__memory-bank__*
---

# Add Feature to Memory Bank

Research and add a feature to the memory bank with related files, requirements, and context.

## Feature to Add

<feature>
$ARGUMENTS
</feature>

## Instructions

Follow these steps precisely:

### Phase 1: Initial Analysis

1. Parse the feature description to identify:
   - Feature name (derive a slug: lowercase, hyphens, e.g., `user-authentication`, `api/rate-limiting`)
   - High-level scope and boundaries
   - Keywords for codebase search

2. Perform quick codebase reconnaissance:
   - Use Glob to find potentially related files by name patterns
   - Use Grep to search for relevant keywords
   - Identify 2-4 distinct research areas (e.g., "API layer", "database models", "UI components", "tests")

3. Create a research plan in `<research-plan>` tags listing:
   - The research areas you identified
   - What each area should investigate
   - What questions each should answer

### Phase 2: Parallel Research (2-4 Subagents)

Launch 2-4 Task agents in parallel (use a single message with multiple Task tool calls). Each agent should:

- Focus on one research area from your plan
- Find relevant files with their purposes
- Identify requirements, constraints, or patterns
- Note any "use when" conditions for files

**Subagent prompt template:**

```
Research the "{area}" aspect of the "{feature}" feature in this codebase.

Find:
1. All files related to {area} for this feature
2. For each file: path, brief description, and "use when" condition (when would an AI need this file?)
3. Any requirements or constraints you discover
4. Patterns or conventions used

Return a structured summary with:
- Files found (path, description, use_when)
- Requirements discovered
- Key patterns/conventions
```

Use `subagent_type: "Explore"` for research agents.

### Phase 3: Consolidate Findings

After all subagents complete:

1. Merge and deduplicate file lists
2. Categorize requirements
3. Determine the feature hierarchy (is this a sub-feature of something?)
4. Create a consolidated plan in `<consolidated-plan>` tags with:

```markdown
## Feature: {readable_name}

Slug: {slug}
Description: {description}

## Files to Add ({count})

| Path | Description | Use When |
| ---- | ----------- | -------- |
| ...  | ...         | ...      |

## Requirements ({count})

- {requirement_text}
  - Notes: {any_notes}

## Parent Feature (if applicable)

{parent_slug or "None - top-level feature"}
```

### Phase 4: User Approval

Present the consolidated plan and use **AskUserQuestion** to get approval:

```
question: "Does this plan look correct for adding the '{feature}' feature to memory bank?"
header: "Approve plan"
options:
  - label: "Approve"
    description: "Add feature, files, and requirements to memory bank"
  - label: "Modify"
    description: "I'll provide corrections before you proceed"
  - label: "Cancel"
    description: "Don't add anything to memory bank"
```

### Phase 5: Execute (After Approval)

If approved, use memory-bank MCP tools to add the data:

1. **Create feature**: `mcp__memory-bank__create_feature`
   - slug, name, description

2. **Add paths**: `mcp__memory-bank__create_path` for each file
   - path, description, use_when (optional)
   - Then `mcp__memory-bank__link_feature_path` to associate with feature

3. **Add requirements**: `mcp__memory-bank__create_requirement` for each
   - feature_slug, requirement_text, notes (optional JSON array)

4. Confirm completion with summary of what was added.

If user selects "Modify", incorporate their feedback and return to Phase 4.
If user selects "Cancel", acknowledge and stop.

## Important Guidelines

- Always derive a sensible slug from the feature name (lowercase, hyphens, hierarchical with `/`)
- Be thorough in research - the memory bank should capture comprehensive context
- Files should have actionable "use when" conditions that help AI agents know when to read them
- Requirements should be specific and testable where possible
- Don't add files that are clearly unrelated even if they match keywords
