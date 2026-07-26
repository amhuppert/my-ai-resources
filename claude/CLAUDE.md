<critical>
Any change to a Claude plugin (new or updated commands, skills, agents, hooks, etc.) requires bumping the version number in that plugin's plugin.json — for the ai-resources plugin: claude/ai-resources-plugin/.claude-plugin/plugin.json — and regenerating the Codex packaging: `cd typescript && bun run build:codex-plugin`.
</critical>
