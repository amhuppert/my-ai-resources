# Scenario: LCP Regression

Largest Contentful Paint investigation. Load this reference when the symptom is slow first paint, LCP > 2.5s at p75 on Slow 4G + 4× CPU, or a regression in `LCPBreakdown`.

## The LCP Subpart Model

LCP is the sum of four subparts. Your hypothesis must name which subpart dominates. Fixing a 100 ms render-delay when TTFB is 1800 ms is the wrong fight.

| Subpart | What it covers | Typical fixes |
|---------|----------------|---------------|
| **TTFB** | Server response time | Caching, edge deploy, faster backend, skip waterfall |
| **Resource load delay** | Time from TTFB until LCP resource starts loading | Preload, fetchpriority=high, remove render-blocking earlier, move out of lazy-loaded chunk |
| **Resource load duration** | Actual download time | Compress, resize, modern formats (AVIF/WebP), CDN, fewer render-blocking requests competing |
| **Element render delay** | Time from resource loaded until painted | Remove blocking JS, hydration cost, Suspense fallback blocking paint |

## Insight Sequence

Call these in order. Stop when you have a clear dominant subpart.

1. `LCPBreakdown` — returns the four-subpart split. This is the scoreboard.
2. `LCPDiscovery` — how the browser found (or failed to find) the LCP resource. Catches `loading="lazy"` on above-the-fold images, late-discovered hero images, CSS background-images that should be `<img>`.
3. `DocumentLatency` — is TTFB the dominant subpart? Redirect chains, slow origins, non-compressible HTML.
4. `RenderBlocking` — stylesheets and scripts blocking the critical path.

Escalate to `NetworkDependencyTree` and `LongCriticalNetworkTree` only if steps 1–4 don't produce a clear dominant subpart.

## Canonical Prompt

> Record a reload trace of `<URL>` with Slow 4G + 4× CPU, cache-cold. Save to `trace.json.gz`. Call `performance_analyze_insight` for `LCPBreakdown`, then for `LCPDiscovery`, `DocumentLatency`, and `RenderBlocking`. Use `evaluate_script` only to identify the LCP element (tag, src, timing). Compute the dominant subpart. Propose the single smallest change, implement it, re-trace, and show before/after LCP with subpart deltas. Stop if LCP improves <10% or any other Core Web Vital regresses.

## Known Gotchas

- **`loading="lazy"` on a hero image** is the #1 cause of LCP regressions on content sites. `LCPDiscovery` catches this directly. Documented case: Substack's LCP dropped from 1383 ms to 628 ms after removing `loading="lazy"` from the hero (DebugBear walkthrough, Oct 2025).
- **CSS background-image hero** cannot be preloaded without `<link rel="preload" as="image" imagesrcset="...">` gymnastics. If the LCP element is a background-image, recommend switching to `<img fetchpriority="high">`.
- **Font-blocked LCP text.** If the LCP element is text, check `FontDisplay` — `font-display: swap` or `optional` often fixes text-LCP regressions.
- **Streaming SSR / RSC.** The LCP element may live in a later Suspense chunk. Correlate `list_network_requests` RSC chunk arrival (content-type `text/x-component`) to LCP paint timestamp. `querySelector` at DOMContentLoaded lies. See `nextjs.md` for the RSC flow.
- **Priority Hints.** Modern Chrome respects `fetchpriority="high"` on `<img>` and `<link rel="preload">`. Worth a single-line fix before heavier restructuring.

## Validation Template

The PR or report must include:

- Before trace path and after trace path (both `.json.gz`)
- `LCPBreakdown` output before and after, with subpart deltas
- Confirmation that INP, CLS, and bundle size did not regress (cite insights or `next build` output)
- The single-variable change
- The subpart that was dominant and is now no longer dominant (or dominant by less)
