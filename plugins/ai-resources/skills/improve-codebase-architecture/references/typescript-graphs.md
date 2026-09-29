# TypeScript graph collection

Read for TypeScript or JavaScript projects. Use dependency-cruiser with the
project's resolver settings; preserve its raw JSON for repeatable analysis.

## Collect the right populations

Discover application entrypoints from the framework/build configuration: routes,
CLI entry files, workers, library exports, and generated registrations as applicable.
Follow their dependencies rather than marking entire UI or library directories as
production roots. A directory cruise can include stories, fixtures, and unused code.
Keep such an inventory useful, but label it separately from application reachability.

Collect a second graph including the complete test inventory and its import closure.
Obtain that inventory from the runner's configured projects, not just a filename
suffix search. Save setup modules, runner configuration, declared file/glob inputs,
and generated assets alongside it. Source scanners and native tools can read files
without imports; account for what they actually scan even if a read tracer misses it.

Use an existing pinned dependency-cruiser installation, or add a development
dependency through the project's package manager within the authorized scope. Check
its installed help/schema for supported flags. An illustrative configuration is:

```js
// .architecture/dependency-cruiser.cjs
module.exports = {
  options: {
    doNotFollow: { path: "(^|/)node_modules/" },
    tsPreCompilationDeps: "specify",
  },
};
```

```sh
npx --no-install depcruise --config .architecture/dependency-cruiser.cjs \
  --ts-config tsconfig.json --output-type json path/to/app-entry.ts \
  > .architecture/production.json
```

Replace the illustrative paths with discovered roots/configuration and use the
project's execution wrapper where required. Run the test-inclusive cruise with its
full root inventory; use a manifest or the programmatic API when the list is large.
For multiple compiler configurations, collect compatible scopes separately and
normalize identities before combining them. Workspace packages may need traversal
even when reached through `node_modules`; audit the external-package exclusion.

Inspect unresolved imports, aliases, package exports, generated files, and internal
workspace symlinks before interpreting counts. Preserve external edges even when
package internals are outside the study. Record each unresolved internal path or
repair resolution; silently dropped paths can manufacture an apparent decoupling.

## Preserve edge meaning

With `tsPreCompilationDeps: "specify"`, retain `preCompilationOnly` annotations in
the raw output. Retain the installed version's dynamic/module-system/dependency-kind
fields too. Build views from the metadata actually emitted:

| View | Edge treatment and claim |
|---|---|
| Production value reach | Omit `preCompilationOnly` edges; restrict membership to value reach from actual application roots. Include literal deferred imports as potential dependencies. |
| Static import subset | Keep known static value imports. Classify `require` or unknown timing separately; syntax is not proof of evaluation. |
| Type-inclusive reach | Retain type edges. This exposes contract coupling, but is not the compiler's full invalidation graph. |
| Test impact estimate | Reverse value reach intersected with the runner's test inventory, unioned with matching declared inputs. Report setup/configuration expansion separately. |

Value-spelled imports used only as types may be erased by the compiler/transpiler.
Compare emitted imports or the runner's graph where a conclusion depends on that
distinction. Computed imports, reflection, runtime registration, compiler ambient
inputs, and external package internals require additional evidence. Label a raw
cruise separately from evaluated modules and actual rebuild work.

## Analyze files before aggregating domains

Use directed edges **importer → dependency** with normalized file identities and
deduplicated edges. Count unique reachable files and state whether roots count.
A small reusable analyzer should provide:

- Forward closure: what a core, fixture, or entrypoint can reach.
- Reverse closure: who may be affected by an implementation change.
- Shortest paths: concrete witnesses explaining unexpected reach.
- SCC membership, including self-loops, and closed file-level cycle witnesses.
- Every edge inside an SCC that spans reviewed ownership boundaries, including
  bridge files and within-domain edges participating in that cycle.
- Import-selected tests, declared-input-selected tests, and their deduplicated union.

Use Tarjan or Kosaraju for SCCs and breadth-first search for shortest paths. A
folder-level cycle may aggregate unrelated acyclic file paths; use it to navigate,
then judge the file witnesses. A new edge within an existing SCC changes neither
its size nor its count, which is why an exact-edge ratchet is stronger than a ceiling.

Validate custom analysis with small known graphs: a chain, a diamond, a cycle, a
self-loop, and an added edge inside an existing cycle. Check type/deferred-edge
filtering and a non-import input selecting an otherwise unrelated test. Scale the
traversal to the repository; an iterative walk avoids recursion-depth limits.

## Make comparisons reproducible

Save roots, filters, tool versions, unresolved edges, test inventories, and source
snapshot identity with each graph. Compare identical views; when extraction changes
mid-investigation, recompute both sides or mark them incomparable. Preserve an
explicit rename mapping rather than counting a moved module as a deleted dependency.

For enforceable guards, use the project's existing resolver/scanner where possible.
If a lighter scanner is justified, check its alias resolution, type erasure,
re-exports, side effects and literal deferred imports against representative code.
Declare the files/globs that source-scanning architecture tests read so test
selection continues to include them after additions and deletions.
