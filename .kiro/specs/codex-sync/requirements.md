# Requirements Document

## Introduction
The Codex Sync feature adds an `ai codex-sync` subcommand that synchronizes Claude Code configuration into OpenAI Codex CLI configuration. Claude Code is the source of truth — skills, agents, custom instructions, and MCP server configuration are converted and copied into Codex-compatible directories and formats. The sync operates at either user-level (`~/.claude/` → `~/.codex/`, `~/.agents/`) or project-level (`./.claude/` → `./.codex/`, `./.agents/`) scope, specified per invocation.

## Requirements

### Requirement 1: CLI Interface
**Objective:** As a developer, I want a single CLI subcommand to sync Claude Code config to Codex, so that I can keep both tools in sync without manual file conversion.

#### Acceptance Criteria
1. The `ai` CLI shall expose a `codex-sync` subcommand.
2. When invoked, the Codex Sync tool shall require a `--scope` option accepting either `user` or `project`.
3. When `--scope user` is specified, the Codex Sync tool shall read Claude Code configuration from user-level paths (`~/.claude/`) and write to Codex user-level paths (`~/.codex/`, `~/.agents/`).
4. When `--scope project` is specified, the Codex Sync tool shall read Claude Code configuration from the current project directory and write to Codex project-level paths (`./.codex/`, `./.agents/`).
5. If `--scope` is not provided, the Codex Sync tool shall display an error message indicating the required option.
6. When the sync completes successfully, the Codex Sync tool shall print a summary of all files written, skipped, and any warnings encountered.
7. When the sync completes with errors, the Codex Sync tool shall exit with a non-zero exit code and display all errors encountered.

### Requirement 2: Sync Configuration
**Objective:** As a developer, I want a configurable model mapping and sync settings file, so that I can adapt the sync behavior as models and preferences change.

#### Acceptance Criteria
1. The Codex Sync tool shall use a configuration file at `~/.config/ai/codex-sync.json`.
2. When the configuration file does not exist and the sync is invoked, the Codex Sync tool shall create the file with sensible default values and inform the user.
3. The configuration file shall include a `modelMapping` object mapping Claude Code model identifiers (e.g., `sonnet`, `opus`, `haiku`) to Codex model identifiers.
4. The Codex Sync tool shall validate the configuration file against a Zod schema on load.
5. If the configuration file fails validation, the Codex Sync tool shall display specific validation errors and exit with a non-zero exit code.
6. The configuration Zod schema shall use `.passthrough()` to preserve unknown properties.

### Requirement 3: Custom Instructions Sync
**Objective:** As a developer, I want my CLAUDE.md instructions automatically copied to the Codex equivalent file, so that both tools share the same project context.

#### Acceptance Criteria
1. When `--scope user` is specified, the Codex Sync tool shall copy `~/.claude/CLAUDE.md` to `~/.codex/AGENTS.override.md`.
2. When `--scope project` is specified, the Codex Sync tool shall copy `./CLAUDE.md` to `./AGENTS.override.md`.
3. If the source CLAUDE.md file does not exist, the Codex Sync tool shall log a warning and skip this step without failing.
4. When an `AGENTS.override.md` file already exists at the destination, the Codex Sync tool shall overwrite it with the source content.

### Requirement 4: Skills Sync
**Objective:** As a developer, I want my Claude Code plugin skills synced to Codex skill directories, so that I can use the same skills in both tools.

#### Acceptance Criteria
1. When `--scope user` is specified, the Codex Sync tool shall discover Claude Code plugin skills from installed plugins under `~/.claude/plugins/`.
2. When `--scope project` is specified, the Codex Sync tool shall discover Claude Code plugin skills from plugin directories in the current project (directories containing `.claude-plugin/plugin.json`).
3. The Codex Sync tool shall copy each discovered skill directory to the Codex skill location (`~/.agents/skills/` for user scope, `./.agents/skills/` for project scope).
4. When copying a SKILL.md file, the Codex Sync tool shall strip the `allowed-tools` frontmatter property if present.
5. When copying a SKILL.md file, the Codex Sync tool shall strip the `argument-hint` frontmatter property if present.
6. When copying a SKILL.md file, the Codex Sync tool shall preserve the `name` and `description` frontmatter properties unchanged.
7. When copying a SKILL.md file, the Codex Sync tool shall preserve the body content (everything after frontmatter) unchanged.
8. When a skill with the same name already exists in the Codex skill directory, the Codex Sync tool shall overwrite it.
9. The Codex Sync tool shall preserve any existing Codex skills that do not conflict with synced Claude Code skills.
10. The Codex Sync tool shall copy all files within a skill directory (scripts/, references/, assets/), not only SKILL.md.

### Requirement 5: Agent Conversion
**Objective:** As a developer, I want my Claude Code agents converted to Codex agent format, so that I can use equivalent agent definitions in both tools.

