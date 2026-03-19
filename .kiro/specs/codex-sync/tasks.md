# Implementation Plan

- [x] 1. Set up dependencies and shared domain model
  - Install TOML serialization and YAML frontmatter parsing libraries
  - Define shared domain types: sync configuration (model mapping), resolved paths per scope, discovered artifacts (skills, agents, MCP servers), and per-item sync result tracking with status, destination, and failure reasons
  - Define validation schemas with permissive parsing for: sync configuration, skill frontmatter (name, description), agent frontmatter (name, description, optional model), MCP server entries (command, optional args/env), and MCP config wrapper
  - Verify the new libraries compile correctly with standalone Bun build
  - _Requirements: 2.3, 2.6, 7.4_

- [x] 2. Configuration loading and path resolution

- [x] 2.1 (P) Build the sync configuration loader
  - Load configuration from the user config directory; if the file doesn't exist, create it with sensible default model mappings and inform the user
  - Validate the loaded file against the config schema; on failure, display specific validation errors and exit with a non-zero code
  - Preserve unknown properties in the config file for forward compatibility
  - Test: missing file creates defaults, valid file loads correctly, invalid file shows errors and exits
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.2 (P) Build the scope-based path resolver
  - Map "user" scope to home-directory source and destination paths
  - Map "project" scope to working-directory source and destination paths, with the plugin scan root set to CWD for recursive discovery
  - Create destination directories if they don't exist
  - Test: correct paths for each scope, destination directories created when absent
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 3. Artifact discovery

- [x] 3.1 (P) Build plugin scanning, skill extraction, and MCP discovery
  - Recursively scan from the plugin scan root for plugin manifests, skipping `node_modules`, `dist`, `.git`, and dotfile directories (except `.claude-plugin`)
  - From each discovered plugin, extract skill directories: subdirectories of the plugin's skills folder that contain a skill definition file
  - Parse MCP server entries from the scope-appropriate JSON config file; skip gracefully if the file is missing or contains no MCP config
  - Test: discovers plugins at arbitrary nesting depth, extracts multiple skills per plugin, parses MCP entries, handles missing files gracefully
  - _Requirements: 4.1, 4.2, 6.1, 6.2_

- [x] 3.2 Build agent discovery with candidate filtering
  - Discover agent markdown files from both plugin agent directories and the standalone agents directory
  - Apply candidate filtering: only files directly in the agents folder or one subdirectory level deep; exclude files inside `references/`, `assets/`, and `scripts/` directories
  - Pre-validate candidates by checking for frontmatter with name and description fields; silently skip files that don't match (not counted as failures)
  - Handle subdirectory agents as individual candidates
  - Test: filters out reference docs, discovers nested agents, skips non-agent markdown, discovers standalone agents alongside plugin agents
  - Depends on 3.1 for discovered plugin locations
  - _Requirements: 5.1, 5.2, 5.13_

- [x] 4. Sync converters

- [x] 4.1 (P) Build instructions sync
  - Copy the Claude Code instructions file to the Codex override instructions destination
  - If the source file doesn't exist, log a warning and skip without failing
  - If the destination already exists, overwrite it
  - Test: successful copy, missing source warns and skips, existing destination overwritten
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4.2 (P) Build skill sync with frontmatter adaptation
  - Copy each discovered skill's entire directory (including supporting files like scripts and references) to the Codex skills destination
  - Parse the skill definition frontmatter and strip `allowed-tools` and `argument-hint` properties; preserve `name`, `description`, and body content unchanged
  - Validate skill frontmatter before conversion; log error with file path and continue if validation fails
  - Overwrite skills with matching names; preserve non-conflicting existing Codex skills
  - Test: frontmatter stripping preserves name/description/body, full directory copy includes supporting files, validation errors logged with path, overwrite vs preserve behavior
  - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 7.2_

- [x] 4.3 (P) Build agent-to-TOML conversion
  - Parse each agent's frontmatter, validating only name, description, and optional model; let all other fields pass through via permissive parsing and strip them post-parse
  - Map the model field using the configured model mapping; if no mapping exists, log a warning and omit model from the output
  - Convert the markdown body to a TOML multi-line developer instructions field
  - Write one TOML file per agent to the Codex agents destination
  - Overwrite agents with matching names; preserve non-conflicting existing Codex agents
  - Test: successful conversion with model mapping, unmapped model warning and omission, frontmatter with unexpected field types (arrays, objects) handled gracefully, overwrite vs preserve behavior
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 7.3_

- [x] 4.4 (P) Build MCP server sync with TOML merge
  - Validate MCP source config against schema before processing
  - Convert each MCP server entry from JSON to TOML format, mapping command, args, and env fields
  - Read existing Codex config TOML if present; merge synced MCP entries while preserving all non-MCP configuration sections and non-conflicting MCP servers
  - Overwrite MCP servers with matching IDs
  - If the source config doesn't exist or has no MCP entries, log an informational message and skip
  - Test: JSON-to-TOML conversion, merge preserves non-MCP sections, conflicting servers overwritten, non-conflicting servers preserved, missing source handled gracefully
  - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 7.1_

- [x] 5. Pipeline orchestration and CLI integration

- [x] 5.1 Build the sync orchestrator and result reporter
  - Run the full sync pipeline in sequence: instructions, skills, agents, MCP
  - If any individual item fails, log the error and continue processing remaining items
  - Aggregate all results into a summary: total items synced, items skipped (with reasons), items failed (with file paths and error messages)
  - Set overall failure status when any items fail
  - Format and print the summary to the console
  - Test: successful full pipeline run, partial failure continues processing, summary output formatting, non-zero exit indicator when items fail
  - _Requirements: 1.6, 1.7, 7.5, 7.6, 7.7_

- [x] 5.2 Register CLI subcommand and run end-to-end integration test
  - Register the codex-sync subcommand on the existing CLI with a required `--scope` option accepting "user" or "project"
  - Display an error message if `--scope` is not provided
  - Wire the full pipeline: load config, resolve paths, discover artifacts, run sync, print summary, exit with appropriate code
  - Integration test: set up a temp directory with a mock Claude Code structure (plugin with skills and agents, standalone agents, instructions file, MCP config); run the full sync; verify all Codex output files are correctly created with expected content
  - Test overwrite/preserve behavior: pre-populate Codex directories with conflicting and non-conflicting items; verify conflicting ones overwritten and others preserved
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
