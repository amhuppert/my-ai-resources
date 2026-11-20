---
name: steer
description: Reflect on codebase navigation effectiveness at the end of a
  conversation. Surfaces dead ends, wasted searches, and missing context without
  modifying files.
---

# Steer reflection

Evaluate how efficiently the codebase was navigated during this conversation and draft concise navigation notes that would prevent the same detours next time. If the user names a topic or area, focus the reflection there.

Do not create or edit any files; return the reflection and draft guidance in chat so the user decides what to keep.

## 1. Audit navigation from conversation history

Review the session and cite concrete file paths, globs, and searches for four questions:

1. **Efficiency:** roughly how many navigation calls (file reads, greps, globs) were productive vs. wasted?
2. **Dead ends:** specific searches that missed or files read that turned out irrelevant.
3. **Missing context:** concrete facts that would have avoided those detours if known upfront (key entry points found late, non-obvious directory layout, misleading naming conventions, undocumented links between modules).
4. **Targeted fixes:** specific improvements that would cut navigation cost on similar tasks.

## 2. Draft reusable navigation notes

Turn only the highest-value findings into brief, ready-to-paste navigation guidance suited for `AGENTS.md`, `CLAUDE.md`, or a project guide. Omit generic advice and anything already obvious from a quick directory listing.

Done when every dead end and recommendation cites actual paths or searches from the conversation, the draft notes contain zero generic padding, and no files were modified.
