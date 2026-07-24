# Storybook Projects

Storybook auto-detection is good, but the framework's plugin/addon system uses runtime string references that knip sometimes misses.

## Auto-detection

The Storybook plugin activates when any `@storybook/*` package or `@nrwl/storybook` is in `package.json`.

When activated, it auto-detects:

- **Config files:** `.storybook/{main,test-runner}.{js,ts,mts}` and `rnstorybook/{main,test-runner}.{js,ts,mts}` (React Native Storybook)
- **Entries:** `.storybook/{manager,preview,index,vitest.setup}.{js,jsx,ts,tsx}` and same under `rnstorybook/`
- **All `*.stories.*` files and all `*.mdx` files** across the project

So in a standard setup you typically don't need any custom config for Storybook.

## Production mode auto-excludes stories

The most important Storybook pattern: **stories are devDependencies, not shipping code.**

```bash
npx knip --production
```

…automatically excludes stories, `.storybook/`, and the `@storybook/*` packages from analysis. Don't manually `ignore` stories — use production mode. Same applies to story-utility files: name them with a Storybook suffix or co-locate them so they're considered part of the story graph.

The canonical pattern is to run two checks in CI:

- `npx knip` — default, covers stories and `@storybook/*` deps.
- `npx knip --production` — covers shipping code only, free of Storybook noise.

See [`ci-integration.md`](ci-integration.md).

## Known false positive: `@storybook/builder-vite` / `@storybook/builder-webpack5`

When `.storybook/main.ts` references the builder by string:

```ts
// .storybook/main.ts
const config = {
  framework: '@storybook/react-vite',
  core: { builder: '@storybook/builder-vite' },
};
```

…knip's plugin sometimes doesn't trace the string reference and reports the builder as an unused devDependency. This is a [known issue](https://github.com/webpro-nl/knip/issues/602).

Fix:

```json
{ "ignoreDependencies": ["@storybook/builder-vite"] }
```

Verify your knip version against the issue tracker — the plugin may have been improved since you last looked.

## Addons referenced by string

`addons: []` in `.storybook/main.ts` lists addons by string:

```ts
addons: [
  '@storybook/addon-essentials',
  '@storybook/addon-interactions',
  '@storybook/addon-a11y',
]
```

Knip's plugin generally parses these correctly. If a specific addon is reported unused:

1. Verify with `npx knip --trace-dependency @storybook/addon-essentials`.
2. If knip cannot see the string, add to `ignoreDependencies`.
3. File an issue with the knip project so the plugin can be improved.

## Addon presets / custom presets

If your team maintains a custom Storybook preset package (`storybook-preset-acme`), knip's plugin doesn't know about it. Two fixes:

- Add the preset to `ignoreDependencies`.
- Or, if it's loaded from your `addons: []` array, knip should already detect it — see the section above.

## Storybook 10 migration note

Storybook 10 reorganized addons (some `@storybook/addon-*` packages moved out of `addon-essentials`). After upgrading:

1. Re-run `npx knip`.
2. Expect a few packages that are now bundled into core to show as removable, and a few that were bundled into `addon-essentials` to need explicit addition.
3. Don't blindly remove anything that *was* in `addons: []` — check the Storybook 10 migration guide for what moved.

## `*.stories.*` files reported as unused

If a story file shows up in "unused files":

1. Check the file's name — must match `*.stories.{js,jsx,ts,tsx,mdx}`. Variants like `MyComponent.story.tsx` (singular) won't be auto-detected.
2. If you use a custom naming convention, configure the plugin explicitly:

   ```json
   {
     "storybook": {
       "entry": [".storybook/{main,preview,manager}.ts", "**/*.story.tsx"]
     }
   }
   ```

   Note: this **overrides** the plugin defaults (see [`config-patterns.md`](config-patterns.md) §3) — list the full set of patterns you want.

## Quick checklist for a Storybook project

1. `npx knip --debug` — confirm the Storybook plugin is enabled and stories are detected as entries.
2. Run `--production` separately; stories should not appear in either issues or hints there.
3. If `@storybook/builder-*` reports unused, add to `ignoreDependencies` (known plugin gap).
4. For custom story file conventions (e.g., `*.story.tsx` singular), set `storybook.entry` explicitly — and remember overrides don't merge.
5. If the project also uses Vitest for the Storybook test runner, ensure the Vitest plugin is enabled too.
