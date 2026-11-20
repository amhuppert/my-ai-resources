---
name: steer
description: Reflect on codebase navigation effectiveness at end of
  conversation. Surfaces dead ends, inefficiencies, missing context. Does not
  write files.
---

# Steer Reflection

Reflect on the current conversation to evaluate codebase navigation effectiveness. 

## Arguments

Topic name: use the topic supplied in the user's invocation.

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

Based on the reflection, draft a concise summary of navigation guidance that could become a steering document. 

Do not pad instructions with generic advice.

## Step 3: Present and Suggest Next Steps

Present the full reflection and synthesized guidance to the user.

Do NOT write any files. The user decides what to persist and when.
