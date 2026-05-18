# Playwright Integration — Render Counting in Tests

There are three ways to wire react-scan into a Playwright test. Pick by where the instrumentation should live.

| Pattern | When to use |
|---|---|
| **App is already instrumented** | The Playwright target is a dev server that already loads react-scan (script tag, Vite plugin, etc.). Test just listens. |
| **Inject `auto.global.js` via `addInitScript`** | Target app does **not** include react-scan, and you do not want to modify it. Suitable for staging/preview deployments. |
| **Lite mode injected via `addInitScript`** | Programmatic data extraction with minimal overhead. Best for CI render-budget assertions. |

In all three, **disable StrictMode** in the app build under test if you intend to assert exact render counts. StrictMode double-invokes function bodies in development, doubling every "mount" render and adding noise to "update" renders that happen during effects. If StrictMode must stay, assert relative counts (`after - before > 0`) rather than exact values.

## Pattern A — App Already Instrumented

This is the model react-scan's own E2E suite uses. The fixture page loads `scan({ ... })` at module top level; the test injects an `onRender` interceptor that increments a counter.

```ts
// helpers.ts
import { type Page } from "@playwright/test";

export async function setupRenderCounter(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      typeof (window as any).__REACT_SCAN__?.ReactScanInternals !== "undefined",
    { timeout: 15_000 },
  );
  await page.evaluate(() => {
    (window as any).__E2E_RENDER_COUNT__ = 0;
    const internals = (window as any).__REACT_SCAN__.ReactScanInternals;
    const prev = internals.options.value;
    const prevOnRender = prev.onRender;
    internals.options.value = {
      ...prev,
      onRender: (...args: unknown[]) => {
        (window as any).__E2E_RENDER_COUNT__++;
        if (prevOnRender) prevOnRender(...args);
      },
    };
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    (window as any).__E2E_RENDER_COUNT__ = 0;
  });
}

export const getRenderCount = (page: Page) =>
  page.evaluate(() => (window as any).__E2E_RENDER_COUNT__ ?? 0);
```

Then in the test:

```ts
test("typing in search does not over-render results", async ({ page }) => {
  await page.goto("/");
  await setupRenderCounter(page);

  await page.fill('[data-testid="search"]', "a");
  await page.waitForTimeout(300);
  const c1 = await getRenderCount(page);

  await page.fill('[data-testid="search"]', "ab");
  await page.waitForTimeout(300);
  const c2 = await getRenderCount(page);

  // Each keystroke must produce a bounded number of renders (tune to fixture).
  expect(c2 - c1).toBeLessThan(10);
});
```

Notes:

- The `await page.waitForTimeout(500)` after setup lets initial mount renders flush before zeroing the counter — without it, `c1` includes mount work.
- `internals.options.value = { ...prev, onRender: ... }` is the correct way to mutate options; the underlying signal is a Preact signal and replacing the value triggers reactive update without re-installing instrumentation.
- This pattern counts **callback invocations**, not individual renders within a single commit. To count individual renders, increment by `renders.length` inside the handler.

## Pattern B — Inject `auto.global.js` via `addInitScript`

When the target app does not include react-scan, use `page.addInitScript` to inject before the page's own scripts execute. Pair the bundle with the polling helper at `scripts/inject-react-scan.js` and **await `window.__REACT_SCAN_READY__`** after navigating.

```ts
import { test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Cache the bundle on disk to avoid CDN dependency in CI.
const reactScanBundle = readFileSync(
  resolve(__dirname, "../fixtures/react-scan-auto.global.js"),
  "utf8",
);
// Copy of scripts/inject-react-scan.js from this skill, vendored into fixtures/.
const injectHelper = readFileSync(
  resolve(__dirname, "../fixtures/inject-react-scan.js"),
  "utf8",
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(`${reactScanBundle}\n${injectHelper}`);
});

test("example", async ({ page }) => {
  await page.goto("/");

  const ready = await page.evaluate(() => (window as any).__REACT_SCAN_READY__);
  if (!ready) throw new Error("react-scan failed to attach within 30s");

  // Now safe to use the helper's counters.
  await page.evaluate(() => (window as any).__REACT_SCAN_RESET__());
  // ... drive interactions ...
  const snapshot = await page.evaluate(() => (window as any).__REACT_SCAN_SNAPSHOT__());
});
```

**Why the `__REACT_SCAN_READY__` await is non-negotiable.** `auto.global.js` registers `window.__REACT_SCAN__` only after a React renderer announces itself on `__REACT_DEVTOOLS_GLOBAL_HOOK__`. That registration happens once the page's bundle loads React — which is **after** the `addInitScript` IIFE completes. A naive `if (window.__REACT_SCAN__) { ... }` inside the same `addInitScript` bails silently and your counters never install. The helper polls every 50 ms (capped at 30 s) and resolves `__REACT_SCAN_READY__` to `true` once counters are wired, or `false` on timeout with a `console.warn` explaining why (most often: React production build without `dangerouslyForceRunInProduction`).

Fetch and pin `auto.global.js` once (e.g., `curl -o fixtures/react-scan-auto.global.js https://unpkg.com/react-scan/dist/auto.global.js`) so CI does not depend on `unpkg.com` reachability.

## Pattern C — Lite Mode for Structured Data Extraction

Lite mode produces typed `LiteEvent` records (see `api-surface.md`). For data-driven analysis (which is what most agent workflows want), this is the preferred mode.

