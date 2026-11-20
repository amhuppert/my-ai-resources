---
name: create-reference
description: "Create or update a compact technical reference for a tool, library, framework, or local codebase, grounded in current docs or source."
argument-hint: "<subject> [--update <existing-file>] [--language <language>]"
allowed-tools: Read, Write, Glob, Grep, WebSearch, WebFetch, Agent, AskUserQuestion, Bash(ls:*)
disable-model-invocation: true
---

# Create reference document

Write or update a dense, accurate reference document that gives an AI agent everything non-obvious it needs to use a tool, library, framework, or local codebase without hunting through external docs.

## 1. Establish mode and scope

Read the user's invocation for the subject, target language (`--language`), and whether this is an update (`--update <path>`):

- **Update mode:** read the existing reference in full before researching. Research only the new or changed areas, integrate them into the existing structure (unless the user asks to reorganize), and remove contradicted or obsolete details.
- **Create mode (default):** write a new reference.

Determine the source type: public tool/library (use primary web documentation), local codebase/path (inspect the repository), or both. When combining web docs and local source, local implementation wins on any conflict.

Ask one brief round of questions only if a missing detail materially changes the reference (such as which language binding to document for a multi-language tool, or which module of a large platform to cover).

## 2. Research from primary sources

Verify APIs, CLI flags, config keys, types, and version-specific behavior against primary sources rather than memory:

- **Public tools:** read official API references, config docs, and recent changelogs or migration guides in full rather than relying on search snippets. Look for version-breaking changes and common gotchas.
- **Local codebases:** inspect entry points, package manifests, exported types and functions, config files, tests, and existing docs.

Distinguish verified facts from anything you could not confirm, and note the documented version wherever behavior varies across versions.

## 3. Write the reference

Adapt the structure to fit the subject rather than forcing empty sections. Most references need some subset of:

- Short overview (what it does, primary use case, core mental model)
- Setup or installation (only what is non-obvious or version-specific)
- Core concepts and terminology
- API, CLI, or configuration reference (exact signatures, parameter types, defaults, flags)
- Common patterns (minimal, runnable examples showing the main path first, plus expected output when non-obvious)
- Gotchas and troubleshooting (real pitfalls and fixes)

Writing standards:

- Match format to content: short paragraphs for mental models, tables for options and flags, code blocks for commands and signatures, lists for peers, Mermaid diagrams only when a visual beats prose.
- Optimize for signal per token. Omit concepts any frontier model already knows, avoid repeating rules across sections, and state "why" only when it prevents misuse.
- Use direct, plain language and consistent terminology throughout.

## 4. Verify and save

Before writing the final file, verify:

- Every documented signature, CLI flag, config key, and code snippet matches primary docs or inspected source for the stated version.
- No obsolete statements remain (in update mode) and no essential API surface within scope is missing.
- No filler sections or redundant summaries pad the document.

Save location:

- **Create mode:** `agent-docs/<subject-name>-reference.md` (kebab-case) in the project root, or `agent-docs/<subject-name>-reference-<language>.md` for language-specific docs. If the subject clearly warrants multiple files, place them in `agent-docs/<subject-name>/`.
- **Update mode:** edit the target file in place.

Report the saved file path, the version or source commit documented, and a brief summary of what is covered (plus anything that could not be verified).
