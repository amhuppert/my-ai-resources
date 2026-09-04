---
name: review-guide-html
description: "Render a change-review-guide as an interactive, self-contained HTML page (and optionally regenerated markdown) from a YAML content file, with the file index and stats pulled from git."
disable-model-invocation: true
argument-hint: "[path to <slug>-review-guide.md] [--md]"
---

# Review Guide HTML

Turns an existing review guide into the interactive HTML design: sticky section nav, the review path as a persistent checklist with a progress bar, file chips that copy on click, and a filterable index of every changed file that jumps to the stop covering it. The judgement comes from the markdown guide written by `/change-review-guide`; the file list, statuses, and line counts come from git; the renderer refuses to build while any changed file is unassigned.

Tooling, relative to this skill:

- `scripts/render-review-guide.mjs` — Node 18+, no dependencies. `init` scaffolds the YAML from a git range; `render` validates and writes the outputs.
- `references/content-schema.md` — every key, the inline markup subset, and the file-assignment rules. Read it before writing the YAML.
- `references/example-scheduled-exports.yaml` — a complete worked example (23 files, 6 stops, 3 skim clusters). Open it when a section's shape is unclear.

## Steps

1. **Locate the source guide and the range.** The argument names the markdown guide; otherwise take the most recent `*-review-guide.md` in the working tree. Base and head come from its Scope line; when the guide does not say, base is the main branch and head is `HEAD`.

2. **Scaffold.** From the repository root:

   ```bash
   node <skill>/scripts/render-review-guide.mjs init --base <base> --head <head> --out <slug>-review-guide.yaml
   ```

   The file lands beside the markdown guide with every changed file listed under `unassigned`.

3. **Port the content.** Fill each section from the markdown guide one to one, following `references/content-schema.md`: Purpose paragraphs and callouts, ranked fundamentals with `forces`, stops in the guide's order with `lead`, `scrutinize` bullets and any sub-stops as `parts`, skim clusters with `spot_check`, and open questions with a `tag`. Move every path out of `unassigned` into the stop or cluster the guide names for it; use globs for clusters and explicit paths to pull a file out of a glob. The step is done when `unassigned` is empty and this prints `ok`:

   ```bash
   node <skill>/scripts/render-review-guide.mjs render <slug>-review-guide.yaml --check
   ```

   Each `error:` line names one problem; fix them all rather than the first.

4. **Render.** Drop `--check`. Add `--md` when the user wants the markdown regenerated from the YAML; it overwrites `<slug>-review-guide.md` so the two formats stay in sync. Confirm the output opens: it is a single file with no external resources.

5. **Report** the output paths in one line, plus any file that had no home in the guide and where you put it.

## Rules

- The markdown guide owns the judgement. Port it; do not re-review the diff. A file in `unassigned` that the guide never mentions goes in the closest skim cluster, and the report says so.
- Ids are yours to choose (`s1…`, `k-specs`); `forces` and nav links resolve against them, so keep them stable once the guide is shared.
- Store the YAML and outputs where the markdown guide lives; the YAML is the source for regeneration after the branch changes.
