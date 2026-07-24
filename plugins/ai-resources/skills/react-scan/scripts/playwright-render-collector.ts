/**
 * Example Playwright test harness that:
 *   1. Injects react-scan/lite into the target page.
 *   2. Drives a defined interaction sequence.
 *   3. Collects per-component render counts and full LiteEvent stream.
 *   4. Writes baseline / after-fix artifacts to disk for diff comparison.
 *
 * Copy this file into your test suite and adapt the selectors + URL.
 * Run twice — once before the fix (saves to `baseline.json`) and once after
 * (saves to `after.json`) — then `diff` the two summaries to validate.
 *
 * Prerequisite — create `fixtures/react-scan-lite-wrapper.js` first.
 * `react-scan/lite` is published as ESM; to inject it via Playwright's
 * `addInitScript`, bundle it once into a global wrapper that exposes
 * `window.ReactScanLite = { instrument }`. See
 * `../references/playwright-integration.md` for the esbuild one-liner.
 */

import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const OUTPUT_DIR = resolve(__dirname, '../test-results/react-scan');
const LITE_WRAPPER_PATH = resolve(__dirname, '../fixtures/react-scan-lite-wrapper.js');

interface LiteEvent {
  kind: string;
  timestamp: number;
  componentName?: string;
  tree?: Array<{
    name: string;
    fiberId?: number;
    actualDuration: number;
    changeDescription?: {
      isFirstMount: boolean;
      props: string[] | null;
      state: boolean;
      context: boolean;
      hooks: number[];
      parent: boolean;
    } | null;
    source?: { fileName: string; lineNumber: number; columnNumber: number } | null;
  }>;
}

interface ComponentSummary {
  count: number;
  totalDuration: number;
  unstablePropCount: number;
  cascadeCount: number;
  contextChangeCount: number;
  selfStateCount: number;
  sources: Set<string>;
}

async function injectLite(page: Page): Promise<void> {
  const wrapper = readFileSync(LITE_WRAPPER_PATH, 'utf8');
  await page.addInitScript(`
    ${wrapper}
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
    window.__resetEvents__ = () => { window.__events__ = []; };
  `);
}

function aggregateByComponent(events: LiteEvent[]): Record<string, ComponentSummary> {
  const out: Record<string, ComponentSummary> = {};

  for (const event of events) {
    if (event.kind === 'commit' && event.tree) {
      for (const fiber of event.tree) {
        if (fiber.changeDescription?.isFirstMount) continue;
        const summary = (out[fiber.name] ??= {
          count: 0,
          totalDuration: 0,
          unstablePropCount: 0,
          cascadeCount: 0,
          contextChangeCount: 0,
          selfStateCount: 0,
          sources: new Set(),
        });
        summary.count += 1;
        summary.totalDuration += fiber.actualDuration;
        const cd = fiber.changeDescription;
        if (cd) {
          if (cd.props && cd.props.length > 0) summary.unstablePropCount += 1;
          if (cd.parent) summary.cascadeCount += 1;
          if (cd.context) summary.contextChangeCount += 1;
          if (cd.state || cd.hooks.length > 0) summary.selfStateCount += 1;
        }
        if (fiber.source) {
          summary.sources.add(`${fiber.source.fileName}:${fiber.source.lineNumber}`);
        }
      }
    }
  }

  return out;
}

function serializeSummary(summary: Record<string, ComponentSummary>) {
  return Object.fromEntries(
    Object.entries(summary)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([name, s]) => [
        name,
        {
          count: s.count,
          totalDuration: Number(s.totalDuration.toFixed(2)),
          unstablePropCount: s.unstablePropCount,
          cascadeCount: s.cascadeCount,
          contextChangeCount: s.contextChangeCount,
          selfStateCount: s.selfStateCount,
          sources: Array.from(s.sources),
        },
      ]),
  );
}

function writeArtifact(filename: string, data: unknown): void {
  const path = resolve(OUTPUT_DIR, filename);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`wrote ${path}`);
}

test('collect react-scan render data for search interaction', async ({ page }) => {
  await injectLite(page);
  await page.goto('/');

  await page.waitForFunction(() => Boolean((window as any).ReactScanLite));
  await page.evaluate(() => (window as any).__instrumentReactScan__());

  await page.waitForTimeout(500);
  await page.evaluate(() => (window as any).__resetEvents__());

  await page.fill('[data-testid="search"]', 'h');
  await page.waitForTimeout(150);
  await page.fill('[data-testid="search"]', 'he');
  await page.waitForTimeout(150);
  await page.fill('[data-testid="search"]', 'hel');
  await page.waitForTimeout(150);
  await page.fill('[data-testid="search"]', 'hell');
  await page.waitForTimeout(150);
  await page.fill('[data-testid="search"]', 'hello');
  await page.waitForTimeout(500);

  const events: LiteEvent[] = await page.evaluate(() => (window as any).__events__);

  const summary = aggregateByComponent(events);
  const variant = process.env.RUN_VARIANT ?? 'baseline';
  writeArtifact(`${variant}.json`, events);
  writeArtifact(`${variant}-summary.json`, serializeSummary(summary));

  expect(events.length).toBeGreaterThan(0);
});

/**
 * Optional companion test that asserts render budgets directly.
 * Adapt the budget object to your application's invariants.
 */
test('search interaction stays within render budget', async ({ page }) => {
  await injectLite(page);
  await page.goto('/');

  await page.waitForFunction(() => Boolean((window as any).ReactScanLite));
  await page.evaluate(() => (window as any).__instrumentReactScan__());

  await page.waitForTimeout(500);
  await page.evaluate(() => (window as any).__resetEvents__());

  await page.fill('[data-testid="search"]', 'hello');
  await page.waitForTimeout(500);

  const events: LiteEvent[] = await page.evaluate(() => (window as any).__events__);
  const summary = aggregateByComponent(events);

  const budget: Record<string, number> = {
    SearchResults: 6,
    Result: 30,
    AppShell: 0,
  };

  for (const [name, max] of Object.entries(budget)) {
    const actual = summary[name]?.count ?? 0;
    expect(actual, `${name} render budget exceeded`).toBeLessThanOrEqual(max);
  }
});
