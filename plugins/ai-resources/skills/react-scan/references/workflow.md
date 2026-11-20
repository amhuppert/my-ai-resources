# End-to-end `react-scan` diagnosis workflow

Detailed iteration procedure, slow-interaction/long-render variants, and report format.

## Standard re-render loop

### 1. Reproduce deterministically

1. Confirm the exact user sequence (e.g. "type 5 characters in search; keystroke 2 lags") and encode it as a Playwright script so every iteration replays identically.
2. Pin the build (dev with StrictMode disabled for exact counts, or prod with `dangerouslyForceRunInProduction: true`), clear cache, and keep the React DevTools extension out of the test browser.
3. Run the baseline 3 times. If render counts vary by >10% across runs, isolate the source of nondeterminism (timers, animations, unseeded fetches) before proceeding.

### 2. Instrument and capture

1. Instrument per [`setup.md`](setup.md) (prefer `react-scan/lite` with `recordChangeDescriptions: true`, `includeFiberSource: true`, `includeFiberIdentity: true`, or full bundle with `showToolbar: false`).
2. Decide measurement start: for interaction bugs, wait ~500 ms after `page.goto()` and clear `window.__events__ = []`; for initial-load bugs, record from `addInitScript`.
3. Drive interactions with real Playwright input APIs (`page.fill`, `page.click`, `page.keyboard.press`), not synthetic DOM events inside `page.evaluate`.
4. Wait ~500 ms for trailing effects to settle, then write both the raw events (`test-results/iter-1.json`) and the aggregated per-component count summary (`test-results/iter-1-summary.json`) to disk.

### 3. Classify and hypothesize

1. Sort components by render count descending and inspect the top 5 to 10 using [`diagnosis-patterns.md`](diagnosis-patterns.md). For `parent: true` cascades, walk up to the parent's `changeDescription`.
2. Open the parent/component JSX via `source` (`file:line`) and confirm the root cause in code.
3. Write a single-variable hypothesis naming one edit, the predicted count delta, and blast radius. Example: *"Wrapping `onSelect` in `useCallback` at `Results.tsx:42` drops `ResultRow` from 247 to <=50 renders across 5 keystrokes without changing `Header`."*

### 4. Fix and validate

1. Apply only the minimal fix from [`fix-recipes.md`](fix-recipes.md) (no unrelated formatting or cleanup in the same iteration), then run typecheck/tests.
2. Re-run the identical Playwright script, save `test-results/iter-2-summary.json`, and diff against `iter-1-summary.json`.
3. Accept if the targeted count drops roughly as predicted, no other component regresses, and render duration does not climb. Otherwise revert and re-classify (cascades often hide a secondary cause).

## Variants

- **Slow interaction (>200 ms):** reproduce with full bundle (`showToolbar: true`) to read the Notifications tab `SlowdownEvent` (input delay / processing / presentation split plus per-component bar chart). If React render time is >50% of total, optimize the top contributor; if non-React JS or presentation dominates, switch to `investigate-web-perf` (`INPBreakdown`).
- **Long-render frame (>150 ms):** `SlowdownEvent { kind: "long-render" }`. Profile the single render via Chrome Performance trace or temporary `console.time`, apply [`fix-recipes.md`](fix-recipes.md) § Long renders (virtualize, defer, paginate), and confirm the long-render event disappears.

## Iteration report format

```markdown
### Iteration N: <symptom>

- **Hypothesis:** <one sentence: exact edit + predicted delta>
- **Capture:** baseline `<path>` (interaction, N=3 median), suspect `<file:line>` and category
- **Change:** `<file>` (`+X / -Y` lines, summary of single edit)
- **Validation:** after `<path>`, `<Component>: before -> after`, other components unchanged, **accept / reject**
- **Notes:** environment caveats or follow-ups
```
