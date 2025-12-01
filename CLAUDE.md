# Project Standards

- When writing TypeScript code, follow all TypeScript standards in 'agent-docs/code-standards/typescript/typescript-general.md'
  <project-level-instructions>

## Document Map

@document-map.md

## Memory Bank

The memory bank is a set of files with critical context. It gives Claude a persistent memory.

Files:

- @memory-bank/project-brief.md - Project brief (high-level overview, tech stack, key architectural decisions, and important commands)
- @memory-bank/focus.md - Current focus: work-in-progress, progress, remaining tasks

## Project Rules

Review rule descriptions below to identify relevant rules for the current task. Read full rule files when determined to be relevant.

### Meta

- **.cursor/rules/meta/memory-bank.mdc**: This rule should be used always (alwaysApply: true) when working with memory bank files to maintain project context across AI sessions. Requires reading all memory bank files at task start and updating focus.md when completing tasks.
- **.cursor/rules/meta/creating-rules.mdc**: This rule should be used when creating or updating Cursor rule files (.mdc) in .cursor/rules/. Provides standards for frontmatter (description, globs, alwaysApply), file organization, and AI-optimized formatting with inline examples.
- **.cursor/rules/meta/minimal-standards-docs.mdc**: This rule should be used when creating project-wide standards documents (.md or .mdc files) to ensure minimal token usage. Enforces bulleted list structure with maximum two-level heading depth and single-line imperative instructions.
- **.cursor/rules/meta/mermaid-diagrams-for-agent.mdc**: This rule should be used when creating Mermaid diagrams in markdown or .mdc files for AI consumption. Requires inline comments throughout diagrams, header comments explaining purpose, and embedded context to eliminate external documentation dependencies.

### Languages

- **.cursor/rules/languages/typescript/typescript-standards.mdc**: This rule should be used when writing TypeScript files (.ts, .tsx) to enforce type safety standards. Prohibits use of any and @ts-ignore, requires proper type error fixes, and mandates plain functions over classes unless explicitly directed.

</project-level-instructions>
