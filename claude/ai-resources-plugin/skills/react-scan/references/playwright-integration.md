# Playwright integration for `react-scan`

Choose how instrumentation attaches based on whether the test target already loads `react-scan`:

| Pattern | When to use |
| --- | --- |
| A: App already instrumented | Local dev server already runs `scan()`; test attaches an `onRender` counter |
| B: Inject `auto.global.js` via `addInitScript` | App has no `react-scan` and should stay untouched (e.g. staging/preview) |
| C: Inject `react-scan/lite` via `addInitScript` | Structured `LiteEvent` extraction and low-overhead CI render budgets (preferred for agents) |

Disable `React.StrictMode` when asserting exact render counts (for example via a `?strict=0` query param in the test harness); StrictMode doubles dev mount renders. Always wait ~500 ms after `page.goto()` and zero counters before driving the interaction so boot mounts do not pollute counts. Use a clean Chromium profile without the React DevTools extension and disable the toolbar (`showToolbar: false` or lite mode).

## Pattern A: app already instrumented

```ts
import { type Page } from "@playwright/test";

export async function setupRenderCounter(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as any).__REACT_SCAN__?.ReactScanInternals !== "undefined",
    { timeout: 15_000 },
  );
  await page.evaluate(() => {
    (window as any).__E2E_RENDER_COUNT__ = 0;
    const internals = (window as any).__REACT_SCAN__.ReactScanInternals;
    const prev = internals.options.value;
    const prevOnRender = prev.onRender;
    internals.options.value = {
      ...prev,
      onRender: (fiber: unknown, renders: unknown[]) => {
        (window as any).__E2E_RENDER_COUNT__ += renders.length;
        if (prevOnRender) prevOnRender(fiber, renders);
      },
    };
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    (window as any).__E2E_RENDER_COUNT__ = 0;
  });
}
```

Reassigning `internals.options.value` updates the underlying Preact signal reactively without re-installing instrumentation. Increment by `renders.length` to count individual renders rather than batched commits.

## Pattern B: inject `auto.global.js` via `addInitScript`

`auto.global.js` attaches `window.__REACT_SCAN__` lazily only **after** React loads and calls `__REACT_DEVTOOLS_GLOBAL_HOOK__.inject(renderer)`, which happens after `addInitScript` returns. Reading `window.__REACT_SCAN__` synchronously inside `addInitScript` silently fails.

Cache `auto.global.js` locally (`curl -o fixtures/react-scan-auto.global.js https://unpkg.com/react-scan/dist/auto.global.js`), pair it with `scripts/inject-react-scan.js` (which polls every 50 ms up to 30 s), and await `window.__REACT_SCAN_READY__` after `page.goto()`:

```ts
test.beforeEach(async ({ page }) => {
  await page.addInitScript(`${reactScanBundle}\n${injectHelper}`);
});

test("count renders", async ({ page }) => {
  await page.goto("/");
  const ready = await page.evaluate(() => (window as any).__REACT_SCAN_READY__);
  if (!ready) throw new Error("react-scan failed to attach within 30s");

  await page.evaluate(() => (window as any).__REACT_SCAN_RESET__());
  // drive interaction...
  const snapshot = await page.evaluate(() => (window as any).__REACT_SCAN_SNAPSHOT__());
});
```

## Pattern C: bundle and inject `react-scan/lite` (preferred)

Build a tiny self-contained browser wrapper once (rebuild whenever upgrading `react-scan`):

```ts
// fixtures/react-scan-lite-wrapper.src.ts
import { instrument } from "react-scan/lite";
(globalThis as any).ReactScanLite = { instrument };
```

```bash
npx esbuild fixtures/react-scan-lite-wrapper.src.ts \
  --bundle --format=iife --platform=browser \
  --outfile=fixtures/react-scan-lite-wrapper.js
```

Point `scripts/playwright-render-collector.ts` at that bundle via `LITE_WRAPPER_PATH`, or inject it in a test:

```ts
await page.addInitScript(`
  ${liteBundle}
  window.__events__ = [];
  window.__instrumentReactScan__ = () => {
    window.__reactScanHandle__ = window.ReactScanLite.instrument({
      onEvent: (e) => window.__events__.push(e),
      recordChangeDescriptions: true,
      includeFiberSource: true,
      includeFiberIdentity: true,
      maxFibersPerCommit: 2000,
    });
  };
`);

await page.goto("/");
await page.evaluate(() => (window as any).__instrumentReactScan__());
await page.evaluate(() => ((window as any).__events__ = []));
// drive interaction, wait ~500ms, then write window.__events__ to disk
```

## Aggregating counts and enforcing CI budgets

From lite events:

```ts
const counts: Record<string, number> = {};
for (const e of events) {
  if (e.kind !== "component-render-start") continue;
  const name = e.componentName ?? "Anonymous";
  counts[name] = (counts[name] ?? 0) + 1;
}
```

From the full bundle's `Store.reportData`:

```ts
const counts = await page.evaluate(() => {
  const store = (window as any).__REACT_SCAN__.ReactScanInternals.Store;
  const out: Record<string, { count: number; selfTime: number; totalTime: number }> = {};
  for (const [, data] of store.reportData) {
    const name = data.displayName ?? "Anonymous";
    const prev = out[name] ?? { count: 0, selfTime: 0, totalTime: 0 };
    out[name] = {
      count: prev.count + (data.renderCount ?? data.count ?? 0),
      selfTime: prev.selfTime + (data.selfTime ?? 0),
      totalTime: prev.totalTime + (data.totalTime ?? data.time ?? 0),
    };
  }
  return out;
});
```

Assert per-component upper bounds in CI so regressions fail fast:

```ts
const budget = { SearchResults: 6, Result: 30, AppShell: 0 };
for (const [name, max] of Object.entries(budget)) {
  expect(counts[name]?.count ?? 0, `${name} render budget`).toBeLessThanOrEqual(max);
}
```

## Pairing with Playwright tracing

Playwright's `context.tracing.start({ snapshots: true, screenshots: false })` records DOM and network events but not React renders. Run tracing and lite event collection across the same start/stop window, save both files together, and correlate them by timestamp.
