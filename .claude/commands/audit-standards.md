---
description: This skill should be used when the user asks to "audit code standards", "review standards for consistency", "check standards files", "find inconsistencies in standards", or "identify standard conflicts". Identifies ambiguities, discrepancies, and contradictions across code standards documentation, then guides interactive resolution.
allowed-tools: Read, Glob, Grep, Edit, AskUserQuestion
---

# Code Standards Audit

Read all markdown files in `agent-docs/code-standards/` and identify inconsistencies: rules that directly conflict (across files or within one document), ambiguous guidance, similar concepts named or structured differently, and missing documentation.

Present findings grouped by severity with a concrete example of each. Then use AskUserQuestion to collect a resolution decision per issue, apply the agreed fixes to the affected files, and ask before committing.