#### Acceptance Criteria
1. When `--scope user` is specified, the Codex Sync tool shall discover Claude Code agents from installed plugins under `~/.claude/plugins/` and from standalone subagents under `~/.claude/agents/`.
2. When `--scope project` is specified, the Codex Sync tool shall discover Claude Code agents from plugin directories in the current project and from standalone subagents under `./.claude/agents/`.
3. The Codex Sync tool shall convert each Claude Code agent `.md` file to a Codex `.toml` file.
4. The Codex Sync tool shall map the Claude Code agent `name` frontmatter field to the Codex `name` TOML field.
5. The Codex Sync tool shall map the Claude Code agent `description` frontmatter field to the Codex `description` TOML field.
6. The Codex Sync tool shall map the markdown body content of the Claude Code agent to the Codex `developer_instructions` TOML field.
7. When the Claude Code agent has a `model` frontmatter field, the Codex Sync tool shall map it using the configured model mapping from the sync configuration file.
8. If a Claude Code agent `model` value has no mapping in the configuration, the Codex Sync tool shall log a warning and omit the `model` field from the output .toml.
9. The Codex Sync tool shall drop the `color` and `tools` frontmatter fields without converting them.
10. The Codex Sync tool shall write converted agent .toml files to `~/.codex/agents/` for user scope or `./.codex/agents/` for project scope.
11. When a Codex agent file with the same name already exists, the Codex Sync tool shall overwrite it.
12. The Codex Sync tool shall preserve any existing Codex agent files that do not conflict with synced agents.
13. When a Claude Code agent is defined in a subdirectory with sub-agents (e.g., `agents/design/`), the Codex Sync tool shall convert each sub-agent file individually as a separate Codex agent.

### Requirement 6: MCP Server Sync
**Objective:** As a developer, I want my Claude Code MCP server configuration synced to Codex config.toml, so that both tools have access to the same MCP servers.

#### Acceptance Criteria
1. When `--scope user` is specified, the Codex Sync tool shall read MCP server configuration from `~/.claude.json`.
2. When `--scope project` is specified, the Codex Sync tool shall read MCP server configuration from `./.mcp.json`.
3. The Codex Sync tool shall convert each MCP server entry from the Claude Code JSON format to the Codex TOML `[mcp_servers.<id>]` format.
4. The Codex Sync tool shall map the Claude Code MCP `command` field to the Codex `command` field.
5. The Codex Sync tool shall map the Claude Code MCP `args` array to the Codex `args` array.
6. Where a Claude Code MCP entry includes `env` variables, the Codex Sync tool shall map them to the Codex `env` table.
7. When writing to config.toml, the Codex Sync tool shall merge MCP server entries with any existing config.toml content, preserving non-MCP configuration sections.
8. When an MCP server with the same ID already exists in config.toml, the Codex Sync tool shall overwrite that server's configuration.
9. The Codex Sync tool shall preserve any existing MCP servers in config.toml that do not conflict with synced servers.
10. If the source MCP configuration file does not exist or contains no MCP configuration, the Codex Sync tool shall log an informational message and skip this step.

### Requirement 7: Validation and Error Reporting
**Objective:** As a developer, I want clear error messages and config validation, so that I can quickly identify and fix sync issues.

#### Acceptance Criteria
1. The Codex Sync tool shall validate the Claude Code MCP configuration file (`~/.claude.json` or `.mcp.json`) against a Zod schema before processing.
2. The Codex Sync tool shall validate Claude Code SKILL.md frontmatter against a Zod schema before conversion.
3. The Codex Sync tool shall validate Claude Code agent .md frontmatter against a Zod schema before conversion.
4. All Zod schemas used for reading external files shall use `.passthrough()` to preserve unknown properties.
5. If a single skill or agent fails validation, the Codex Sync tool shall log the error with the file path and continue processing remaining items.
6. The Codex Sync tool shall display a final summary listing: total items synced, items skipped, and items that failed with reasons.
7. When any items fail, the Codex Sync tool shall exit with a non-zero exit code.

### Requirement 8: Scope-Specific Path Resolution
**Objective:** As a developer, I want the sync to correctly resolve all source and destination paths based on scope, so that user-level and project-level configurations remain cleanly separated.

#### Acceptance Criteria
1. When `--scope user` is specified, the Codex Sync tool shall resolve the Claude Code base directory to `~/.claude/`.
2. When `--scope user` is specified, the Codex Sync tool shall resolve the Codex config directory to `~/.codex/`.
3. When `--scope user` is specified, the Codex Sync tool shall resolve the Codex skills directory to `~/.agents/skills/`.
4. When `--scope user` is specified, the Codex Sync tool shall resolve the Codex agents directory to `~/.codex/agents/`.
5. When `--scope project` is specified, the Codex Sync tool shall resolve the Claude Code base directory to the current working directory.
6. When `--scope project` is specified, the Codex Sync tool shall resolve the Codex config directory to `./.codex/`.
7. When `--scope project` is specified, the Codex Sync tool shall resolve the Codex skills directory to `./.agents/skills/`.
8. When `--scope project` is specified, the Codex Sync tool shall resolve the Codex agents directory to `./.codex/agents/`.
9. The Codex Sync tool shall create destination directories if they do not already exist.
