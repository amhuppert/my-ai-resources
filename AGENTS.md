# Project Standards

## Documentation

- Keep AI agent instructions concise and machine-actionable

## Code Standards

- YAGNI. The best code is no code: don't add features, refactor, or introduce abstractions beyond what the task requires.

## Plugins

- Any change to a Claude plugin (commands, skills, agents, hooks) requires bumping the version in that plugin's manifest — for ai-resources: `claude/ai-resources-plugin/.claude-plugin/plugin.json` — and regenerating the Codex packaging: `cd typescript && bun run build:codex-plugin`

## Commands

- `ai install --scope user` - Install binary utilities, agent-docs
- `ai install --scope project` - Install plugin, project configs
- `cd typescript && bun run build` - Compile TypeScript tools
- `cd typescript && bun run build:codex-plugin` - Regenerate Codex plugins via skill-sync from the shared skills
