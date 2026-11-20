---
name: review-guide-html
description: "Render a change-review-guide as an interactive, self-contained HTML page (and optionally regenerated markdown) from a YAML content file, pulling the file index and stats from git."
disable-model-invocation: true
argument-hint: "[path to <slug>-review-guide.md] [--md]"
---

# Review guide HTML

Turn an existing markdown review guide into the interactive HTML format: sticky section nav, persistent checklist with progress bar, click-to-copy file chips, and a filterable index of every changed file linked to the stop covering it. The markdown guide written by `/change-review-guide` owns the judgement; git supplies the file list, statuses, and line counts; the renderer refuses to build while any changed file remains unassigned.

Tooling relative to this skill:

| File | Purpose |
| --- | --- |
| `scripts/render-review-guide.mjs` | Node 18+ script (no deps). `init` scaffolds YAML from git; `render` validates and builds outputs |
| [`references/content-schema.md`](references/content-schema.md) | Every YAML key, inline markup subset, and file-assignment rules. Read before editing YAML |
| [`references/example-scheduled-exports.yaml`](references/example-scheduled-exports.yaml) | Complete worked example (23 files, 6 stops, 3 skim clusters). Open when a section shape is unclear |

## Steps

1. **Locate the guide and git range.** Use the markdown guide named in the argument, or the most recent `*-review-guide.md` in the working tree. Read `base` and `head` from its Scope line; if unspecified, default to the main branch and `HEAD`.
2. **Scaffold the YAML** from the repository root:
   ```bash
   node <skill>/scripts/render-review-guide.mjs init --base <base> --head <head> --out <slug>-review-guide.yaml
   ```
   This places the YAML beside the markdown guide with every changed file under `unassigned`.
3. **Port the guide one-to-one** following [`references/content-schema.md`](references/content-schema.md):
   - Purpose paragraphs and callouts
   - Ranked fundamentals with `forces`
   - Stops in the guide's exact order (`lead`, `scrutinize` bullets, optional `parts`)
   - Skim clusters with `spot_check`, and open questions with `tag`
   - Move every path out of `unassigned` into its stop or skim cluster (use globs for clusters and explicit paths to pull a file out of a glob).
4. **Validate before rendering:**
   ```bash
   node <skill>/scripts/render-review-guide.mjs render <slug>-review-guide.yaml --check
   ```
   Fix every reported `error:` line until `unassigned` is empty and `--check` prints `ok`.
5. **Render.** Re-run without `--check`. Pass `--md` if the user wants `<slug>-review-guide.md` regenerated from the YAML so both formats stay in sync. Verify the HTML file was written (it is standalone with no external assets).
6. **Report** the output path(s) in one line, plus any changed file absent from the markdown guide and which cluster you placed it in.

## Rules

- **Port, do not re-review.** The markdown guide owns the judgement. If an unassigned file was never mentioned in the guide, place it in the closest skim cluster and mention that in the report.
- **Keep ids stable** (`s1`, `k-specs`): `forces` references and nav links target them, so avoid renaming ids once shared.
- **Keep the YAML beside the markdown guide** as the source for future regenerations after the branch updates.
