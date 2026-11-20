---
name: save-current-context
description: "Save current session context to a standalone handoff file so a fresh agent can resume with zero prior context."
disable-model-invocation: true
---

# Save current context

Write a standalone Markdown handoff file capturing everything a fresh agent needs to resume this work without seeing the current conversation.

## Rules

- Derive all content directly from conversation history; do not ask the user for a summary.
- If the user asks to focus on a specific angle (for example API decisions or open bugs), weight the handoff toward it without dropping core requirements.
- Write to `context-YYYY-MM-DD.md` (today's date) in the current working directory unless the user specifies another path.
- Condense background explanations aggressively, but preserve requirements, constraints, permissions, decisions, rejected approaches (and why), and hard-to-reconstruct identifiers (exact file paths, branch/commit refs, URLs, error outputs, test commands) intact.
- State clearly what was verified vs. what remains unverified or assumed.

## Handoff structure

Adapt section depth to the session (skip empty sections rather than padding):

1. **Goal and current state:** what the user asked for, what is done, and where work stopped.
2. **Decisions, constraints, and permissions:** explicit user choices, hard boundaries, approved/pending actions, and approaches tried and rejected (with reasons so the next agent does not repeat them).
3. **Key findings and workspace evidence:** concrete file paths (`file:line`), symbols, commands run, test results, and non-obvious discoveries.
4. **Open questions and blockers:** unresolved issues, unknowns, or items awaiting user input.
5. **Next steps:** concrete, ordered actions to pick up immediately.

Done when the file is written, stands completely on its own without unseen chat history, and its path is reported to the user.
