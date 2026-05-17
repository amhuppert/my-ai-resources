# Workflow — End-to-End Loop

Load this reference when running a full diagnose-and-fix iteration. The SKILL.md gives the loop in summary; this file walks through each phase with prompts, gotchas, and decision points.

## Phase 1 — Reproduce Deterministically

Goal: make the symptom appear on every run with the same starting state.

1. **Confirm the symptom**. Don't measure something you can't see. Have the user describe the interaction sequence — "type 5 characters in the search box, the second is laggy" — and reproduce it manually first.
2. **Pin the build environment**.
   - For lab measurement: dev build (StrictMode disabled if asserting exact counts).
   - For production reproduction: production build + `dangerouslyForceRunInProduction: true`.
3. **Pin the interaction sequence**. Write it as a Playwright script even if you'll run it interactively. The script is the unit of comparison across iterations.
4. **Pin the environment**. Cache cleared, no React DevTools extension, dedicated Chromium profile for repeatability.
5. **Verify the baseline is stable**. Run the sequence 3 times. If render counts vary by >10% across runs, find the source of variance before continuing (timers? animations? data fetches with cache differences?).

**Anti-pattern:** investigating "sometimes" slowness without first making it reliably slow.

## Phase 2 — Instrument

Goal: react-scan is installed, the test page exposes the right globals, the counter is reset to zero before measurement.

1. **Choose mode** based on the SKILL.md mode table. Lite for data extraction, full for visual sanity-check.
2. **Install per setup.md**. Verify in the Playwright run:
   ```ts
   await page.waitForFunction(() => typeof (window as any).__REACT_SCAN__ !== "undefined");
   ```
3. **Disable the toolbar** for measurement runs (`showToolbar: false` or use lite mode). Toolbar render activity inflates counts.
4. **Configure for diagnosis**:
   ```ts
   {
     recordChangeDescriptions: true,
     includeFiberSource: true,
     includeFiberIdentity: true,
   }
   ```
5. **Reset counters** after page boot:
   ```ts
   await page.waitForTimeout(500);
   await page.evaluate(() => { window.__events__ = []; });
   ```

**Decision point:** Is the symptom interaction-driven or load-driven? Interaction-driven → measure after the boot reset. Load-driven → measure from `addInitScript` time so mount events are captured.

## Phase 3 — Capture

Goal: a deterministic, on-disk artifact you can compare against later.

1. **Drive the exact interaction**. Use `page.fill`, `page.click`, `page.keyboard.press`, etc. Do **not** use `page.evaluate` to dispatch synthetic events — those bypass React's event system and produce different timing.
2. **Wait for settle**. After the last user input, `await page.waitForTimeout(500)` lets pending renders flush. Some apps have effects that schedule updates 100ms later; tune as needed.
3. **Save raw events to disk**:
   ```ts
   const events = await page.evaluate(() => window.__events__);
   fs.writeFileSync("test-results/iter-1.json", JSON.stringify(events));
   ```
4. **Save the aggregated summary** (top-N components by render count):
   ```ts
   const summary = aggregateByComponent(events);
   fs.writeFileSync("test-results/iter-1-summary.json", JSON.stringify(summary, null, 2));
   ```

**Do not pass raw events into model context.** A 1000-fiber tree × 50 commits is many MB of JSON.

## Phase 4 — Classify

Goal: each over-rendering component is labeled with one of the root cause categories in `diagnosis-patterns.md`.

1. **Sort by render count desc**. Take the top 5–10.
2. **For each**, read its first `changeDescription` from the lite events:
   - `parent: true, props: null/[]` → Cascade
   - `props: [name, ...]` → Unstable Reference (most common)
   - `context: true` → Context Over-Scope
   - `state: true` or `hooks: [...]` → Selector / Hook
3. **For cascade cases**, recurse: read the parent's `changeDescription`. The parent's cause is the root cause.
4. **Read the source**. Use the `source` field (file:line) to navigate to the JSX. Confirm the suspected unstable reference is there.

**Output of this phase:** a table mapping component → category → suspect file:line.

| Component | Renders | Category | Suspect |
|---|---|---|---|
| `ResultRow` | 247 | Unstable Reference (`onClick`) | `Results.tsx:42` |
| `Filters` | 50 | Context Over-Scope | `AppContext` value not memoized |
| `Header` | 50 | Cascade from `<Layout>` | trace up |

