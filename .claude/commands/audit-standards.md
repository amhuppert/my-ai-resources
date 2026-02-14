---
name: audit-standards
description: This skill should be used when the user asks to "audit code standards", "review standards for consistency", "check standards files", "find inconsistencies in standards", or "identify standard conflicts". Identifies ambiguities, discrepancies, and contradictions across code standards documentation, then guides interactive resolution.
required-context: |
  - Project code standards in agent-docs/code-standards/
  - Understanding of project conventions
allowed-tools:
  - Read(*):read
  - Glob(*):use
  - Grep(*):use
  - AskUserQuestion(*):use
  - Edit(*):edit
---

# Code Standards Audit

Conduct a comprehensive audit of code standards documentation to identify and resolve inconsistencies.

## Purpose

This skill systematically reviews all standards files to surface ambiguities, contradictions, and discrepancies. The audit identifies issues, presents findings to the user, collects resolution decisions, and applies fixes automatically.

## Audit Workflow

Execute the audit in the following sequence:

### 1. Scan All Standards Files

Read all markdown files in `agent-docs/code-standards/` to understand the current documentation landscape.

### 2. Identify Issue Categories

Analyze files for these categories of inconsistencies:

**Critical contradictions** - Rules that directly conflict (e.g., "use X" vs "don't use X")

**Ambiguities** - Guidance that's unclear or missing context

**Inconsistent patterns** - Similar concepts named or structured differently (e.g., store naming)

**Incomplete standards** - Missing documentation or examples

**Internal inconsistencies** - Contradictions within a single document

### 3. Organize and Present Findings

Group findings by:

- **Severity** (critical, important, minor)
- **Category** (contradictions, naming, structure, etc.)
- **Affected files** (which standards are involved)
- **Context** (what the conflict is about)

Provide clear examples of each issue found.

### 4. Get Resolution Input

For each issue, ask the user:

- How to resolve the conflict
- Which approach aligns with project philosophy
- Any nuances or exceptions needed

Use `AskUserQuestion` to collect decisions interactively.

### 5. Apply Fixes

Once decisions are collected, automatically update all affected files:

- Update conflicting guidance
- Add clarifications and exceptions
- Ensure consistent naming and structure
- Add missing documentation

Commit changes with a summary message.
