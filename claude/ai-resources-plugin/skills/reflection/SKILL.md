---
name: reflection
description: "Reflect on the current conversation and propose targeted edits to durable AI-agent instruction files (AGENTS.md, CLAUDE.md, and overrides)."
disable-model-invocation: true
---

# Reflect on agent instructions

Review the current conversation alongside the active durable instruction files, identify concrete friction or missing conventions, and propose minimal edits that prevent the same mistakes next time.

## 1. Read conversation and durable instruction files

Review the full conversation history, then locate and read the durable instruction files active for this client:

- User-level instructions (such as `~/.claude/CLAUDE.md` or `~/.codex/AGENTS.override.md`)
- Project-level `AGENTS.md`, `AGENTS.override.md`, `CLAUDE.md`, or `CLAUDE.local.md`
- Any closer nested instruction files covering directories touched in this session

Look for evidence-backed gaps, not generic advice:

- Repeated misunderstandings or wrong assumptions made during the session
- Conventions the user had to correct manually that are not obvious from the codebase itself
- Stale, contradictory, or redundant instructions in existing files that caused detours or bloat

Skip anything already discoverable cheaply from the repo (`package.json`, directory layout, `--help`), and skip one-off task quirks that will not recur.

## 2. Propose edits and wait for approval

Present each proposed change to the user before editing any instruction file. For every proposal, include:

- **Target file and section** (keep each rule in one authoritative place)
- **Observed issue:** the specific moment in the session that motivates the change
- **Exact proposed diff or replacement text** (add, clarify, or delete)

Wait for the user to approve, refine, or reject each proposal. Do not modify instruction files without approval.

## 3. Apply approved changes

Apply only the approved edits, keeping them concise and consistent with the surrounding file's style. Report each modified file and a one-line summary of what changed.
