---
inclusion: always
---

# Project Structure

## Directory Patterns

- `claude/` - Claude Code plugin source. Primary plugin: `ai-resources-plugin/`, with `.claude-plugin/plugin.json` manifest, `skills/<skill-name>/SKILL.md`, and optional `hooks/`, `agents/`, `scripts/`.
- `agent-docs/` - AI agent reference docs (code standards, workflows, tool references), installed to `~/.claude/agent-docs/`.
- `typescript/` - Core tooling: `lib/` and `scripts/` compiled to standalone executables in `dist/`. Entry point `scripts/ai.ts` provides the `ai` CLI.
- `scripts/` - Standalone bash utilities installed to `~/.local/bin/`; self-contained, no build step.
- `memory-bank/` - Working artifacts (design docs, implementation plans, notes) written by AI workflow skills. Intentional artifacts directory; not installed anywhere.
- `notes-for-humans/`, `prompts/` - Human-facing guides and prompt templates.
- `.kiro/steering/` - Kiro SDD steering files: persistent project context for AI agents.

## Naming Conventions

- Files: kebab-case (`install-user.ts`); TypeScript: camelCase functions, PascalCase types/Zod schemas
- Skills: `namespace:kebab-case` (`ai-resources:change-review-guide`); CLI: kebab-case subcommands (`ai install`)

## Key Interfaces

- `typescript/lib/installer-utils.ts` - File sync; CLAUDE.md comment-marker merging
- `typescript/scripts/install-user.ts` / `install-project.ts` - User-level vs project-level installation
- `typescript/lib/claude-code-settings.ts` - Zod schemas for the `hooks` section of Claude Code settings files
- `claude/CLAUDE-project.md` - Standard-instructions template merged between `<!-- Begin standard instructions -->` / `<!-- End of standard instructions -->` markers
