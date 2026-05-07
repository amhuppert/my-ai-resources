---
name: browser-automation
description: Automate browser interaction with Playwright: open pages, take screenshots, verify UI, test flows, debug pages, inspect elements.
allowed-tools: Bash(playwright-cli:*), Bash(npx:*), Bash(npm:*), Bash(which:*), Bash(test:*), Bash(ls:*)
---

# Browser Automation with Playwright

Route the request to the right tool and let the dedicated skill drive the interaction. This file does **not** teach Playwright usage — it picks the tool, ensures the right skill is installed, and hands off.

## Routing Decision

Pick **one** based on the use case:

| Use case | Tool | Where to go |
|----------|------|-------------|
| Interactive automation, debugging a running app, ad-hoc verification | **Playwright CLI** | The official `playwright-cli` skill (see Setup) |
| Running an existing Playwright test suite | `npx playwright test` | Official `playwright-cli` skill → `references/playwright-tests.md` |
| Generating new test code from a recorded session | `npx playwright codegen` | Official `playwright-cli` skill → `references/test-generation.md` |
| MCP-only client (Claude Desktop, Cursor) where shell isn't an option, or a single quick interaction where launching the CLI isn't worth it | **Playwright MCP** (fallback) | `references/playwright-mcp-reference.md` |

**Default to the CLI.** Microsoft's own guidance: coding agents are better served by CLI + skills than by MCP. CLI saves snapshots to disk instead of streaming them into context (~4× fewer tokens per session) and avoids the ~3,400-token MCP tool-schema overhead on every message. See `references/token-optimization.md` for the full breakdown.

Use MCP only when no shell/filesystem is available, or for a one-shot interaction where setup overhead beats the per-action token savings.

## Setup: Required Before Any CLI Workflow

The Playwright CLI ships its own Claude Code skill (`playwright-cli`) — the canonical, always-up-to-date command reference plus task playbooks (test running, request mocking, tracing, video recording, storage state, spec-driven testing, element-attribute inspection, session management). This skill **never** duplicates that content. It either defers to the official skill or installs it.

### Step 1 — Detect

```bash
# Is the binary on PATH?
which playwright-cli || npx --no-install playwright-cli --version

# Is the skill installed (project-level or user-level)?
test -f .claude/skills/playwright-cli/SKILL.md && echo "project skill installed"
test -f ~/.claude/skills/playwright-cli/SKILL.md && echo "user skill installed"
```

### Step 2 — Install if missing

Install without asking — Alex always wants the official skill present:

```bash
# Install the global binary if `which playwright-cli` failed
npm install -g @playwright/cli@latest

# Scaffold .playwright/ workspace, install default browser,
# and copy the skill to ./.claude/skills/playwright-cli/
playwright-cli install --skills
```

Briefly state what was installed (binary + skill path) so Alex can see it.

### Step 3 — Hand off

After install, **all CLI command reference and patterns come from the official `playwright-cli` skill**. Do not invent commands, paraphrase its content here, or fall back to memory. Read its `SKILL.md` and the relevant `references/*.md` for the task at hand.

If you find yourself wanting to add CLI command examples to *this* skill, stop — the right place is upstream (the official skill) or, for our own router-level concerns, in `references/token-optimization.md`.

## Architecture: Use Subagents for Browser Work

For sessions involving more than a few interactions, **delegate to a subagent**. The Playwright maintainer recommends this pattern explicitly: each subagent gets its own context loop, so browser snapshots and intermediate state accumulate there instead of in the main conversation.

```
"Use a subagent to: navigate to http://localhost:3000/settings,
 verify the theme toggle exists, click it, confirm dark mode applies.
 Report back pass/fail."
```

## Runtime Debugging

When browser automation reveals unexpected behavior — console errors, wrong UI state, failed interactions — combine Playwright with the **web-debugger** skill for runtime inspection:

1. Reproduce the issue with Playwright
2. Use `get_logs` to check structured app logs (browser + server)
3. Use `get_snapshot` to inspect application state at the failure point
4. Fix and verify with Playwright

See the `web-debugger` skill for full tool reference.

## Self-Improvement

Watch for inefficiency or struggle:

- **Repeated failed interactions** (wrong refs, stale snapshots, elements not found)
- **Excessive navigation** when `eval` or direct URLs would suffice
- **Tool mismatch** (using MCP for a 30+ step session, or CLI for a single-step check inside an MCP-only client)
- **Token waste** (screenshots when snapshots suffice, redundant snapshots, full-page snapshots on huge apps)
- **Missing knowledge in the official skill** (auth flows, dynamic content, SPA edge cases, framework-specific quirks)

Surface concrete suggestions to Alex after the immediate task. For CLI command gaps, the fix is upstream in the official `playwright-cli` skill, not here. For routing, MCP, or token-economics gaps, propose specific edits to this skill or its references.

## References

- **`references/playwright-mcp-reference.md`** — MCP setup, full tool catalog, configuration flags, and patterns. Use only when CLI isn't an option.
- **`references/token-optimization.md`** — Token cost analysis, per-tool optimization patterns, architecture-level decisions.
