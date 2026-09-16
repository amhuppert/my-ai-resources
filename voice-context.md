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
- **steering files** - Kiro SDD project context files in .kiro/steering/ (product.md, tech.md, structure.md)
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
- **ai** - Main CLI binary for this project (`ai install`, `ai worktree`)
- **Shama** - The voice dictation app these skills configure (separate repo at `~/github/shama`)
- **slash commands** - Custom Claude Code commands invoked with `/command-name` syntax

## Naming Conventions

- **kebab-case** for file names, CLI commands, MCP server names, and skill names (e.g., `cursor-shortcuts-mcp`, `shama-init-config`)
- **camelCase** for TypeScript variables and functions (e.g., `installUser`, `deepMerge`)
- **PascalCase** for TypeScript types and Zod schemas (e.g., `ClaudeSettings`, `McpServer`, `ConfigSchema`)
- Hierarchical slugs use forward slashes: `feature-x/sub-feature-y`
- Plugin skills use namespace prefixes: `ai-resources:skill-name`

## Claude Commands & Skills

### Project Commands

- **/test-slash-command** - Test TypeScript script argument passing
- **/audit-standards** - Audit code standards files for inconsistencies and contradictions

### ai-resources Plugin Skills

- **/ai-resources:add-design-agent** - Create a new design workflow agent for the /design workflow
- **/ai-resources:shama-add-context** - Add terms or context to Shama voice config files
- **/ai-resources:change-review-guide** - Write a reviewer's guide to a set of code changes: purpose, fundamental decisions, review path, diff noise
- **/ai-resources:characterize-codebase** - Characterize what a codebase is built for: design envelope vs operating envelope, overbuilt and underbuilt findings
- **/ai-resources:cheat-sheet** - Generate a concise reference document for a tool or technology
- **/ai-resources:compress** - Optimize and compress AI instructions for token efficiency
- **/ai-resources:create-reference** - Create an AI-optimized reference document for a tool or API
- **/ai-resources:create-requirements** - Write a PRD or requirements document
- **/ai-resources:design** - Orchestrate a multi-agent collaborative software design workflow
- **/ai-resources:init-design-config** - Initialize DESIGN-AGENTS.md configuration file
- **/ai-resources:shama-init-config** - Initialize Shama voice config for a project
- **/ai-resources:latex** - Create or convert documents to LaTeX format
- **/ai-resources:reflection** - Reflect on conversation to suggest CLAUDE.md improvements
- **/ai-resources:steer** - Create a navigation steering document from codebase exploration
- **/ai-resources:understand-objective** - Research and clarify a development objective

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
