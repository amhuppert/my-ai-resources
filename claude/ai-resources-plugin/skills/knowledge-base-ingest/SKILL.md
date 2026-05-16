---
name: knowledge-base-ingest
description: This skill should be used when integrating source material into a knowledge base, including when the user asks to "integrate this document into the knowledge base", "add this transcript to the memory bank", "ingest this document", "update the knowledge base", "analyze a new source document", or "sync current-state docs with this source".
---

# Knowledge Base Ingest

## Overview

Maintain a bounded knowledge base that separates immutable source material from derived analysis and current-state synthesis. A repository or workspace may contain multiple largely independent knowledge-base directories, each focused on a specific feature area, product area, project, or topic.

Use this skill to add new primary documents, integrate new information, reorganize knowledge docs, or keep `index`, `changelog`, `open questions`, and current-state synthesis documents in sync for the specific knowledge-base directory being maintained.

## Discover The Knowledge Base

1. Identify the relevant knowledge-base root from the user's path, request, or existing files. Do not assume there is only one knowledge base for the repository.
2. Default storage location: knowledge bases live under `./kb/<knowledge-base-slug>/` relative to the repository or workspace root. Look for existing knowledge bases under `./kb/` first when discovering, and create new ones there by default.
   - `<knowledge-base-slug>` is a short kebab-case name describing the knowledge base's scope (feature area, product area, project, or topic). Derive it from the user's request when not specified.
   - Honor user-provided paths and pre-existing knowledge bases stored elsewhere (e.g., `memory-bank/`, `docs/knowledge/`, `project-context/`). Do not relocate an existing knowledge base unless explicitly asked.
3. If no structure exists, create this baseline:

```text
./kb/<knowledge-base-slug>/
├── AGENTS.md
├── CLAUDE.md
├── index.md
├── changelog.md
├── open-questions.md
├── primary/
├── derived/
└── current/
```

When initializing a new knowledge base:

- Create the directory at `./kb/<knowledge-base-slug>/` unless the user specifies a different path or an existing knowledge base already lives elsewhere.
- Copy `references/AGENTS.md` from this skill into `<knowledge-base-root>/AGENTS.md`.
- Create `<knowledge-base-root>/CLAUDE.md` that autoloads AGENTS.md via the `@` import syntax. Use `references/CLAUDE.md` from this skill as the template.
- Do not overwrite an existing local `AGENTS.md` or `CLAUDE.md`. If one exists, read it and merge only clearly missing knowledge-base maintenance rules when appropriate.

## Document Roles

Classify files before editing.

Primary documents:

- Historical source artifacts.
- Examples: transcripts, PRDs, PDFs, exported docs, source spreadsheets, raw research notes, raw Figma exports, meeting recordings/transcripts.
- Preserve contents exactly. Move or rename for organization only when requested or clearly needed.

Derived documents:

- Analysis created from primary documents and other inputs.
- Examples: impact reports, research syntheses, design reviews, comparison reports, migration analyses.
- Update when they are maintained reports. For historical analyses, prefer creating a new impact report and updating `current/`.

Current-state documents:

- Maintained synthesis documents that represent the latest understanding within the knowledge base's scope.
- These are the authoritative place for current decisions, risks, scope, open questions, and resolved questions within that scope.

Operating documents:

- `index.md` links all knowledge-base docs with short descriptions.
- `changelog.md` records additions, decisions, clarifications, and changed understanding.
- `open-questions.md` tracks unresolved and resolved questions.
- `AGENTS.md` describes the structure and synchronization rules for future agents.
- `CLAUDE.md` imports `AGENTS.md` so Claude Code automatically loads the same rules when working inside the knowledge-base directory.

## Current-State Synthesis Tree

Use `current/` as a recursive synthesis tree.

- One root current-state document summarizes the knowledge base's scope.
- Child current-state documents focus on major domains or workstreams.
- Parent documents synthesize and link only to immediate children.
- Leaf documents hold the focused detail.
- Directory structure mirrors document hierarchy.

