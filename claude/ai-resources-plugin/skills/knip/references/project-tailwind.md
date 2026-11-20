# Knip with Tailwind CSS (v3 and v4)

## Auto-detection

Knip enables the Tailwind plugin when any of `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/postcss`, or `@tailwindcss/cli` appears in `package.json`. It auto-detects `tailwind.config.{js,cjs,mjs,ts,cts,mts}`, and the PostCSS plugin covers `postcss.config.*` and `.postcssrc*`.

## Tailwind v3 (JS/TS config)

Standard v3 projects work out of the box. If `autoprefixer` or `@tailwindcss/postcss` is flagged unused, first check whether `postcss.config.js` declares plugins as object keys (`plugins: { tailwindcss: {}, autoprefixer: {} }`), which knip parses cleanly. If it is still flagged after checking `npx knip --debug`, add it to `ignoreDependencies`.

## Tailwind v4 (CSS-first config)

Tailwind v4 drops `tailwind.config.ts` and loads plugins in CSS (`@import "tailwindcss";`, `@plugin "@tailwindcss/typography";`).

- **knip >= 5.67.0:** handled natively with no extra config.
- **knip < 5.67.0:** upgrade (`npm install -D knip@latest`), or add a custom CSS compiler in `knip.config.ts` and include `.css` in `project` if customized:

```ts
import type { KnipConfig } from "knip";

export default {
  project: "**/*.{ts,tsx,css}",
  compilers: {
    css: (text: string) =>
      [...text.matchAll(/@(?:import|plugin)\s+["']([^"']+)["']/g)]
        .map(([, dep]) => `import "${dep}";`)
        .join("\n"),
  },
} satisfies KnipConfig;
```

## Common false positives

| Flagged package | Cause | Fix |
| --- | --- | --- |
| `autoprefixer`, `@tailwindcss/postcss` | String reference in PostCSS config | Prefer object-key syntax in PostCSS config; otherwise `ignoreDependencies` |
| `@tailwindcss/typography`, `@tailwindcss/forms` (v4) | Referenced via CSS `@plugin` | Upgrade to knip >= 5.67.0 or add the CSS compiler above |
| `prettier-plugin-tailwindcss` | Loaded by Prettier config string | Add to `ignoreDependencies` |
| `tailwind-merge`, `clsx`, `tailwind-variants` | Normally statically imported | Verify with grep; usually a real finding if flagged |
