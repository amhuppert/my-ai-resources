# Implementation Plan

- [x] 1. Establish the shared plan data contract
  - Define the plan value objects: positions, text edits whose replacement text already incorporates any compiler-provided prefix/suffix, file-edit groups carrying a content fingerprint, file renames carrying a source fingerprint and an overwrite flag, project scope, and apply result.
  - Separate the rendering-free plan draft (operation, edits, renames, scope) produced by engines from the derived edit plan (id, summary, diff) so backends never produce rendering fields.
  - Add strict runtime validation at boundaries and prove a plan serializes to and from JSON with no loss (write the failing round-trip test first, then implement).
  - _Requirements: 3.3, 8.1_

- [x] 2. Build the engine seam and warm project host with scope reporting
- [x] 2.1 Define the backend-agnostic planning seam and warm project host
  - Establish the engine interface (load project, plan rename, plan move, plan move-dir, refresh files, dispose) that returns rendering-free drafts only, keeping the transport/protocol surface independent of the chosen backend so a future backend needs no client change.
  - Build a single warm project from a tsconfig and reuse it; load the full configured graph and its project references by default, allowing intentional narrowing.
  - _Requirements: 8.1, 8.3_
- [x] 2.2 Report honest project scope and public-entry-point warnings
  - Attach the loaded tsconfig and file count to results, and reflect any intentional narrowing of the loaded graph.
  - Emit a heuristic warning when a renamed symbol is exported through a public entry point (a package entry target or a tsconfig root/index barrel); present warnings as heuristic disclosures, never as detected references, and never treat absence of a warning as proof of completeness.
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 3. Implement symbol rename planning
- [x] 3.1 Plan renames at a position with correct edit translation
  - Resolve the symbol at a given file and offset and produce non-overlapping edits covering every reference within the loaded program, grouped by file and fingerprinted against current contents.
  - Compose each edit's replacement text from the compiler's prefix, new name, and suffix so shorthand-property and alias-preserving rewrites stay correct rather than dropping inserted text.
  - Cover re-exports and barrels, namespace members, overloaded signatures, and aliased imports per TypeScript resolution, preserving alias bindings.
  - Bound the wrapper-node cache by scoping node usage for each operation.
  - _Requirements: 1.1, 1.2_
- [x] 3.2 Handle positions, missing symbols, and bare-name rejection
  - Accept 1-based line and column or a 0-based offset, interpreting columns and offsets as UTF-16 code units, including multibyte characters and CRLF files.
  - Reject a position that resolves to no renameable symbol with a distinct outcome and no disk write, and reject a bare name supplied without a position as a usage error.
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 4. Implement file and directory move planning
- [x] 4.1 Plan moves via the non-mutating file-rename edit query
  - Rewrite every importer that resolves to the moved path across relative, baseUrl, paths-alias, index-file, and explicit-extension forms, plus the moved file's own imports, and emit the file rename(s) and specifier edits as one plan without touching disk.
  - Plan directory moves through the same directory-aware query without per-file decomposition, accepting that the compiler chooses the rewritten specifier style.
  - Leave the warm project structurally and textually identical after planning, since the query is non-mutating and needs no rollback.
  - _Requirements: 2.1, 2.2, 2.3_
- [x] 4.2 Warn on package-boundary moves
  - Emit a scope warning instead of rewriting when a move would cross a package exports or imports subpath boundary, which is out of MVP scope.
  - _Requirements: 2.4_

- [x] 5. Derive edit plans from engine drafts
- [x] 5.1 (P) Render unified diffs for edits and renames
  - Produce a human-readable unified diff covering text edits and file renames for review.
  - Depends only on the plan data contract (task 1); can proceed in parallel with the engine track.
  - _Requirements: 3.2_
- [x] 5.2 Compute the derived edit plan
  - From an engine draft, compute a stable content-derived plan identifier, a triage summary of files touched, edit count, and reference count, and attach the rendered diff, in a plan layer shared across all backends.
  - _Requirements: 3.2, 3.5, 8.2_

