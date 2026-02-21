---
name: fix-merge-conflicts
description: This skill should be used when the user asks to "fix merge conflicts", "resolve merge conflicts", "help with merge conflicts", "fix conflicts", "resolve conflicts", "finish the merge", "conflicts after rebase", or when git status shows unmerged paths or merge conflict markers (<<<<<<< / ======= / >>>>>>>).
allowed-tools: Bash, Read, Edit, Glob, Grep
---

# Fix Merge Conflicts

Resolve git merge conflicts systematically by understanding the intent behind conflicting changes before proposing resolutions.

## Current State

!git status

## Resolution Workflow

Follow all five phases in order. Complete analysis and receive user approval before implementing any changes.

### Phase 1: Analyze the Changes

Examine what changed in each branch:

- Determine the conflict source: check for `MERGE_HEAD` (merge), `REBASE_HEAD` (rebase), or `CHERRY_PICK_HEAD` (cherry-pick) to identify the operation in progress
- Run `git log --oneline --graph HEAD <source_HEAD>` to see commit history on both sides
- Run `git diff --name-only --diff-filter=U` to list all files with conflicts
- Use `git show` on commits that modified the conflicting files
- Use `git diff HEAD...<source_HEAD> -- <file>` to see branch-level differences
- Read conflicting files and examine conflict markers in context — look beyond the marked lines to surrounding code

### Phase 2: Understand Intent

From the analysis, identify:

- The purpose behind each branch's changes (feature, bugfix, refactor, etc.)
- What problem each set of changes solves
- Dependencies between conflicting changes and the rest of the codebase
- Whether changes are complementary, contradictory, or independent

### Phase 3: Plan the Resolution

Determine the resolution strategy:

- Can both sets of changes coexist?
- Should one take precedence? If so, which and why?
- Is a hybrid approach combining elements of both appropriate?
- Are modifications needed beyond the conflicting sections?
- What risks or edge cases exist?

### Phase 4: Propose the Resolution

Present the resolution plan to the user before making any changes. Include:

- Summary of what changed in each branch and why
- Recommended approach for each conflicting file
- Reasoning behind each recommendation
- Risks, edge cases, or open questions

### Phase 5: Implement

Implement changes ONLY after the user explicitly approves the resolution plan.

After approval:

- Edit conflicting files to apply the approved resolution
- Remove all conflict markers
- Run `git diff` to verify the resolution looks correct
- Stage resolved files with `git add`

## Guidelines

- Prioritize understanding intent over mechanical marker removal
- Consider the broader codebase impact, not just the conflicting lines
- When intent is ambiguous, ask the user for clarification
- For complex conflicts touching many files, resolve and present one file at a time
- For binary file conflicts, ask the user which version to keep — binary files cannot be merged by editing markers
