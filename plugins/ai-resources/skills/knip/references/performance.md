# Knip performance tuning

When knip takes more than a few seconds, apply these speedups in order:

## 1. Enable the cache

Stores module-resolution results across runs (roughly 20 to 40% faster after the first run):

```bash
npx knip --cache
```

Or persist it in `knip.json`: `{ "cache": true }` (optionally add `"cacheLocation": ".cache/knip"`). Clear stale state with `rm -rf node_modules/.cache/knip`.

## 2. Run under Bun

Bun's startup and module resolution often cut wall-clock time roughly in half on large monorepos:

```bash
bunx knip
# or bun x knip-bun
```

Verify your knip + Bun combination locally before switching CI (`oven-sh/setup-bun`).

## 3. Narrow issue types or workspaces

Analyze only what you are cleaning right now:

```bash
npx knip --include exports,types
npx knip --dependencies
npx knip --files
npx knip --exclude enumMembers,duplicates
npx knip --workspace packages/api --workspace "packages/ui-*"
```

## 4. Cap displayed output on huge backlogs

`npx knip --reporter compact --max-show-issues 20` keeps terminal output readable on legacy repos. It caps display per issue type without reducing computation time.

## 5. Profile bottlenecks

When a run is still unexpectedly slow, inspect phase timings and memory:

```bash
npx knip --performance
npx knip --memory             # peak memory
npx knip --memory-realtime    # live stream
```

Usual culprits: cache disabled, `--include-libs` scanning `node_modules`, overly broad `entry` globs, or generated build outputs missing from `.gitignore` / `!` exclusions in `project`.