Preferred pattern:

```text
current/
├── <scope>-current-state.md
└── <scope>-current-state/
    ├── domain-a-current-state.md
    ├── domain-b-current-state.md
    └── domain-c-current-state.md
```

When a leaf grows too broad, split it:

```text
current/
├── <scope>-current-state.md
└── <scope>-current-state/
    ├── domain-a-current-state.md
    └── domain-a-current-state/
        ├── focused-topic-1-current-state.md
        └── focused-topic-2-current-state.md
```

Name child directories after the exact stem of their parent document.

## Ingest A New Source

Follow this sequence when adding or analyzing a new source document.

1. Preserve the source.
   - Place it under the relevant `primary/` subdirectory.
   - Create subdirectories by source type if useful: `transcripts/`, `prds/`, `source-docs/`, `research/`, `design/`.
   - Do not edit primary document content.

2. Extract and inspect.
   - For PDFs, extract text and comments/annotations when possible.
   - For transcripts, identify speakers, date, and topic sections.
   - For spreadsheets or structured docs, preserve raw source and summarize only the relevant current-state facts.

3. Compare against current state.
   - Start from the root current-state document.
   - Read relevant leaf documents.
   - Classify each source fact as new, confirming, conflicting, resolving a question, or raising a question.

4. Create a derived impact report when the source changes understanding.
   - Put it under `derived/impact-reports/` unless local instructions specify another location.
   - Include source reliability, new information, resolved questions, new questions, contradictions, and recommended updates.

5. Update focused current-state leaves first.
   - Keep synthesis concise.
   - Capture uncertainty explicitly.
   - Link supporting primary and derived documents.

6. Propagate upward.
   - Update each parent synthesis affected by changed children.
   - Continue until the root current-state document is accurate.

7. Update `open-questions.md`.
   - Add new unchecked questions with context and supporting links.
   - Check off resolved questions.
   - Add answer, date/source context, caveats, and links for resolved questions.

8. Update `changelog.md`.
   - Record source additions, decisions, changed understanding, and resolved questions.

9. Update `index.md`.
   - Link every documentation file in the knowledge base.
   - Include a short description of each file.

10. Verify.
    - Check local links after moves or edits.
    - Search for stale references to old paths.
    - Report extraction limitations and unresolved assumptions.

## Reorganize Existing Docs

When asked to reorganize a knowledge base:

1. Inventory existing files.
2. Classify each as primary, derived, current-state, or operating.
3. Move primary documents without changing content.
4. Move derived documents into an analysis/review/impact-report structure.
5. Create or repair the current-state synthesis tree.
6. Create or update `AGENTS.md`, `CLAUDE.md`, `index.md`, `changelog.md`, and `open-questions.md`.
   - For a new knowledge base, copy this skill's `references/AGENTS.md` and `references/CLAUDE.md` templates into the knowledge-base root.
   - For an existing knowledge base, preserve local `AGENTS.md` / `CLAUDE.md` and only add missing synchronization guidance if needed. If `AGENTS.md` exists but `CLAUDE.md` does not, add a `CLAUDE.md` that imports `AGENTS.md`.
7. Fix relative links.
8. Verify all local links resolve.

## Conflict Handling

If sources conflict:

- Preserve the conflict in the relevant current-state document.
- Prefer newer primary sources only when they clearly supersede earlier material.
- Record confidence and caveats.
- Add or update an open question when no explicit decision resolves the conflict.
- Add a changelog entry if the conflict changes current understanding.

## Output Standard

End with a concise report:

- Files added.
- Files moved.
- Files updated.
- Questions added or resolved.
- Validation performed.
- Any limitations or assumptions.

## Reference Files

- `references/AGENTS.md` — Template for the knowledge-base root's `AGENTS.md` describing structure and synchronization rules for future agents.
- `references/CLAUDE.md` — Template that imports `AGENTS.md` via the `@` syntax so Claude Code autoloads the same rules.
