# Knowledge Base Instructions

This directory is a focused knowledge base for a specific feature area, product area, project, or topic.

A repository may contain multiple sibling knowledge-base directories. Treat this directory as authoritative only for its own scope, and do not assume it is the single canonical knowledge base for the whole repository.

## Organization

Documents are organized by role:

- `primary/` contains historical source artifacts. Preserve these exactly as created. Do not edit their contents to reflect newer understanding.
- `current/` contains maintained current-state synthesis documents. These are the authoritative place to look for the latest understanding within this knowledge base's scope.
- `derived/` contains analysis, impact reports, design reviews, comparisons, migration analyses, and other documents derived from primary sources or other inputs.
- `index.md` lists every knowledge-base documentation file and describes its purpose.
- `changelog.md` records document additions, decisions, clarified requirements, and changes in understanding.
- `open-questions.md` tracks unresolved and resolved questions.

Use names already established in this repository or knowledge area when they clearly express the same roles.

## Current-State Synthesis Tree

The `current/` directory is a hierarchical synthesis tree.

- One root current-state document summarizes this knowledge base's scope.
- A document may own child documents by having a sibling directory with the same stem.
- Parent documents synthesize and link only to their immediate child documents.
- Leaf documents hold focused current-state detail.
- When a leaf grows too broad, split it by creating a matching child directory and moving focused topics into child documents.
- Directory structure mirrors document hierarchy. Example:
  - `current/<scope>-current-state/domain-current-state.md`
  - `current/<scope>-current-state/domain-current-state/focused-topic-current-state.md`
- When updating a child document, update its parent summary if the change affects decisions, risks, resolved questions, scope, or implementation guidance.
- Continue propagating summaries upward until the root current-state document remains accurate.

## Primary Document Rules

- Never modify the contents of files under `primary/`.
- Rename or move a primary file only when improving organization, and update `index.md`, `changelog.md`, and supporting links.
- If a primary document contains outdated or incorrect information, record the correction in `current/`, `derived/impact-reports/`, `open-questions.md`, or `changelog.md`; do not patch the primary artifact.

## Adding A New Primary Document

When adding a new transcript, PDF, PRD, source export, research artifact, or other primary document:

1. Save it under the appropriate `primary/` subdirectory.
2. Create a dated impact report under `derived/impact-reports/`.
3. Compare the new source against relevant `current/` documents.
4. Update every affected leaf document in `current/`.
5. Propagate changes up the current-state synthesis tree.
6. Update `open-questions.md` with new questions and resolved questions.
7. Update `changelog.md`.
8. Update `index.md`.

## Updating Derived Documents

- Derived documents can be updated when they are maintained reports.
- For legacy reports, prefer leaving the original analysis intact and capturing newer understanding in `current/` plus `changelog.md`.
- If a moved derived document has stale internal links, fix the links.

## Open Questions

When a question is resolved:

1. Check it off in `open-questions.md`.
2. Add the answer.
3. Add context explaining scope, confidence, and caveats.
4. Link supporting primary and derived documents.
5. Update affected `current/` documents.
6. Add a `changelog.md` entry.

When a new question is raised:

1. Add it unchecked in the correct section of `open-questions.md`.
2. Link the document that raised it.
3. If it changes risk, scope, or implementation guidance, update the relevant `current/` document and parent synthesis.

## Link Hygiene

- Prefer relative links.
- After moving or creating docs, run a link/file existence check when practical.
- `index.md` must link every knowledge-base documentation file, including operating docs.
