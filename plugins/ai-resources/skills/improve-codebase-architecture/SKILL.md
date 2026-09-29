---
name: improve-codebase-architecture
description: Improve codebase architecture by investigating tight coupling,
  misplaced domain ownership, dependency cycles, or excessive compile/test
  impact. Use for module boundary audits, behavior-preserving structural
  refactors, and feedback-cost investigations driven by dependencies.
---

# Improve Codebase Architecture

Use dependency evidence to find candidates, domain judgment to choose boundaries,
and measured outcomes to judge the change. A smaller graph is useful only when
it represents clearer ownership or less necessary work.

## 1. Define the investigation

Resolve the requested mode: diagnosis produces findings; implementation also
changes and validates the authorized scope. Read the repository's contracts,
architecture notes, build configuration, test profiles, and relevant entrypoints.
Use the project's supported validation path. For a
bounded diagnosis, start from supplied paths and evidence; expand the survey only
where missing dependencies could change the conclusion, and label coverage limits.

Choose representative changes whose impact matters: an implementation edit,
a public contract edit, or a recurring feature change. Name the symptoms being
addressed: change amplification, hidden production capabilities, unclear policy
ownership, slow test selection/collection/execution, or expensive compilation.

**Complete when:** scope, representative changes, relevant roots/inventories, and
success criteria are recorded. Keep structural and performance
criteria separate so one cannot stand in for the other.

## 2. Build an evidence baseline

Capture a reproducible file/module graph before editing. Use a language-aware
resolver that matches the project's aliases, package boundaries, and build
configuration. For TypeScript, prefer dependency-cruiser and read
[TypeScript graph collection](references/typescript-graphs.md); an existing
analyzer with equivalent resolution and evidence can serve a bounded diagnosis.
For other languages, use the compiler, build system, or an appropriate dependency
analyzer and state its limitations.

Keep separate views for production value dependencies, compile/type dependencies,
and tests plus their declared non-import inputs, as relevant to the scoped claim.
Include fixtures, setup,
generated inputs, and runner configuration in the test inventory. Record edge
kinds, unresolved dependencies, roots, exclusions, tool versions, and the source
revision or working-tree snapshot with the raw data.

Analyze strongly connected components (SCCs), concrete cycle witnesses, shortest
paths, forward dependency reach, and reverse dependent reach at the language's
actual dependency unit: files, packages, or build targets. Retain source locations
for the edges. Higher-level summaries follow that evidence; TypeScript folder
aggregation, for example, needs underlying file-level witnesses.
For each measured change, estimate affected tests from reverse reach plus declared
inputs; label that estimate separately from the runner's actual selection.

**Complete when:** every shortlisted coupling has a concrete import path or a
source-backed non-import dependency, and every reported metric has a defined
corpus and edge filter. Resolve internal-path gaps or limit conclusions to the
verified portion of the graph.

## 3. Decide ownership and prioritize

Read the code, callers, behavior tests, and relevant history at each candidate
boundary. Use [Ownership decisions](references/ownership.md) to distinguish
canonical contracts, policy, storage codecs, adapters, and production composition.
Infer ownership from business decisions and invariants, not directory names.

For every candidate, record:

- The decision or capability being acquired, its current owner, and its proper owner.
- Concrete callers and paths, including alternate paths through fixtures or defaults.
- Whether the crossing is legitimate, unnecessarily broad, or duplicates another
  domain's decision; cite the behavior that establishes the classification.
- The smallest useful change, replacement dependencies, invariants to preserve,
  and expected structural or measured feedback benefit.

Rank by demonstrated pain, frequency of relevant edits, avoidable work, confidence,
and change risk. Treat recent history as a sample; distinguish semantic changes
from mass formatting, generated updates, and mechanical moves. Broadly consumed
stable contracts may be correctly placed. A rare but incorrect ownership decision
can matter more than a high-fan-in utility.

**Complete when:** each proposed refactor names a responsibility and real consumers,
and explains why its replacement is simpler. For an audit, deliver this ranked
inventory and the evidence; implementation continues below when authorized.

## 4. Refactor one responsibility at a time

Choose a bounded slice with observable invariants. Prefer direct consumer rewiring,
focused pure policy/projection modules, or a required-dependency core composed by
a production entrypoint. Retain integration fixtures where real state and lifecycle
behavior are what the test proves. Keep external compatibility obligations explicit.

Model the graph **with replacement edges**, then verify it against actual source
imports. Moving a default factory may expose another route through a helper,
barrel, service singleton, or test fixture. Recompute transitive reach after each
slice rather than assuming removal of one direct import closes the boundary.

For behavior changes and bug fixes, establish the failing behavioral reproduction
before the fix. For a mechanical move or wiring-only change, state that it preserves
behavior and use existing coverage plus appropriate boundary checks. Characterize
uncertain behavior before relocating it. Preserve transaction authority, lifecycle
identity, evaluation timing, error contracts, and serialization semantics where
those are part of the interface.

**Complete when:** production and test callers use the intended owner, alternate
unwanted paths are closed within the verified roots and dependency model,
replacement abstractions have current consumers, and
the relevant behavior and integration checks pass.

## 5. Verify structure and feedback cost

Recompute the same graph views over the same roots and filters. Account for renamed
files, additions, removals, and inventory changes in the comparison. Run the
repository's required checks and inspect the resulting diff for generated or
snapshot drift.

When compile/test performance is part of the task, follow
[Feedback-cost experiments](references/feedback-cost.md). Measure actual selection
and the phase being improved for equivalent edits, with controlled worker, cache,
and host conditions. An import reduction alone establishes neither fewer evaluated
modules nor faster compilation. Report unchanged or worse timings as results.

**Complete when:** every claimed improvement has comparable evidence, required
checks have terminal verdicts, and remaining measurement gaps are explicit. If a
performance target remains unmet, name the next discriminating experiment instead
of declaring that target achieved.

## 6. Preserve the boundary and hand off

For material, recurring boundaries, reuse or add proportionate executable guards:
core-to-production reach restrictions, public contract boundaries, or exact
cycle-edge allowances. Wire them into the existing validation path. A focused
behavior test may already cover the obligation; add graph machinery when the
dependency restriction itself needs enforcement. For unavoidable cyclic edges, record
why each survives and what makes its allowance removable. A shrink-only ratchet
removes obsolete allowances and rejects new edges, including additions inside an
existing SCC. Validate the guard with a representative violating edge.

Report the ownership changes, behavior checks, comparable graph/selection/timing
results, surviving couplings, and next priorities. Keep raw evidence discoverable;
the main report should let another engineer identify the next owner and verify
why that boundary matters.

**Complete when:** implemented boundaries have appropriate regression coverage, survivors are
explained, and the report distinguishes completed structural work from any
unproven performance objective.
