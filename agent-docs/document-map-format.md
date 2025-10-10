# Codebase Document Map — Agent Instructions

This file explains the purpose of the **document map** and **exactly how it’s formatted**, so you can reliably navigate a codebase and decide which files you need to open to complete a task.

## Purpose

- Give you a fast, high-signal **table of contents** for the repository—organized by directories and **only the most critical files**—so you can judge **where relevant information lives** before reading full files.
- For each file, provide a **1–2 sentence purpose blurb** that explains what/where/why. Documentation files may include a hierarchical bullet outline of headings. Code files get **only the purpose blurb** (no bullets).

## Overall Structure

- The map is a single Markdown document.
- It uses a hierarchical structure:
  - **##** marks directory or thematic **groups** (e.g., "## Core", "## API Server").
  - **###** marks **individual files** within a group.
  - **Nested bullets** show internal structure **for documentation files only**.
  - Each file heading **links to the file** in the repo.

## Per-File Section Format (Required)

### Documentation Files (.md, .txt, docs)

```
### [path/to/file.md](relative-or-absolute-repo-link)

<1–2 sentences explaining what this file exists to do and when to read it. Keep crisp and factual.>

* <Heading> - <short description of section content>
  * <Subheading> - <description>
```

### Code Files (.ts, .py, .go, .rb, etc.)

```
### [path/to/file.ts](relative-or-absolute-repo-link)

<1–2 sentences explaining what this file exists to do, its role in the system, and when to read it. Keep crisp and factual.>
```

**No bullets for code files** - the purpose blurb is sufficient.

### Bullet Line Grammar (For Documentation Files Only)

- Use: `* {heading} - {short description of the section content}`
- Keep descriptions **concise (≤120 chars)**, factual, and action-oriented.
- Example items:
  - `* Installation - Steps to install CLI and configure environment`
  - `* Configuration - All environment variables with examples`
  - `* Troubleshooting - Common errors and fixes`

## Grouping & Order

- Create **\## groups** per **directory or subsystem** (e.g., "## Core", "## API", "## Configuration").
- Inside a group, **order files by importance** (entry points and public APIs first), then alphabetically.
- **ONLY include the most critical files** (3-8 files per subsystem max):
  - Entry points (main._, index._, server.\*)
  - Configuration files
  - Core domain models/types
  - Key adapters/integrations
  - Critical README/documentation
- **Omit everything else**: utilities, tests, generated files, vendor code, minor components.

## Cross-References (Optional but Recommended)

- When a file’s content is tightly coupled to another file, add a terminal clause to the purpose blurb:
  - `See also: [related/file.ts](...) for X`

Keep references minimal and high-value.

## Writing the Purpose Blurb (1–2 Sentences)

Answer these three in ~30 words:

1.  **What** does this file do?
2.  **Where** in the runtime/request flow does it sit?
3.  **Why/when** should an agent read this file?

Examples:

- “Defines the HTTP server, wiring routes, middleware, and error handling. Read this to understand request lifecycle and where new routes should be registered.”
- “Implements auth token verification and session hydration for API requests. Read before modifying login/signup or adding protected routes.”

## Examples

### Documentation file example

```
### [/docs/deployment.md](./docs/deployment.md)

Explains how to deploy the app to staging and production with CI/CD. Read to debug failing deploys or to add a new environment.

* Overview - Supported environments and prerequisites
* CI Pipeline - Steps, artifacts, and required secrets
* Configuration - Env vars with examples for staging/prod
* Rollbacks - How to revert deploys safely
* Troubleshooting - Common errors and remediation steps
```

### Code file example

```
### [/server/index.ts](./server/index.ts)

Bootstraps the HTTP server, registers middleware and routes, and starts listening. Read to trace request flow and add cross-cutting concerns.
```

## Style & Quality Rules

- **Consistency over completeness**: every listed bullet follows the `* Title - description` rule.
- **No marketing language**; keep neutral, technical, and specific.
- **Do not restate file paths** in bullets (the header already links to the file).
- **Avoid duplication**: if a symbol is defined elsewhere and re-exported, mention “re-exports from X” instead of relisting.

## When You (the Agent) Should Read a File

Read the full file if the purpose blurb matches your task's intent or subsystem. Otherwise, **skip** and use the map to find a closer match.

The document map is a **high-level navigation aid**, not a comprehensive reference. Once you identify the right file from the map, read it fully to understand details.
