---
name: browser-automation
description: "Automate browser interaction with Playwright: open pages, inspect
  elements, verify UI, debug running apps, test flows, or take screenshots."
---

# Browser automation with Playwright

Pick the right Playwright interface, make sure the official CLI skill is installed, and hand off execution. This skill is a router; it does not teach Playwright commands or duplicate the upstream skill.

## Choose CLI or MCP

| Use case | Tool | Next step |
| --- | --- | --- |
| Interactive automation, debugging a running app, ad-hoc verification | Playwright CLI | Use the official `playwright-cli` skill (see Setup) |
| Running an existing Playwright test suite | `npx playwright test` | Official `playwright-cli` skill (`references/playwright-tests.md`) |
| Recording new test code | `npx playwright codegen` | Official `playwright-cli` skill (`references/test-generation.md`) |
| Client without shell/filesystem access, or a 1 to 3 step check where CLI setup costs more than it saves | Playwright MCP (fallback) | Read [`references/playwright-mcp-reference.md`](references/playwright-mcp-reference.md) |

Default to the CLI. It saves page snapshots to disk instead of streaming them into conversation history (~4x fewer tokens over a session) and avoids the ~3,400-token MCP tool schema overhead on every turn. See [`references/token-optimization.md`](references/token-optimization.md) for the cost model and architecture patterns.

## CLI setup and handoff

The Playwright CLI ships its own `playwright-cli` skill containing the current command reference and playbooks (test running, request mocking, tracing, video, storage state, element inspection, sessions). Never invent CLI flags or paraphrase that skill here; read it directly.

1. Check whether the binary and skill are already installed:

   ```bash
   which playwright-cli || npx --no-install playwright-cli --version
   test -f .claude/skills/playwright-cli/SKILL.md && echo "project skill installed"
   test -f ~/.claude/skills/playwright-cli/SKILL.md && echo "user skill installed"
   ```

2. If either is missing, install without asking (authorized for this workflow), then briefly state the installed binary and skill path:

   ```bash
   npm install -g @playwright/cli@latest
   playwright-cli install --skills
   ```

3. Read the installed `playwright-cli/SKILL.md` and the specific `references/*.md` file matching the task, then execute the user's request.

## Delegate multi-step sessions when supported

When the environment supports subagents and the task requires more than a few browser interactions, delegate the browser loop to a subagent with a concrete URL, actions, and pass/fail checks. Snapshots and intermediate DOM state stay inside the subagent instead of filling the main conversation.

## References

- [`references/playwright-mcp-reference.md`](references/playwright-mcp-reference.md): MCP setup, flags, tool catalog, and scoping patterns. Load only when falling back to MCP.
- [`references/token-optimization.md`](references/token-optimization.md): CLI vs. MCP token math, subagent isolation, auth-state reuse, and prompt/workflow cost habits.