```ts
import { test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const liteBundle = readFileSync(
  resolve(__dirname, "../fixtures/react-scan-lite.global.js"),
  "utf8",
);

test("collect render events during list scroll", async ({ page }) => {
  await page.addInitScript(`
    ${liteBundle}
    window.__events__ = [];
    window.__instrumentReactScan__ = () => {
      const { instrument } = window.ReactScanLite;
      const handle = instrument({
        onEvent: (e) => { window.__events__.push(e); },
        recordChangeDescriptions: true,
        includeFiberSource: true,
        includeFiberIdentity: true,
        maxFibersPerCommit: 2000,
      });
      window.__reactScanHandle__ = handle;
    };
  `);

  await page.goto("/");
  // Instrument AFTER React mounts so we don't catch boot noise.
  await page.evaluate(() => (window as any).__instrumentReactScan__());

  await page.evaluate(() => ((window as any).__events__ = []));
  await page.locator('[data-testid="list"]').evaluate((el) =>
    el.scrollBy({ top: 500, behavior: "instant" }),
  );
  await page.waitForTimeout(500);

  const events = await page.evaluate(() => (window as any).__events__);
  // Persist to disk; do not pass the whole array into model context.
  require("node:fs").writeFileSync(
    "test-results/render-events.json",
    JSON.stringify(events),
  );
});
```

The lite bundle is published as `react-scan/dist/lite.global.js` (consult the package's `dist/` listing; the exact filename depends on the version). For a CI-pinned setup, prefer importing from `react-scan/lite` in a small wrapper bundled with the test.

Author the source:

```ts
// fixtures/react-scan-lite-wrapper.src.ts
import { instrument } from "react-scan/lite";
(globalThis as any).ReactScanLite = { instrument };
```

Bundle it once into a self-contained global script:

```bash
npx esbuild fixtures/react-scan-lite-wrapper.src.ts \
  --bundle \
  --format=iife \
  --platform=browser \
  --outfile=fixtures/react-scan-lite-wrapper.js
```

The output `react-scan-lite-wrapper.js` is what `scripts/playwright-render-collector.ts` reads at `LITE_WRAPPER_PATH` and injects via `page.addInitScript`. Re-run the esbuild step whenever the `react-scan` package version changes.

## Render-Count Aggregation per Component

To answer "which components rendered most during this interaction," aggregate over `Store.reportData` (full bundle) or the lite event stream.

### Full bundle: `Store.reportData`

```ts
const componentCounts = await page.evaluate(() => {
  const store = (window as any).__REACT_SCAN__.ReactScanInternals.Store;
  const out: Record<string, { count: number; selfTime: number; totalTime: number }> = {};
  for (const [fiberId, data] of store.reportData) {
    const name = data.displayName ?? "Anonymous";
    const prev = out[name] ?? { count: 0, selfTime: 0, totalTime: 0 };
    out[name] = {
      count: prev.count + data.renderCount,
      selfTime: prev.selfTime + data.selfTime,
      totalTime: prev.totalTime + data.totalTime,
    };
  }
  return out;
});
```

### Lite mode: from event stream

```ts
const componentCounts: Record<string, number> = {};
for (const e of events) {
  if (e.kind !== "component-render-start") continue;
  const name = e.componentName ?? "Anonymous";
  componentCounts[name] = (componentCounts[name] ?? 0) + 1;
}
```

## Asserting Render Budgets in CI

A render budget is a per-component upper bound on renders triggered by a defined interaction. Example invariant: "typing 5 characters into the search box renders `<SearchResults>` at most 6 times."

```ts
const budget = { SearchResults: 6, Result: 30, AppShell: 0 };

const counts = await collectComponentCounts(page);

for (const [name, max] of Object.entries(budget)) {
  expect(counts[name]?.count ?? 0, `${name} budget`).toBeLessThanOrEqual(max);
}
```

This catches regressions where a refactor introduces an unstable prop and silently re-renders a child component 50× per keystroke.

## When to Disable StrictMode for Measurement

If the React app is wrapped in `<React.StrictMode>` (default in CRA/Next/Vite templates), every functional component renders **twice** in development. This is fine for the visual overlay (you'll see double-counts, which is consistent and observable), but breaks numeric assertions.

Two options:

1. **Wrap test target only.** Have a `?strict=0` query param in the app that disables StrictMode; Playwright navigates to `/?strict=0` for measurement runs.
2. **Halve the counts.** Mathematically equivalent but easy to forget when adding a new assertion later.

Option 1 is more robust for long-lived budgets. Option 2 is fine for one-off investigations.

## Playwright Tracing + react-scan

Playwright `context.tracing.start({ snapshots: true, screenshots: false })` captures DOM snapshots and network. It does **not** capture react-scan output. Combine the two for full coverage:

- `tracing.start` → run interaction → `tracing.stop`
- In parallel, `subscribe()` to lite events
- Stop both at the same boundary
- Save the Playwright trace zip + the lite events JSON in the same folder
- Open the trace at `trace.playwright.dev` and cross-reference with the lite events by timestamp

## Anti-Patterns

- **Asserting absolute render counts without disabling StrictMode.** Flaky.
- **Pasting full lite event arrays into prompts.** A few hundred events of a 1000-fiber tree is megabytes of JSON. Aggregate first, then prompt.
- **Counting renders during `page.goto`.** The boot phase emits hundreds of mount renders. Always zero the counter after `waitForTimeout(500)` post-navigation.
- **Using `showToolbar: true` in tests.** The toolbar mounts a Preact app inside a Shadow DOM, which itself does work the instrumentation observes. Use `react-scan/lite` or set `showToolbar: false`.
- **Skipping `crossOrigin="anonymous"` on the script tag.** Without it, CSP `script-src` rules that allow `unpkg.com` may still block the script.
