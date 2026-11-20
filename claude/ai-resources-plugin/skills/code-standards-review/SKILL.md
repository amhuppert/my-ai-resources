---
name: code-standards-review
description: "Audit a codebase or directory against project code standards: general quality, TypeScript safety, tests, file colocation, dependency injection, Zustand, and TanStack Query."
---

# Code standards review

Audit the requested scope (entire project by default, or the directory/files the user named) against only the standards that apply to its stack. This is an assessment unless the user explicitly asks you to implement fixes; do not modify code during a review.

## 1. Detect applicable standards

Inspect `package.json`, config files, and the directory layout inside the requested scope, then load only the matching references from `references/`:

| Scope / stack signal | Load reference | Mode |
| --- | --- | --- |
| Every codebase | [`references/general-code-standards.md`](references/general-code-standards.md) | Compliance |
| Any codebase with feature modules or UI | [`references/colocation-standards.md`](references/colocation-standards.md) | Compliance |
| TypeScript files present | [`references/typescript-general.md`](references/typescript-general.md) | Compliance |
| Tests exist or logic warrants tests | [`references/testing-standards.md`](references/testing-standards.md) | Compliance |
| React / TypeScript app with services or external APIs | [`references/dependency-injection.md`](references/dependency-injection.md) | Prescriptive |
| React / TypeScript app with shared client state | [`references/zustand-reference.md`](references/zustand-reference.md) | Prescriptive |
| React / TypeScript app fetching server data | [`references/tanstack-query-key-factory-reference.md`](references/tanstack-query-key-factory-reference.md) | Prescriptive |

**Prescriptive** standards apply even when the codebase does not yet use that pattern: flag both violations in existing usage and high-value places to adopt the pattern (for example, direct `fetch` calls inside components where DI + TanStack Query belong, or prop-drilled/global state suited to a focused Zustand store). Do not load standards that do not match the stack (for example, skip Zustand and TanStack Query for a pure CLI or backend service).

## 2. Run the review

- For small scopes, review the loaded standards directly in one pass.
- For large scopes with multiple applicable standards, if the environment supports subagents, dispatch parallel read-only subagents (one per standard or subsystem), giving each the scope path and its exact reference file. Keep deduplication and severity ranking in the lead agent.
- Cross-check testing findings against dependency injection: heavy `jest.mock` usage on internal modules is often a symptom of missing DI seams.

## 3. Report findings

Organize the report summary-first:

1. **Scope and standards checked:** exact path reviewed, standards applied, and standards skipped (with reason).
2. **Findings by severity** (`Critical`, `High`, `Medium`):
   - Exact `file:line` reference (verify every line against current code before citing).
   - Standard and specific rule violated, or prescriptive adoption opportunity.
   - Current pattern vs. recommended change, plus concise rationale.
3. **Prioritized fix order:** group related root causes (such as adding DI seams before rewriting brittle mocks) so the user can pick what to fix first.

Done when every applicable standard has been checked against the target scope, every finding cites verified `file:line` evidence, no inapplicable standards were forced onto the stack, and no source files were modified unless the user requested implementation.
