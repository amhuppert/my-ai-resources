# Scenario: bundle bloat

Load when initial JS payload is oversized, per-route bundle size regresses, or a JS size budget breaks.

## Capture and insight sequence

Capture a cache-cold reload trace (`trace.json.gz`) plus `lighthouse_audit` under pinned emulation, then run these insights:

1. `DuplicatedJavaScript`: flags packages bundled multiple times (e.g., `lodash` + `lodash-es`, mismatched versions). Usually the highest-payoff win.
2. `LegacyJavaScript`: flags polyfills and downlevel transpilation for unsupported browsers (usually an overly wide `browserslist`).
3. `ModernHTTP`: flags HTTP/1.1 serialization where HTTP/2 or HTTP/3 would parallelize (infrastructure finding).
4. `ThirdParties`: identifies oversized third-party scripts that can be deferred or removed.

## Network and build attribution

1. Sort loaded scripts by transfer size: `list_network_requests` with `resourceType=Script, sortBy=transferSize, desc`.
2. For the top 5 to 10 scripts, resolve sourcemaps in `dist/` or `.next/static/chunks/` to identify the npm package and routes loading it. Flag heavy dependencies shipped to routes that do not use them (such as a chart library on marketing pages or a rich-text editor on `/login`).
3. Check build stdout directly: `next build` or `vite build` output is authoritative for compressed per-route First Load JS (visual analyzers often misreport gzipped cost).

Useful deep-dive tools when build output is not granular enough:

- `@next/bundle-analyzer` (`ANALYZE=true next build`) or `rollup-plugin-visualizer` for treemaps
- `source-map-explorer` for exact per-file byte attribution from sourcemaps
- `Statoscope` (`npx @statoscope/cli validate`) for duplicate-package maps and CI size budgets

## Common root causes and fixes

| Finding | Fix |
| --- | --- |
| Both `lodash` and `lodash-es` bundled | Alias to one (`resolve.alias` in webpack/Vite); prefer `lodash-es` |
| `moment` bundled | Switch to `date-fns` (tree-shaken) or `dayjs` |
| Full icon pack bundled | Import individual icons (`lucide-react/icons/CheckIcon`) or inline SVGs for a few icons |
| Legacy polyfills | Narrow `browserslist` to `last 2 versions, not dead` |
| Heavy chart/editor on unrelated routes | Route-split or lazy-load (`next/dynamic` with `ssr: false` or `React.lazy`) |
| Wildcard UI library imports (`import * as MUI`) | Switch to direct named/path imports and verify tree-shaking |
| Synchronous telemetry (Sentry, PostHog) | Defer initialization until after `load` |

## Validation report

Include before/after build stdout showing per-route First Load JS kB, before/after `DuplicatedJavaScript`/`LegacyJavaScript` outputs, before/after LCP (since JS downloads compete with LCP), the single change applied, and confirmation that no other route's bundle grew.
