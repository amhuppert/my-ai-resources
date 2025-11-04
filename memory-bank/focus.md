# Current Focus

update the skill-creator skill.

- Convert scripts to TypeScript
- Remove packaging skill into zip.
- User can indicate whether skill is project-level or user-level (default to project-level).
  - Project-level: Save file in .claude/skills/<new-skill> of current project
  - User-level: Save file in ~/.claude/skills/<new-skill>

## Scripts

Rather than package scripts alongside the skill, the init_skill script and others will become a part of our `ai` CLI tool.

`ai skill create-skill init [...args]`
`ai skill create-skill validate [...args]`

This will be the pattern used by skills created in the future:

`ai skill <skill-name> <skill-helper-command-name> [...args]`
