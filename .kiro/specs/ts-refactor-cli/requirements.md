# Requirements Document

## Introduction

`ts-refactor` is a fast, agent-facing CLI that performs semantically-correct TypeScript refactors — renaming symbols and moving/renaming files and directories, updating every reference within the loaded project — **without** standing up an editor language-server (`tsserver`/LSP) daemon. It is optimized for machine consumption: deterministic position-addressing, machine-readable plans, inspectable diffs, staleness-gated apply, and a warm `serve` process that builds the TypeScript program once per session.

These requirements are backfilled from the existing design (`design.md`); the design's Objectives, Success Criteria, Non-Goals, and Error Categories are the source. Where the two ever diverge, the requirements below are authoritative for *what* the tool must do; the design owns *how*.

### Out of Scope (non-goals)

- **Self-reversing plans / non-git reversal.** Reversal of an applied change relies on the agent working under version control (git worktree/branch). The plan stores content hashes for staleness detection only and is **not** self-reversing; the executor keeps no backups. (Confirmed not a requirement.)
- **Editor LSP server.** No editor protocol, diagnostics, completions, hover, or file watchers.
- **Raw `LanguageService` or `tsgo` backend in the MVP.** The engine seam is built; only the ts-morph backend is implemented now.
- **Conflict/shadowing safety analysis** beyond what TypeScript itself provides. The tool surfaces warnings, not guarantees; correctness of a result is verified out-of-band (`tsc --noEmit`).
- **Cross-project/monorepo orchestration** beyond a single loaded project (one tsconfig + its project references).
- **Symbol-name-based addressing.** Renames are addressed by file + position only.
- **Package `exports`/`imports` subpath rewriting on move (MVP).** A move crossing a package boundary warns instead of rewriting.

## Requirements

### Requirement 1: Semantic Symbol Rename

**Objective:** As an AI coding agent, I want to rename a symbol identified by file and position and have every reference updated, so that I can refactor names without manually finding and corrupting same-named or aliased references.

#### Acceptance Criteria

1. When the agent requests a rename with a file path and a source position, the rename planner shall resolve the symbol at that position and produce edits covering all of its references within the loaded program.
2. When references include re-exports/barrels, namespace members, overloaded signatures, or aliased imports (`import { x as y }`), the rename planner shall update each reference according to TypeScript's resolution and preserve alias bindings.
3. The rename planner shall accept positions as 1-based line and 1-based column, or as a 0-based offset, interpreting columns and offsets as UTF-16 code units.
4. If no renameable symbol exists at the given position, the rename planner shall reject the request with a distinct "no symbol" error and exit code 3, without writing to disk.
5. If the request supplies only a bare symbol name without a position, the CLI shall reject it as a usage error rather than performing a name-based rename.
6. The rename planner shall produce results that match a `tsc`-based reference oracle on the fixture suite (re-exports, barrels, aliased imports, namespace members, overloads).

### Requirement 2: File and Directory Move / Rename

**Objective:** As an AI coding agent, I want to move or rename a file or directory and have all import/export specifiers updated, so that I can reorganize a codebase without breaking module resolution.

#### Acceptance Criteria

1. When the agent requests a move of a file or directory, the move planner shall rewrite every import/export specifier that resolves to the moved path for relative, `baseUrl`, tsconfig `paths`-alias, index-file, and explicit-extension resolution forms.
2. When a move plan is produced, the move planner shall include both the file rename(s) and the specifier edits in a single plan without changing disk.
3. While planning a move, the move planner shall leave the in-memory project structurally and textually identical to its pre-plan state.
4. Where a move would cross a package `exports`/`imports` boundary, the move planner shall emit a scope warning rather than silently rewriting the subpath.
5. The move planner shall produce a plan in which every importer is updated such that the project still resolves after apply (verified against the fixture project).

### Requirement 3: Plan / Apply Separation

**Objective:** As an AI coding agent, I want every mutating operation to produce an inspectable plan before any disk change, so that I can review and validate edits before committing them.

#### Acceptance Criteria

1. The CLI shall default every mutating command to plan-only, printing the plan and writing nothing unless apply is explicitly requested.
2. When a plan is produced, ts-refactor shall provide a machine-readable edit list (file edits and file renames), a human-readable unified diff, and a summary of files touched, edit count, and reference count.
3. The system shall serialize a plan to and from JSON without loss, so a plan produced in one-shot mode can be applied later or in serve mode.
4. When `--plan-out <file>` is given, ts-refactor shall write the JSON plan to that path without applying it.
5. The system shall assign each plan a stable content-derived identifier so it can be referenced for apply within a session.

### Requirement 4: Safe Apply with Staleness Gating

**Objective:** As an AI coding agent, I want apply to refuse when the codebase changed since planning, so that I never commit edits computed against stale content or clobber an existing file.

#### Acceptance Criteria

