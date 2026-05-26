# CI Integration

How to wire knip into a CI pipeline so dead code doesn't regress, without making the build painful to land changes against.

## The canonical two-check pattern

Run knip twice in CI: once in **production mode**, once in default mode. They catch different things.

- **`--production`** catches issues in shipping code: unused production deps, unused exports of shipped code, unused production files. These affect bundle size and end users.
- **default** catches dev-tooling waste: unused devDependencies, unused test helpers, unused scripts.

```yaml
name: CI
on: [push, pull_request]
jobs:
  knip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci --ignore-scripts
      - name: Production mode
        run: npx knip --production --strict
      - name: Default mode
        run: npx knip
```

In a monorepo, `--strict` (alias `--isolate-workspaces`) catches phantom deps that work locally due to hoisting but break at publish time. See [`monorepo.md`](monorepo.md).

## Gradual adoption with `--max-issues`

When introducing knip to an existing project with hundreds of pre-existing issues, an all-or-nothing check blocks every PR and the team disables knip within a week. Use `--max-issues` to ratchet down:

```yaml
- run: npx knip --max-issues 500   # Week 1: baseline
- run: npx knip --max-issues 300   # Week 3: after first cleanup sprint
- run: npx knip --max-issues 0     # Week N: clean
```

Each ratchet down is a separate PR. The number only goes down — if a PR adds new dead code, it fails.

Alternative for the very first runs: `--no-exit-code` reports issues without failing the build. Use only as a transitional measure; an unenforced check rots fast.

## Reporters

| Reporter | Use case |
|---|---|
| `symbols` *(default)* | Local terminal — grouped output with symbols |
| `compact` | CI logs — one line per issue, easier to grep |
| `github-actions` | GitHub Actions — inline annotations on the changed files |
| `json` | Machine-readable — for custom processors, dashboards, or bots |
| `markdown` | Pasting into a PR comment or issue |
| `codeowners` | Group findings by CODEOWNERS for routing |

Examples:

```bash
# GitHub Actions: inline annotations
npx knip --reporter github-actions

# CI logs: compact + cap output
npx knip --reporter compact --max-show-issues 20

# Machine-readable
npx knip --reporter json > knip-report.json
```

## Cache

Knip's cache survives between CI runs and typically cuts a clean run by 10–40 %. Cache invalidates when the lockfile changes, so the cache key should be lockfile-hashed:

```yaml
- name: Cache knip
  uses: actions/cache@v4
  with:
    path: node_modules/.cache/knip
    key: knip-${{ hashFiles('**/package-lock.json') }}
    restore-keys: knip-

- run: npx knip --cache
```

You can also enable caching permanently in `knip.json`:

```json
{ "cache": true }
```

For pnpm/yarn/bun, swap `package-lock.json` for the matching lockfile path.

## Auto-fix in CI (be careful)

Do **not** run `npx knip --fix` directly in CI without a review step — it deletes files. Two safer patterns:

1. **Scheduled cleanup PR.** Run `knip --fix --allow-remove-files` on a schedule, push the result as a PR for human review.
2. **Local-only auto-fix.** Add an `npm run knip:fix` script developers run intentionally. CI only verifies, never mutates.

After any `--fix`, always run the formatter so removed exports don't leave dangling commas:

```bash
npx knip --fix --format     # knip detects Prettier/Biome/dprint/deno fmt automatically
# or, explicitly
KNIP_FORMATTER=biome npx knip --fix --format
```

## package.json scripts

Adding scripts makes the canonical invocations memorable and lets CI and developers share the same commands:

```json
{
  "scripts": {
    "knip": "knip",
    "knip:production": "knip --production --strict",
    "knip:fix": "knip --fix --allow-remove-files --format"
  }
}
```

## Local watch mode

For local development (not CI), watch mode gives immediate feedback while refactoring:

```bash
npx knip --watch
npx knip --watch --include exports   # focus on a single issue type
```

Useful during a cleanup sprint or when learning an unfamiliar codebase.

## Quick CI checklist

1. Two checks: `--production --strict` and default.
2. Use `actions/cache` keyed on the lockfile, pass `--cache`.
3. Pick a CI-friendly reporter (`github-actions` on GitHub Actions, `compact` elsewhere).
4. For pre-existing dead code, ratchet down with `--max-issues`.
5. Never run `--fix` in CI without a human-review gate.
