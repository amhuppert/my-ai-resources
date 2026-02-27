# Voice-to-Text Context

## Project

A centralized AI workflow resources repository that provides Claude Code slash commands, Cursor IDE workflow rules, MCP servers, and TypeScript-based configuration management tools for consistent AI-assisted development across projects.

## Technologies

- **TypeScript** - Primary language
- **Bun** - Runtime and compiler for TypeScript executables
- **Zod** - Runtime validation and type safety
- **Commander.js** - CLI argument parsing
- **Eta** - Template rendering (not "ETA" the acronym)
- **openai** / **OpenAI SDK** - OpenAI API client (Responses API integration)
- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **SQLite** - Database for memory-bank-mcp
- **nanoid** - Unique ID generator
- **jsonc-parser** - JSON with comments parser
- **clipboardy** - Clipboard access
- **node-notifier** - Desktop notifications
- **proper-lockfile** - File concurrency control
- **write-file-atomic** - Crash-safe file writes
- **Claude Code** - Anthropic's CLI tool for AI-assisted development
- **Cursor** - AI-enhanced IDE

## Terminology

- **CLAUDE.md** - Claude Code project instructions file; pronounced "Claude dot M-D" (not "cloud.md")
- **MCP** - Model Context Protocol; standard for AI tool integration via stdio servers
- **memory-bank** - Persistent context system for AI sessions using markdown files and SQLite
- **focus.md** - Memory bank file tracking current work-in-progress
- **project-brief.md** - Memory bank file with high-level project overview
- **document-map.md** - Navigation aid file listing important files and their purposes
- **Ralph** - ralph-claude-code; autonomous agent loop for mechanical task execution
- **CCSDD** - Claude Code SDD (Software Design Document); spec-driven design format
- **SDD** - Software Design Document
- **PRD** - Product Requirements Document
- **lgit** - Dual-repo git wrapper script managing the `.local` private repository (not "legit")
- **mdc** - File extension for Cursor IDE rules (`.mdc` files)
- **frontmatter** - YAML metadata block at the top of markdown/mdc files
- **code-tree** - Directory visualizer CLI utility
- **read-file** - CLI utility that formats files as XML for LLM context
- **push-main** - CLI utility for branch deployment
- **alwaysApply** - Cursor rule frontmatter flag for rules that load on every request
- **deep merge** - Settings installation strategy that preserves existing config values
- **worktree** - Git worktree; isolated branch environment for parallel sessions
- **YAGNI** - You Aren't Gonna Need It; design principle
- **ai** - Main CLI binary for this project (`ai install`, `ai init-document-map`)
- **voice-to-text** - The transcription and cleanup tool built in this repository
- **slash commands** - Custom Claude Code commands invoked with `/command-name` syntax

## Naming Conventions

- **kebab-case** for file names, CLI commands, MCP server names, and skill names (e.g., `memory-bank-mcp`, `init-voice-config`)
- **camelCase** for TypeScript variables and functions (e.g., `installUser`, `deepMerge`)
- **PascalCase** for TypeScript types and Zod schemas (e.g., `ClaudeSettings`, `McpServer`, `ConfigSchema`)
- Hierarchical slugs use forward slashes: `feature-x/sub-feature-y`
- Plugin skills use namespace prefixes: `ai-resources:skill-name`, `memory-bank:skill-name`

## Claude Commands & Skills

### Project Commands

- **/test-slash-command** - Test TypeScript script argument passing
- **/audit-standards** - Audit code standards files for inconsistencies and contradictions

### ai-resources Plugin Skills

- **/ai-resources:add-design-agent** - Create a new design workflow agent for the /design workflow
- **/ai-resources:add-voice-context** - Add terms or context to voice-to-text config files
- **/ai-resources:analyze-ralph-logs** - Analyze Ralph Loop workflow execution logs
- **/ai-resources:approve** - Approve an implementation plan for immediate execution
- **/ai-resources:break-into-subtasks** - Break frontend features into parallelizable work items
- **/ai-resources:changes-tour-guide** - Create a pedagogical walkthrough of recent code changes
- **/ai-resources:cheat-sheet** - Generate a concise reference document for a tool or technology
- **/ai-resources:commit** - Commit staged changes with an AI-generated commit message
- **/ai-resources:compress** - Optimize and compress AI instructions for token efficiency
- **/ai-resources:config-audit** - Audit Claude Code and Cursor IDE configurations for gaps
- **/ai-resources:configure-ralph** - Configure ralph-claude-code for a new objective
- **/ai-resources:create-plan-anthropic** - Create a detailed, decision-complete implementation plan
- **/ai-resources:create-reference** - Create an AI-optimized reference document for a tool or API
- **/ai-resources:create-requirements** - Write a PRD or requirements document
- **/ai-resources:cursor-rules-synchronizer** - Sync Cursor Rules (.mdc files) to CLAUDE.md
- **/ai-resources:cursor-rules** - Create or edit Cursor rule files in .cursor/rules/
- **/ai-resources:design** - Orchestrate a multi-agent collaborative software design workflow
- **/ai-resources:fix-merge-conflicts** - Resolve git merge conflicts
- **/ai-resources:init-design-config** - Initialize DESIGN-AGENTS.md configuration file
- **/ai-resources:init-document-map** - Generate a document map for codebase navigation
- **/ai-resources:init-voice-config** - Initialize voice-to-text configuration for a project
- **/ai-resources:jog-users-memory** - Provide a quick summary of current progress after returning
- **/ai-resources:latex** - Create or convert documents to LaTeX format
- **/ai-resources:local-commit** - Commit to the local private repository via lgit
- **/ai-resources:local-init** - Initialize a new local private repository in the current directory
- **/ai-resources:reflection** - Reflect on conversation to suggest CLAUDE.md improvements
- **/ai-resources:sdd-to-ralph** - Convert CCSDD specs into Ralph execution artifacts
- **/ai-resources:skill-creator** - Create or update a Claude Code skill
- **/ai-resources:steer** - Create a navigation steering document from codebase exploration
- **/ai-resources:understand-objective-anthropic** - Research and clarify a development objective
- **/ai-resources:update-project-brief** - Update the memory-bank project brief
- **/ai-resources:worktree** - Create a git worktree for parallel Claude Code sessions

### memory-bank Plugin Skills

- **/memory-bank:add-feature** - Add a feature to the memory bank database
- **/memory-bank:complete-objective** - Complete an objective and capture learnings
- **/memory-bank:mb-quick-add** - Quickly add a file path to the memory bank
- **/memory-bank:mb-status** - Display a memory bank status dashboard
- **/memory-bank:memory-context** - Build context from memory bank for current work
- **/memory-bank:start-objective** - Start work on a new or existing objective
- **/memory-bank:sync-memory-bank** - Audit memory bank against actual codebase

### Agents (ai-resources Plugin)

- **code-reviewer** - Review code changes (recent git diff, specific files, or subsystems)
- **requirements-validation-agent** - Verify designs against requirements
- **software-engineering-agent** - Review designs for SOLID principles and maintainability
- **simplicity-advocate-agent** - Review designs for unnecessary complexity and scope creep
- **testing-strategy-agent** - Design testing strategies for unit, integration, and E2E tests
- **ux-usability-agent** - Review UX for usability and accessibility
- **typescript-type-safety-agent** - Review TypeScript for type safety patterns
- **expo-best-practices-agent** - Review Expo/React Native app best practices
- **design-system-agent** - Review designs for design system adherence
