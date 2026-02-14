---
name: audit-standards
description: Audit code standards files for ambiguities, discrepancies, and contradictions. Reviews all files in agent-docs/code-standards, identifies issues, and helps resolve them interactively.
required-context: |
  - All code standards markdown files in agent-docs/code-standards/
  - Project conventions and patterns
allowed-tools:
  - Read(*):read
  - Glob(*):use
  - Grep(*):use
  - AskUserQuestion(*):use
  - Edit(*):edit
---

# Audit Code Standards

I'll conduct a comprehensive audit of all code standards documentation to identify and resolve ambiguities, discrepancies, and contradictions.

## Audit Process

I'll analyze the standards files in `agent-docs/code-standards/` by:

1. **Reading all standards files** to understand current documentation
2. **Identifying issues** including:
   - Contradictions between documents
   - Ambiguous or unclear guidance
   - Inconsistent naming conventions or patterns
   - Missing documentation
   - Internal inconsistencies within a document
3. **Presenting findings** organized by severity and category
4. **Getting your input** on how to resolve each issue
5. **Applying fixes** to ensure consistency across all documents

Let me start the audit now.
