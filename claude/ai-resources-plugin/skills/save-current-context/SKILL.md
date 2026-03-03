---
name: Save Current Context
description: This skill should be used when the user asks to "save current context", "save progress", "save what we've done", "create a context file", "preserve context", "document current state", "save a handoff file", or wants to capture the current session's work so a future AI agent can continue it.
---

# Save Current Context

Create a markdown file capturing the current conversation's understanding, progress, and learnings so a future AI agent can continue the work with zero prior context.

## Context Source

Derive all content from the current conversation history. Do not ask the user for input or a summary — read the conversation directly.

If the user provided additional direction (e.g., "focus on the API design decisions" or "emphasize the open questions"), weight the output toward that area.

## Output File

Write the file to `context-{YYYY-MM-DD}.md` in the current working directory, using today's date, unless the user specifies a different path or filename.

Use the Write tool to create the file.

## Process

1. Think through the conversation using a scratchpad before writing:
   - What are the most critical pieces of information a future agent would need?
   - What has been accomplished vs. what remains?
   - What decisions were made, and why?
   - What can be condensed without losing essential meaning?
   - Has the user given direction about what to focus on?

2. Write the file with the structure below.

3. Tell the user the file path.

## Output File Structure

Include these sections:

1. **Summary** — Brief overview of what has been accomplished and the current state
2. **Key Learnings** — Important insights, patterns, or discoveries made
3. **Background Context** — Essential information needed to understand the situation
4. **Current Progress** — What has been completed and what stage things are at
5. **Open Questions / Challenges** — Unresolved issues or areas needing attention
6. **Next Steps** — Clear, actionable guidance on what to do next

## Writing Guidelines

- Be concise but don't omit critical information
- Use markdown formatting (headers, bullets, code blocks where appropriate)
- Write as if explaining to someone who knows nothing about this context
- Focus on actionable, concrete details rather than vague statements
- Avoid unnecessary verbosity while ensuring continuity
