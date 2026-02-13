---
name: changes-tour-guide
description: This skill should be used when the user wants to create a code change review guide that walks through recent code changes in a clear, pedagogical manner. Produces a two-phase markdown walkthrough (high-level overview then detailed explanations) organized in logical dependency order.
allowed-tools: Read, Write, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git show:*)
---

# Code Change Review Guide Creator

Create a structured markdown document that walks a reader through code changes in a clear, logical, and pedagogical manner using a two-phase approach.

## User Scope

<user_scope>
$ARGUMENTS
</user_scope>

## Git Context

```
% git log --oneline -20
!`git log --oneline -20`

% git status --short
!`git status --short`

% git diff --stat
!`git diff --stat`

% git diff --cached --stat
!`git diff --cached --stat`
```

## Determining What to Review

Determine which code changes to include in this review guide:

- If the user provided specific scope or direction in user_scope above, focus on those changes
- If no specific scope is provided, use conversation history and git context to identify the most recent or relevant code changes
- Use `git diff`, `git show`, or read files directly to gather full change details

## Planning (in thinking block)

Before writing the review guide, plan your approach inside a `<planning>` section in your thinking block:

1. **List all changed files** with a brief description of what changed in each
2. **Determine logical order**: foundational changes before dependent ones, each change builds on previous understanding
3. **Identify high-level concepts**: architectural decisions, design patterns, key concepts to explain before implementation details
4. **Note important design decisions**: significant choices, alternatives considered, tradeoffs
5. **Plan two-phase structure**: write an explicit mapping showing which files appear in which order in both Phase 1 and Phase 2 — the order MUST be consistent across both phases

Thorough planning leads to better guides. It's OK for the planning section to be long.

## Writing the Review Guide

### Structure (required)

**Phase 1: High-Level Overview**

- Brief explanation of each file/component that changed
- Concise — just enough to understand what and why
- Follow the logical order from planning

**Phase 2: Detailed Walkthrough**

- Detailed explanations for each file/component
- SAME order as Phase 1
- Include implementation details, code snippets, thorough explanations
- Focus on the "why" and "how", not just the "what"

### Content Guidelines

**Include:**

- High-level summary of all changes
- Key architectural or design decisions with rationale
- Alternatives considered and why they were rejected
- Notable implementation details
- Tradeoffs or limitations
- Code snippets where helpful to illustrate key points

**Avoid:**

- Line-by-line code explanations
- Trivial changes unless relevant to understanding
- Excessive jargon without explanation
- Presenting details before needed context
- Including every line of changed code

### Writing Style

- Clear and concise — a guided tour, not exhaustive documentation
- Explain reasoning behind key decisions
- Help the reader understand rationale and approach
- Language appropriate for developers familiar with the codebase

### Formatting

- Use headers (##, ###) to organize sections logically
- Use code blocks with syntax highlighting when showing code
- Use bullet points or numbered lists where appropriate
- Use bold/italic for emphasis

## Output

After completing planning in the thinking block, write the review guide inside `<review_guide>` tags following this structure:

```
<review_guide>
# Code Change Review Guide

## Overview
[High-level summary of all changes]

## Phase 1: High-Level Overview

### [First Component/File - in logical order]
[Brief explanation]

### [Second Component/File - in logical order]
[Brief explanation]

## Phase 2: Detailed Walkthrough

### [First Component/File - same order as Phase 1]
[Detailed explanation with code snippets and rationale]

### [Second Component/File - same order as Phase 1]
[Detailed explanation with code snippets and rationale]

## Summary
[Key takeaways]
</review_guide>
```

Save the guide as a markdown file in the `memory-bank/` directory with a descriptive filename based on the changes reviewed (e.g., `memory-bank/auth-refactor-review-guide.md`). The final output should contain only the review guide — do not duplicate planning work from the thinking block.