1. Before writing any change, the apply executor shall validate that every edited file and every rename source still matches the content recorded at plan time, and that each rename destination is absent unless overwrite is explicitly allowed.
2. If any target is stale or any destination collides, the apply executor shall abort the entire plan without writing any file, report the offending paths, and exit with code 4.
3. When applying, the apply executor shall write text edits keyed to the pre-rename (source) path before performing file renames, so a file that is both edited and renamed is edited at its source path and then moved.
4. Where `--allow-stale` is given, the apply executor shall relax content-staleness checks only, shall still reject destination collisions, and shall emit a prominent warning.
5. The apply executor shall not retain backups, and reversal of an applied plan shall rely on the agent's version control rather than the plan itself.

### Requirement 5: Warm Serve Session

**Objective:** As an AI coding agent, I want a long-lived session that builds the project once, so that repeated refactors within a session are fast.

#### Acceptance Criteria

1. When started in serve mode, ts-refactor shall build the TypeScript program once and reuse it across subsequent operations in the session.
2. The serve session shall process requests serially, handling one request at a time against the warm program.
3. When `status` is requested, the serve session shall report the loaded scope, heap usage, and counters for operations performed and program builds.
4. While a session remains open across many operations, ts-refactor shall keep memory bounded (plateauing) rather than growing unbounded.
5. When apply references a plan identifier from an earlier plan in the same session, the serve session shall apply that plan without requiring the plan to be re-sent.

### Requirement 6: NDJSON Protocol and CLI Transport

**Objective:** As an AI coding agent, I want a minimal, machine-parseable protocol and CLI, so that I can drive the tool programmatically without parsing noise.

#### Acceptance Criteria

1. The serve loop shall exchange exactly one JSON object per line for each request and response, echoing the request identifier on the response.
2. While in serve mode, ts-refactor shall emit only protocol responses on stdout and route all logs, diagnostics, and progress to stderr.
3. The serve loop shall validate each request's parameters against a strict schema and reject malformed requests with a usage error while keeping the session alive.
4. If a per-request error occurs in serve mode, ts-refactor shall return an error response and continue the session rather than terminating the process.
5. In one-shot mode, the CLI shall exit 0 on success, 2 on usage error, 3 on no-symbol, 4 on rejected apply, and 5 on internal engine error.

### Requirement 7: Honest Scope Reporting

**Objective:** As an AI coding agent, I want truthful disclosure about references that may lie outside the loaded project, so that I know when the "update every reference" guarantee is scoped.

#### Acceptance Criteria

1. The system shall state, in every result, which project graph (tsconfig plus project references) was loaded and how many files it contains.
2. When a renamed symbol is exported through a public entry point (a `package.json` `main`/`module`/`exports`/`types` target, or a tsconfig root or index barrel), ts-refactor shall emit a scope warning that external references may exist and are not covered.
3. The system shall present scope warnings as heuristic disclosures rather than detected references, and the absence of a warning shall not be represented as a guarantee of completeness.
4. Where the loaded graph is intentionally narrowed, ts-refactor shall reflect the narrowing in the reported scope so the agent knows the guarantee is scoped.

### Requirement 8: Swappable Semantic Backend (Engine Seam)

**Objective:** As a maintainer, I want the semantic backend isolated behind an interface, so that ts-morph can later be replaced (raw `LanguageService`, `tsgo`) without changing the CLI or protocol.

#### Acceptance Criteria

1. The engine seam shall expose planning operations that return a rendering-free plan draft (operation, file edits, file renames, scope) and shall not produce plan identifiers, summaries, or diffs.
2. The system shall derive the plan identifier, summary, and unified diff in a plan layer that is shared across all backends.
3. While only the ts-morph backend is implemented, ts-refactor shall keep the CLI and protocol surface unchanged so that adding a future backend requires no client changes.

### Requirement 9: Performance and Memory Discipline

**Objective:** As an AI coding agent, I want warm operations to avoid re-paying the build cost and memory to stay bounded, so that long sessions remain fast and stable.

#### Acceptance Criteria

1. While in serve mode, the second and subsequent operations shall be dominated by reference-finding cost rather than program-build cost.
2. When the same rename is performed cold versus warm, the warm operation shall not rebuild the program.
3. The system shall bound its wrapper-node cache so that heap usage plateaus across a long session of many operations.

### Requirement 10: Build and Packaging

**Objective:** As a maintainer, I want ts-refactor built and installed using the existing `typescript/` package pattern, so that it ships consistently with the other binaries.

#### Acceptance Criteria

1. The build shall compile `scripts/ts-refactor.ts` to `dist/ts-refactor.js` using the `typescript/` package's Bun build pattern and register a corresponding `bin` entry.
2. The user-level installer shall register the `ts-refactor` binary alongside the existing binaries.
3. The system shall introduce exactly one new runtime dependency (`ts-morph`) and shall run no editor language-server process.
