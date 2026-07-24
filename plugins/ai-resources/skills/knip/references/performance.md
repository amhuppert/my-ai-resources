# Performance Tuning

When knip takes more than a few seconds, work through these in order. Each is cheap to try.

## 1. Enable the cache

The cache stores module-resolution results between runs. First-cached run is the same; subsequent runs are ~20–40 % faster.

```bash
npx knip --cache
```

Or permanently:

```json
{ "cache": true }
```

Custom location (e.g., for CI artifact caching):

```json
{ "cache": true, "cacheLocation": ".cache/knip" }
```

Clear when something looks stale: `rm -rf node_modules/.cache/knip`.

## 2. Run with Bun

Bun's startup and module resolution are noticeably faster than Node's. Knip ships a Bun-aware entry:

```bash
bunx knip
# or, if Bun is the package runtime
bun x knip-bun
```

For local dev with large monorepos this can roughly halve wall-clock time. In CI you also need `oven-sh/setup-bun@v1`; verify your knip + bun combination works before switching the CI pipeline over.

## 3. Filter by issue type

If you only care about, say, unused exports, don't run the full analysis:

```bash
npx knip --include exports
npx knip --include exports,types
npx knip --dependencies          # shorthand for dependency issues
npx knip --files                 # shorthand for unused-files only
npx knip --exclude enumMembers,duplicates   # silence the noisy ones
```

Issue-type filtering is also a great tool during iterative cleanup — fix exports first, then deps, then files, focused at each step.

## 4. Filter workspaces in a monorepo

Don't analyze 50 packages when working on one:

```bash
npx knip --workspace packages/auth
npx knip -W packages/auth -W packages/api
npx knip --workspace "packages/ui-*"
```

For a PR-time check, narrow scope to the workspaces that actually changed.

## 5. Cap displayed output

Useful for first-time runs on legacy code with thousands of issues:

```bash
npx knip --max-show-issues 50
npx knip --reporter compact --max-show-issues 20
```

`--max-show-issues` caps display per issue type but knip still computes the full count, so it doesn't actually speed up analysis — it just prevents terminal buffer overflow and makes the output workable.

## 6. Profile when none of the above helps

If knip is still slow on a project that should be quick, ask it where the time goes:

```bash
npx knip --performance
```

Sample output:

```
Performance:
  findWorkspaces: 50ms
  resolveModules: 2500ms  ← bottleneck
  analyzeExports: 1200ms
  resolveTypes: 800ms
```

For memory issues:

```bash
npx knip --memory             # peak usage
npx knip --memory-realtime    # streaming
```

Common causes of slow analysis:
- Cache not enabled.
- `include-libs` walking `node_modules`.
- Too-broad entry patterns matching thousands of files.
- Generated code not excluded from `project`.

## Combined: a typical "this monorepo is too slow" recipe

```bash
# One-time: enable cache permanently
echo '{"cache":true}' > .cache.json   # merge into knip.json

# Iterate locally on a single package
bunx knip --workspace packages/api --include exports,dependencies --max-show-issues 30

# CI: cached, full-mode, compact output
bunx knip --cache --reporter github-actions
```
