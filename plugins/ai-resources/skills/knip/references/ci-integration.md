# Knip CI integration

Wire knip into CI so dead code cannot creep back in without blocking adoption on legacy repos.

## Two-check CI pattern

Run both production mode and default mode because they catch different problems:

- `npx knip --production --strict` (or `--strict` alone, which implies `--production`): catches unused shipped files, exports, production dependencies, and hoisted phantom deps in monorepos.
- `npx knip`: catches unused `devDependencies`, test helpers, and dev scripts.

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
      - name: Cache knip
        uses: actions/cache@v4
        with:
          path: node_modules/.cache/knip
          key: knip-${{ hashFiles('**/package-lock.json') }}
          restore-keys: knip-
      - name: Production check
        run: npx knip --strict --cache --reporter github-actions
      - name: Default check
        run: npx knip --cache --reporter github-actions
```

Swap `package-lock.json` for `pnpm-lock.yaml`, `yarn.lock`, or `bun.lock` as appropriate. Caching cuts clean runs by roughly 10 to 40%, or enable `{ "cache": true }` in `knip.json`.

## Gradual adoption (`--max-issues`)

On repositories with pre-existing dead code, ratchet down over several PRs instead of shipping an unenforced `--no-exit-code` job:

```bash
npx knip --max-issues 500   # baseline
npx knip --max-issues 300   # after first cleanup
npx knip --max-issues 0     # clean
```

Any PR that introduces new dead code fails immediately while cleanup proceeds incrementally.

## Reporters

| Reporter | Best for |
| --- | --- |
| `symbols` (default) | Local terminal output |
| `compact` | Greppable CI logs (combine with `--max-show-issues 20`) |
| `github-actions` | Inline GitHub PR file annotations |
| `json` | Dashboards, bots, scripts (`--reporter json > knip-report.json`) |
| `markdown` | PR comments and issues |
| `codeowners` | Routing findings by `CODEOWNERS` |

## Auto-fix safety and `package.json` scripts

Never run `npx knip --fix` automatically on push in CI without human review because it mutates files. Either run it locally via a script or have a scheduled workflow open a cleanup PR. Always pass `--format` (auto-detects Prettier, Biome, dprint, `deno fmt`, or override with `KNIP_FORMATTER=biome`) so deleted exports do not leave stray commas:

```json
{
  "scripts": {
    "knip": "knip",
    "knip:production": "knip --strict",
    "knip:fix": "knip --fix --allow-remove-files --format"
  }
}
```

For interactive local cleanup sprints, run `npx knip --watch` (optionally scoped with `--include exports`).
