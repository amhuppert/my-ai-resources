---
name: change-review-guide
description: "Write a reviewer's guide to a set of code changes (purpose, fundamental decisions, file-by-file review path, and diff noise) and render an interactive HTML page."
disable-model-invocation: true
argument-hint: "[PR/MR number or URL | branch | path | description | existing guide .md/.yaml]"
---

# Change review guide

A reviewer is about to read changes they did not write. Raw diffs give every hunk equal weight in alphabetical order, so the reviewer spends attention reconstructing intent instead of judging it. Write a markdown guide that puts intent up front: what the change is for, which few decisions drive it, where to read closely, in what order, and what they can safely skim. Once the markdown guide is complete and verified, delegate generating the interactive HTML version to a cheaper subagent.

## Scope

Resolve the user's argument to a concrete diff:

- **PR/MR number or URL:** fetch it locally and diff its head against its merge base. Use its description and commit messages as evidence for intent.
- **Branch:** diff against its merge base with the main branch.
- **Path or area of code:** changes touching that area, from the working tree if dirty, otherwise from the current branch against main.
- **Description in words** ("the auth refactor", "the last three commits"): match against recent commits and changed files, and state in the guide which commits or files you resolved it to.
- **Existing guide (`*-review-guide.md` or `*-review-guide.yaml`):** skip diff analysis and go straight to [HTML rendering](#html-rendering).
- **No argument:** the working tree if dirty, otherwise the current branch against main.

When the user narrows scope to an area, cover that area and mention outside changes only where they explain something inside it. If the resolved scope has no changes, say so and stop rather than guessing a different target. Explicit user instructions (such as markdown-only output, regenerating markdown from YAML, or a custom output path) override the defaults below.

## Understanding the change

Read the diff and enough surrounding code to understand the changes as the author did, not just as the diff slices them. Build the guide around three findings:

**Purpose.** What the change makes true that was not true before, and why that matters. Pull reasons from the PR description, commit messages, linked issues, and code comments. Mark any inferred reason as inferred. Uncommitted work often has no stated intent; in that case, say once in the scope line that all reasons are inferred from the code.

**Fundamental changes and their implications.** Some edits stand on their own; most exist only because another change forced them. A change is *fundamental* when reverting it would force reverting many others. A change is an *implication* when it has no reason to exist without a fundamental change. Rank fundamental changes by how much of the diff they explain. When a fundamental change is a design decision (a new abstraction, a changed contract, a moved responsibility), name the decision, the alternative it displaced if evident, and what it forces downstream. A handful of decisions usually explain most of the diff; that handful is the core of the guide.

**Diff noise.** Renames, moves, import updates, formatting, generated files, snapshot updates, and mechanical call-site edits that follow from a single decision. Group each noise cluster under the decision that caused it so the reviewer sees it is derived and can skim it. Skimmable does not mean invisible: read mechanical-looking hunks closely enough to verify they are truly mechanical. A rename that also alters behavior belongs on the review path.

For large diffs, if the environment supports subagents, dispatch them in parallel to read independent areas and report back their fundamental changes and noise clusters. Keep the final ranking and review ordering in your own hands.

## The review path

Order substantive changes so each file arrives with its prerequisites already explained: contracts before implementations, producers before consumers, fundamental changes before implications. Where a file mixes substantive edits with noise, point directly to the functions or hunks that matter.

Each stop tells the reviewer three things: what to look at, its role in the change, and what to scrutinize (an assumption, changed behavior, or an untested edge).

## Writing the guide

Save to `<slug>-review-guide.md` (or the path the user requested), where `<slug>` names the change. Scale the layout to the diff: small changes get short guides, and a section holding one item collapses to a sentence.

```markdown
# Review guide: <change title>

**Scope:** <what was reviewed and how it was resolved, including exact git base and head refs when reviewing commits, e.g. PR #123, branch `feat/auth` against `main`, 14 files>

## Purpose
<A few sentences: what the change makes true, and why. Mark inferred reasons.>

## Fundamental changes
<Ranked. For each: the change or decision, why it was made, and what parts of the diff it forces.>

## Review path
<Numbered. For each stop: file and relevant functions/hunks, its role, and what to scrutinize. Order by prerequisite context.>

## Skim
<Noise clusters grouped by causing decision, with file list or count and one line on how to spot-check that it is mechanical.>

## Open questions
<Include only when evidence leaves something unclear for the reviewer to ask the author.>
```

Write for a developer who knows the codebase but has not seen this change. Quote code only when reading the snippet is faster than describing it. Selection and ordering are the whole point; a guide that merely summarizes every hunk has failed.

Before saving and moving to HTML rendering, verify both completion checks:

- Every changed file in scope appears either as a stop on the review path or inside a skim cluster.
- Reading the Fundamental changes section alone lets a reader predict most of what the diff contains.

## HTML rendering

After saving the verified markdown guide, generate the interactive HTML version (`<slug>-review-guide.html` and its backing `<slug>-review-guide.yaml`) unless the user asked for markdown only.

The renderer (`scripts/render-review-guide.mjs`) pulls file lists and line stats from a local git commit range (`base..head`) and fails while any file in that range is unassigned. If the reviewed scope is uncommitted working-tree changes, a path-filtered subset of a wider diff, or lacks local git refs, skip HTML rendering and explain why in the final report.

When the host supports subagents, delegate HTML rendering to a subagent on a cheaper, faster model tier: select a lower-cost model via the subagent tool's model parameter when supported, rather than inheriting the flagship model. The lead agent has already completed the analysis; porting markdown to YAML and running validation is mechanical. If the host does not support subagents, read [`references/html-rendering.md`](references/html-rendering.md) and run the rendering step directly.

Give the subagent a self-contained prompt containing:

- Path to `<slug>-review-guide.md` (or the existing `.yaml` file when re-rendering)
- Paths to [`references/html-rendering.md`](references/html-rendering.md) and `scripts/render-review-guide.mjs` (resolved relative to this skill directory)
- Resolved git `base` and `head` refs (plus `merge_base: false` if comparing a direct commit range rather than a merge base), the repository root, and any ticket key or display branch label
- Desired output paths (default `<slug>-review-guide.yaml` and `<slug>-review-guide.html`; note if the user also asked to regenerate the markdown from YAML)
- Instruction to follow `references/html-rendering.md`: port the guide one-to-one without re-reviewing the diff, fix validation errors until `--check` prints `ok`, render the HTML, and return the written paths, file/stop counts, and any changed files that had been missing from the markdown guide

Review the subagent's result before replying. Confirm `--check` passed and the output files were written. If rendering fails, report the error and keep the markdown guide as the completed output.

## Reporting

Report the saved file paths (`.md`, `.html`, and `.yaml`, or `.md` plus why HTML was skipped), the one or two decisions that shape the change most, and any files missing from the initial markdown guide that the renderer surfaced and placed.
