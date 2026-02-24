---
name: steer
description: This skill should be used at the end of a conversation to reflect on codebase navigation effectiveness and create a steering document. Triggered by "steer", "create a steering doc", "navigation debrief", or "reflect on navigation". Analyzes dead ends, inefficiencies, and missing context, then writes a concise navigation guide to memory-bank/steering/ and updates CLAUDE.md with a per-file reference.
argument-hint: [topic-name]
allowed-tools: Read, Write, Edit, Glob, Bash(mkdir:*), Bash(ls:*)
---

# Navigation Steering

Reflect on the current conversation to evaluate codebase navigation effectiveness, then create a steering document to help future agents navigate more efficiently.

## Arguments

Topic name: $ARGUMENTS

If no topic name provided, derive one from the conversation's primary task using kebab-case (e.g., `voice-to-text`, `installer-scripts`, `mcp-server`).

## Step 1: Reflect on Navigation

Analyze the full conversation history. For each question below, cite specific examples from the conversation:

1. **Efficiency** — How many tool calls were spent on navigation (file reads, searches, globs)? How many were productive vs. wasted?
2. **Dead ends** — List specific instances of searching for something and not finding it, or reading files that turned out to be irrelevant.
3. **Missing context** — What information, if available at the start, would have made navigation significantly easier? Consider:
   - Key file paths discovered late
   - Directory structures that weren't obvious
   - Naming conventions that caused confusion
   - Relationships between files that weren't documented
4. **Improvement opportunities** — What concrete changes would make this type of task easier next time?

Present the reflection to the user before proceeding to Step 2.

## Step 2: Draft Steering Document

Draft the content for `memory-bank/steering/{topic-name}.md`. Do NOT write the file yet — present it in Step 4.

If a steering file for this topic already exists, read it first and merge new navigation insights with existing content, removing any outdated guidance.

<constraints>
- Maximum 40 lines
- Include only actionable navigation guidance, not general observations
- Use specific file paths and directory names
- Scope to the feature/task — not the whole codebase
</constraints>

<template>
# {Topic Title}

## Key Files

- `path/to/file` - what it contains and when it's relevant

## Navigation Tips

- Concise, actionable tips for finding what you need for this type of task

## Common Pitfalls

- Things that look relevant but aren't
- Non-obvious file locations or naming conventions
  </template>

Omit any section from the template that has no meaningful content. Do not pad with generic advice.

## Step 3: Draft CLAUDE.md Update

Determine the CLAUDE.md change needed. Do NOT write the file yet — present it in Step 4.

### Procedure

1. Read CLAUDE.md and search for a `## Steering Files` section.
2. **If the section exists**: draft appending the new file reference as a bullet under the existing list.
3. **If the section does not exist**: draft creating it. Insert location priority:
   a. After the project-level `## Memory Bank` section (one that appears **before** `<!-- Begin standard instructions -->`, not inside the standard instructions block)
   b. If no project-level Memory Bank section exists: before `<!-- Begin standard instructions -->` if that marker exists
   c. Otherwise: append to the end of the file

### Section format (when creating)

```markdown
## Steering Files

Navigation guides for efficient codebase exploration. Read when the description matches your current task.

- @memory-bank/steering/{topic}.md - {when to read, under 15 words}
```

### File reference format (when appending)

```markdown
- @memory-bank/steering/{topic}.md - {when to read, under 15 words}
```

The "when to read" description must be specific and actionable.

<example type="valid">
- @memory-bank/steering/voice-to-text.md - Read when working on voice transcription or cleanup features
</example>

<example type="invalid">
- @memory-bank/steering/voice-to-text.md - Voice stuff
</example>

## Step 4: Review and Write

Present both the drafted steering document and the CLAUDE.md change to the user. Write the files only after the user approves.

1. Show the steering document content
2. Show the CLAUDE.md edit (the new or updated section)
3. Wait for user approval
4. Create the directory if needed: `mkdir -p memory-bank/steering`
5. Write the steering file and edit CLAUDE.md