## Phase 5 — Hypothesize

Goal: a single, testable claim about what one change will do.

Bad: "This component re-renders too much. Let me add memo and useCallback throughout."

Good: "Wrapping the `onSelect` prop in `useCallback` in `Results.tsx:42` will drop `ResultRow` renders from 247 to ≤50 (one per visible row per state change), without affecting `Header` count."

The hypothesis names:
- **The change** (one specific edit)
- **The expected delta** (a number)
- **The blast radius** (what else might move)

## Phase 6 — Fix

Goal: minimum diff that implements the hypothesis.

1. Read the source. Identify the smallest change.
2. Apply the fix from `fix-recipes.md`.
3. **Do not bundle the fix with cleanup**. Don't reformat the file. Don't rename. The diff is what you'll show in the report.
4. Re-run the type checker and tests if applicable.

**Anti-pattern:** "while I'm here, let me also fix this other thing." No. One variable per iteration.

## Phase 7 — Validate

Goal: identical-emulation re-measurement that proves the hypothesis.

1. Re-run the **same** Playwright script.
2. Save events to `test-results/iter-2.json`.
3. Compare:
   ```ts
   diffSummaries("iter-1-summary.json", "iter-2-summary.json");
   ```
4. Accept the fix iff:
   - Targeted component's count dropped by approximately the predicted delta
   - No other component's count rose
   - Render-time-per-render did not increase materially (memo overhead can negate wins on tiny components)

If the fix did not produce the expected delta:
- The hypothesis was wrong. Re-classify with the updated data. Often a "cascade" turns out to have a second cause; the fix only resolves one.
- Or the fix introduced a new unstable reference. Revert and look closer.

If the fix worked, write the report:

```markdown
## Fix: Memoize `onSelect` in `Results.tsx`

**Before:** `ResultRow` rendered 247 times during 5-keystroke search.
**After:** `ResultRow` rendered 50 times (1 per row, 5 keystrokes × 10 rows × 1 = 50).
**Diff:** `Results.tsx` +3 / -1 lines (added `useCallback`).
**Blast radius:** no other component's render count changed.

baseline: `test-results/iter-1-summary.json`
after-fix: `test-results/iter-2-summary.json`
```

## Variant — Slow Interaction Workflow

When the user reports a slow interaction (>200 ms) rather than excessive renders:

1. **Reproduce** with full bundle (`scan({ showToolbar: true })`) so you can read the Notifications tab.
2. **Drive the interaction** in Playwright.
3. **Read the slowdown event** from `toolbarEventStore` or by clicking into the Notifications UI:
   - Three-phase breakdown: input delay / processing / presentation
   - Stacked bar chart of contributing components
4. **If React render time dominates** (>50% of total), go to Phase 4 with the top contributor as the suspect.
5. **If other JS dominates**, the bug is non-React — escalate to `investigate-web-perf` `INPBreakdown`.
6. **If presentation dominates**, it's paint/layout — same escalation.

## Variant — Long-Render-Frame Workflow

Notifications tab shows `kind: 'long-render', duration: >150ms`. This is a single render taking too long, not a re-render count issue.

1. **Identify the rendering component** from the event payload.
2. **Profile the render itself** — either via the Performance panel (chrome-devtools-mcp) or by adding a `console.time` / `console.timeEnd` around the render body.
3. **Apply Long Renders recipe** from `fix-recipes.md`:
   - Virtualize if list-heavy
   - Defer with `useDeferredValue` / `useTransition`
   - Paginate at the data layer
4. Validate by re-measuring — the long-render event should no longer fire.

## Reporting Template

Every diagnosis-and-fix iteration should produce a report with this shape (one section per fix iteration):

```markdown
### Iteration N — <symptom>

**Hypothesis:** <one sentence>

**Capture:**
- baseline: `path/to/baseline.json` (interaction: ___, N=3 median)
- top 5 components by render count:
  | Component | Count | Category | Suspect |
- file:line of suspect: `path:line`

**Change:**
- `git diff` summary (one file, ≤ ~10 lines ideally)

**Validation:**
- after-fix: `path/to/after.json`
- delta on targeted component: ___ → ___
- no other component regressed (or: list deltas)
- accept / reject decision

**Notes:**
- non-obvious caveats, environment differences, follow-ups
```

This format makes successive iterations comparable and gives the user a clean rollback path if a later fix turns out to be wrong.
