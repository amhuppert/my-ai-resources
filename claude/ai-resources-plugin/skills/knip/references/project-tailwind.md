# Tailwind CSS Projects

Covers Tailwind v3 and v4. The two versions need different configurations because v4 moved away from JS configs to CSS-first config.

## Auto-detection

Knip's Tailwind plugin activates when **any** of these packages is in `package.json`:

- `tailwindcss`
- `@tailwindcss/vite`
- `@tailwindcss/postcss`
- `@tailwindcss/cli`

When activated, the plugin auto-detects:

- `tailwind.config.{js,cjs,mjs,ts,cts,mts}`

The PostCSS plugin (also typically auto-detects in a Tailwind project) covers:

- `postcss.config.{ts,js,cjs,mjs,mts,cts}`, `.postcssrc`, `.postcssrc.{json,ts,js,cjs,mjs,yaml,yml}`

## Tailwind v3 (JS/TS config)

Standard v3 setups with a `tailwind.config.ts` and `postcss.config.js`: the auto-detection covers everything you need. No knip config required.

If knip flags `autoprefixer` or `postcss` as unused: they're typically referenced by string in your PostCSS config. Verify with `--debug` whether the PostCSS plugin detected them; if not, `ignoreDependencies`:

```json
{ "ignoreDependencies": ["autoprefixer"] }
```

But first try declaring them explicitly in `postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Knip parses the config-as-JS and should pick them up.

## Tailwind v4 (CSS-first config)

Tailwind v4 inverts the config model: there's no `tailwind.config.ts`. Configuration lives in your CSS file via `@import "tailwindcss"`, `@plugin "..."`, and `@theme { ... }` directives.

**If you're on knip ≥ 5.67.0**, this is handled natively. No extra config required.

**If you're on knip < 5.67.0**, knip won't see Tailwind v4 plugins as used because it doesn't parse CSS. Two fixes:

### Option A — upgrade knip

Best option. `npm install -D knip@latest`.

### Option B — custom CSS compiler

If you can't upgrade, teach knip to read CSS `@import` and `@plugin` directives as if they were JS imports:

```ts
// knip.config.ts
import type { KnipConfig } from "knip";

export default {
  compilers: {
    css: (text: string) =>
      [...text.matchAll(/@(?:import|plugin)\s+["']([^"']+)["']/g)]
        .map(([_, dep]) => `import "${dep}";`)
        .join("\n"),
  },
} satisfies KnipConfig;
```

You also need to include CSS files in `project` if you've customized that field:

```ts
project: "**/*.{ts,tsx,css}"
```

By default knip's `project` glob doesn't include `.css`, so the compiler never fires without this.

## Plugins referenced from CSS in v4

Tailwind v4 plugins like `@tailwindcss/typography`, `@tailwindcss/forms`, etc., are referenced from CSS:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";
```

With knip ≥ 5.67.0 these are detected as used. With the CSS-compiler workaround above, they're transformed into `import "@tailwindcss/typography";` and detected as used. Either way: no `ignoreDependencies` needed.

## Common false positives

| Reported unused | Why it's likely not unused | Fix |
|---|---|---|
| `autoprefixer` | Referenced by string in postcss config | Use object form in postcss config; if still flagged, `ignoreDependencies` |
| `@tailwindcss/postcss` | Referenced by string in postcss config | Same as above |
| `@tailwindcss/typography` (v4) | Referenced from CSS `@plugin` | Upgrade to knip ≥ 5.67.0, or add the CSS compiler |
| `tailwind-merge` / `clsx` / `tailwind-variants` | Genuinely used by `className=` builders in JS code | Should be detected — verify it's imported, not strung |
| `prettier-plugin-tailwindcss` | Loaded by Prettier via config | `ignoreDependencies` |

## Quick checklist for a Tailwind project

1. `npx knip --debug` — confirm the Tailwind and PostCSS plugins are enabled and their config files are detected.
2. If Tailwind v4 and any `@plugin "..."` package is reported unused: upgrade knip or add the CSS compiler workaround.
3. If a `prettier-plugin-tailwindcss` (or similar Prettier plugin) is flagged: `ignoreDependencies`.
4. If using Next.js + Tailwind, also load [`project-nextjs.md`](project-nextjs.md).
