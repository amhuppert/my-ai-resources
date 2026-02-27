---
name: steer
description: This skill should be used at the end of a conversation to reflect on codebase navigation effectiveness. Triggered by "steer", "steer reflection", "navigation debrief", or "reflect on navigation". Analyzes dead ends, inefficiencies, and missing context, then presents actionable findings. Does NOT write any files — use /kiro:steering-custom afterward to persist insights as a steering document.
argument-hint: [topic-name]
allowed-tools: Read, Glob, Grep
---

# Steer Reflection

Reflect on the current conversation to evaluate codebase navigation effectiveness. Present findings so the user can decide what to persist via `/kiro:steering-custom`.

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

## Step 2: Synthesize Actionable Guidance

Based on the reflection, draft a concise summary of navigation guidance that could become a steering document. Present it using this structure:

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

## Step 3: Present and Suggest Next Steps

Present the full reflection and synthesized guidance to the user. Then suggest:

> To persist these insights as a steering document, run `/kiro:steering-custom` and reference the topic **{topic-name}**.

Do NOT write any files. The user decides what to persist and when.
