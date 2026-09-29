# Feedback-cost experiments

Read when the task includes build, compile, test-selection, or test-latency claims.
Capture the baseline before structural edits; a final fast run alone has no comparator.

## Match the claim to the evidence

| Question | Evidence needed |
|---|---|
| Did coupling shrink? | Comparable forward/reverse closures and concrete paths. |
| Does an edit select fewer tests? | Actual runner selection for equivalent changed paths, plus disclosure of wrapper/setup/declared-input expansion. |
| Do selected tests start faster? | Collection, transformation, setup and environment phases for a fixed test corpus. |
| Does the suite finish faster? | Total wall time and execution phases with comparable selection, workers and host conditions. |
| Does compilation do less work? | Actual compiler/build diagnostics for the relevant edit, cache mode and project configuration. |

Static reach includes potential deferred imports. A fixture may lose hundreds of
reachable files without evaluating fewer modules during collection. Conversely,
fewer selected tests can reduce total feedback cost even if each selected test takes
the same time. Keep those outcomes distinct.

## Design equivalent experiments

1. Choose representative paths: a frequently edited implementation, a public type
   or schema contract, and a focused test/fixture when collection cost matters.
   Public contracts legitimately affect more consumers than implementation details.
2. Save the baseline source state, exact commands/configuration, selected files,
   tool versions and cache policy. Use the project's normal validation entrypoint.
   Verify which checkout's launcher and configuration it actually executes.
3. Keep the structural refactor's entire diff out of a hypothetical one-file edit
   comparison. Use a supported related-file selection API or disposable snapshots
   with equivalent edits. A path-only probe measures selection, not execution or
   content-sensitive compiler invalidation. Keep probes out of product sources.
4. Separate cold startup, warm no-change checks, and warm incremental checks after
   a real edit. Use the same worker limit, compiler flags and cache preparation on
   both sides. Give incompatible compiler versions separate incremental caches.
5. Repeat paired samples and retain the raw distribution plus a summary such as
   the median. Record competing workloads, CPU/memory pressure, swapping and I/O
   constraints. If the host is contended, defer causal claims and rerun under
   comparable conditions rather than attributing the difference to the refactor.

**Complete when:** both sides represent the same workload or edit class, and the
record identifies any uncontrolled difference that could explain the result.

## Instrument only the missing evidence

Prefer the runner/compiler's supported APIs, reports and traces. When ordinary
success output lacks selection or phase data, add a small reporter artifact through
the project's validation tooling. Keep terminal output bounded and preserve failure
details. Record selected file/project identities, result, actual worker settings,
wall time and available phase durations.

Keep collection, transformation, setup, environment preparation, and execution
separate. Parallel phases and transform/collection durations can overlap; their sum
is not necessarily wall time. Represent unavailable measurements explicitly, not
as zero. If an internal tool API is needed, verify it against the installed version
and retain a clear unsupported state.

Check instrumentation through the real launcher and inspect its artifact. When
launchers are shared across checkouts, resolve launcher-owned helpers beside the
launcher and project-owned inputs/output against the tested project. A checkout
missing the new helper must not silently invalidate a compatibility claim.

For compiler investigations, use the installed compiler/build system's profiling
facilities. For TypeScript, extended diagnostics and traces can distinguish program
construction, parsing/binding, type checking, declaration generation and emission.
Choose flags supported by the actual compiler and preserve production check coverage.
Import-graph improvements do not prove reductions in complex type instantiation,
ambient declarations, project-reference invalidation, or generated-code work.

## Follow the measured bottleneck

- **Selection remains broad:** inspect setup/config changes, declared globs, generated
  inputs, public contracts, and alternate production paths. Preserve legitimate
  coverage and shrink only demonstrably overbroad selection.
- **Collection dominates:** profile evaluated modules and transformations; inspect
  mixed barrels, eager defaults, module side effects, fixture imports and required
  infrastructure initialization.
- **Execution dominates:** inspect the test's actual work and fixture lifetime.
  Graph restructuring may be irrelevant to an expensive database, browser, or
  algorithmic operation.
- **Compilation dominates:** identify whether type complexity, file/program breadth,
  declaration output or rebuild invalidation owns the time before changing module
  layout or compiler settings.
- **Host variance dominates:** stabilize the experiment before choosing a code fix.

Report useful structural improvements even when timing is unchanged, alongside the
unmet performance target and the next experiment. Preserve integration coverage and
type-checking obligations; removing useful checks is a coverage tradeoff, not an
architectural speedup.
