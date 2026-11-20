# Knip with Storybook

## Auto-detection and production mode

Any `@storybook/*` or `@nrwl/storybook` dependency enables the Storybook plugin, which auto-detects:

- Configs: `.storybook/{main,test-runner}.{js,ts,mts}` (and `rnstorybook/` for React Native)
- Entries: `.storybook/{manager,preview,index,vitest.setup}.{js,jsx,ts,tsx}` (and `rnstorybook/`)
- Story files: `*.stories.*` and `*.mdx`

Run `npx knip --production` to exclude stories, `.storybook/`, and `@storybook/*` devDependencies from shipping-code checks instead of putting stories in `ignore`. Pair `npx knip` with `npx knip --production` in CI (see [`ci-integration.md`](ci-integration.md)).

## Known false positives

- **`@storybook/builder-vite` / `@storybook/builder-webpack5`:** knip can miss `core.builder` string references in `.storybook/main.ts` ([knip#602](https://github.com/webpro-nl/knip/issues/602)). Confirm on your knip version; if still flagged, add to `ignoreDependencies`.
- **String-referenced addons or custom presets:** knip parses most `addons: [...]` arrays, but may miss custom presets (`storybook-preset-*`). Confirm with `npx knip --trace-dependency <pkg>`, then add to `ignoreDependencies` if genuinely used.
- **Custom story filenames (for example `*.story.tsx` singular):** default globs only match `*.stories.*`. If you override `storybook.entry`, list the full set (including `.storybook/{main,preview,manager}.ts`) because plugin overrides replace defaults rather than merging:
  ```json
  {
    "storybook": {
      "entry": [".storybook/{main,preview,manager}.ts", "**/*.story.tsx"]
    }
  }
  ```

## Storybook 10 upgrades

Storybook 10 moved several addons into core and out of `addon-essentials`. After upgrading, re-run `npx knip` and cross-check any newly flagged `@storybook/addon-*` packages against the Storybook 10 migration guide before deleting them. If using Vitest as the Storybook test runner, verify the Vitest plugin is also enabled in `npx knip --debug`.
