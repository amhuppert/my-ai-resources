# Scenario: Bundle Bloat

JavaScript payload investigation. Load this reference when the symptom is a slow first load with "too much JS", a regression in per-route bundle size, or a budget breach on initial JS.

## Insight Sequence

1. `DuplicatedJavaScript` — same package bundled multiple times (pre-bundled deps, multiple versions, lodash + lodash-es, etc.). Highest-leverage wins usually live here.
2. `LegacyJavaScript` — polyfills / transpilation for browsers you don't actually support. `browserslist` too wide is the typical cause.
3. `ModernHTTP` — HTTP/1.1 waterfall when HTTP/2 or HTTP/3 would parallelize. Infra-level, but flag it.
4. `ThirdParties` — which third-party scripts are blowing the budget and whether they're deferrable.

## Network Filtering Workflow

After the insights, sort network requests by transfer size:

```
list_network_requests → resourceType=Script, sortBy=transferSize, desc
```

For the top 5–10 scripts:

- Source-map via the project's `dist/` or `.next/static/chunks/` — identify which npm package and which route.
- Flag any shipped to routes that don't need them (the classic: chart library on the marketing page, rich-text editor on /login).
- Check for duplicate vendor chunks (webpack) or duplicated module IDs (Turbopack/Rspack).

## Build-Level Tools

Do not skip the build output. `next build` (or `vite build`) stdout is authoritative for per-route First Load JS — bundle analyzer tools often lie about gzipped cost.

- `webpack-bundle-analyzer` / `@next/bundle-analyzer` (`ANALYZE=true next build`) — tree map, good for visual "where is the weight"
- `rollup-plugin-visualizer` / `vite-bundle-visualizer` — same for Vite/Rollup
- `source-map-explorer` — precise per-file attribution from sourcemaps
- `Statoscope` — duplicate packages, chunk maps, per-entry download-time budgets; has a CI validator (`npx @statoscope/cli validate`)

## Canonical Prompt

> Record a reload trace + `lighthouse_audit` on `<URL>` under Slow 4G + 4× CPU. Save trace to `trace.json.gz`. Call `performance_analyze_insight` for `DuplicatedJavaScript`, `LegacyJavaScript`, `ModernHTTP`, and `ThirdParties`. List network requests filtered by `resourceType=Script`, sorted by `transferSize` desc. For the top 5 scripts: source-map to files, identify the npm package, identify which route(s) load them, flag any that ship to routes that don't need them. Output a prioritized code-split / tree-shake / route-split plan with expected kB savings per item and the build-tool change required for each. No code changes yet.

## Common Fixes by Root Cause

| Finding | Fix |
|---------|-----|
| Duplicated lodash + lodash-es | Enforce one via `resolve.alias` (webpack) / `alias` (Vite); most apps only need `lodash-es` |
| Moment.js | Replace with `date-fns` or `dayjs`; or use `date-fns` tree-shaking if partial |
| Large icon library fully bundled | Per-icon imports (`lucide-react/icons/CheckIcon`), or switch to inline SVG for the 5–10 icons you actually use |
| Polyfills for IE11 | Narrow `browserslist` to `last 2 versions, not dead` |
| Entire chart lib on marketing pages | Dynamic import (`next/dynamic` with `ssr: false` or `React.lazy`) |
| Rich-text editor on public routes | Route-level code split; load only on editor routes |
| MUI / Chakra full import | Verify tree-shaking; check for wildcard `import * as MUI` |
| Sentry/PostHog on every page synchronously | Lazy-load after `load` event; or defer telemetry init |

## Validation Template

- Before/after `next build` (or equivalent) output showing per-route First Load JS kB
- Before/after `DuplicatedJavaScript` and `LegacyJavaScript` insights — items should drop
- Before/after LCP (since JS download competes with LCP resource)
- The specific change (one chunk moved, one dep swapped, one dynamic import added)
- Confirmation that no route's bundle went *up*