- [x] 6. (P) Implement the staleness-gated apply executor
  - Preflight every edited file's content fingerprint and every rename source's fingerprint, and confirm each rename destination is absent unless overwrite is allowed; on any mismatch or collision, abort the whole plan without writing, report the offending paths, and signal a rejected apply.
  - Apply text edits end-to-start keyed to the pre-rename path, then perform renames creating parent directories, so a file that is both edited and renamed is edited at its source and then moved.
  - Relax only content-staleness under an allow-stale option while still rejecting destination collisions and emitting a prominent warning; keep no backups, leaving reversal to the agent's version control.
  - Engine-agnostic: depends only on the plan data contract (task 1) and can proceed in parallel with the engine track.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Build the warm session manager
- [x] 7.1 Coordinate the session lifecycle and plan reuse
  - Build the program once and reuse it across operations, loading lazily on first use or eagerly in serve mode; keep a plan-identifier-to-plan map so an earlier plan can be applied without re-sending it; refresh affected files after apply so later operations observe committed state.
  - _Requirements: 5.1, 5.5_
- [x] 7.2 Expose status and enforce memory discipline
  - Report loaded scope, heap usage, and counters for operations performed and program builds; keep the wrapper-node cache bounded so heap plateaus over a long session; ensure warm operations are dominated by reference-finding rather than program build, with no rebuild between cold and warm runs.
  - _Requirements: 5.3, 5.4, 9.1, 9.2, 9.3_

- [x] 8. Implement the serial NDJSON serve loop
  - Exchange exactly one JSON object per line and echo the request identifier on each response, processing requests serially against the warm program.
  - Validate each request's parameters against a strict schema and reject malformed requests as usage errors while keeping the session alive; on any per-request error, return an error response and continue rather than terminating.
  - Emit only protocol responses on stdout and route all logs, diagnostics, and progress to stderr, surfacing plan, apply, status, and scope-warning results through the protocol.
  - _Requirements: 5.2, 6.1, 6.2, 6.3, 6.4_

- [x] 9. Build the one-shot CLI surface and reporting
- [x] 9.1 Provide the plan-only-by-default command surface
  - Offer rename, move, move-dir, apply, and serve commands; default every mutating command to plan-only so it writes nothing unless apply is requested; support writing the JSON plan to a file; control stdout rendering between machine-readable, diff, and both while keeping logs on stderr.
  - _Requirements: 3.1, 3.4_
- [x] 9.2 Map outcomes to summaries and process exit codes
  - Produce agent-facing summaries and warnings, and return process exit codes of success, usage error, no-symbol, rejected apply, and internal engine error for the corresponding outcomes.
  - _Requirements: 6.5_

- [x] 10. Package the binary and register installation
  - Compile the entry point to the package's JavaScript dist output and register a corresponding executable entry following the existing package pattern, and register the new binary in the user-level installer alongside the others.
  - Keep exactly one new runtime dependency and run no editor language-server process.
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 11. Validate end to end with oracle, safety, and performance suites
- [x] 11.1 (P) Rename oracle integration tests
  - Rename a symbol referenced across files including a re-export or barrel and an aliased import, and compare the result against a compiler-program reference set.
  - _Requirements: 1.6_
- [x] 11.2 (P) Move resolution-form integration tests
  - Move a file imported via each covered resolution form and assert every importer is updated and the project still resolves after apply; assert a move crossing a package exports boundary warns instead of rewriting.
  - _Requirements: 2.4, 2.5_
- [x] 11.3 Warm-session and apply-safety integration tests
  - Drive a session through many operations and assert the program is built once and heap plateaus; mutate an edited target and a renamed source between plan and apply and assert rejection; confirm allow-stale overrides content staleness but still rejects a pre-existing destination.
  - _Requirements: 4.2, 4.4, 5.1, 5.4_
- [x] 11.4 (P) Performance regression checks
  - Compare cold versus warm latency for the same rename and confirm the warm run does not rebuild, and track heap over many operations with and without the wrapper-cache discipline.
  - _Requirements: 9.1, 9.2, 9.3_
