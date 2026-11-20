---
name: change-review-guide
description: "Write a reviewer's guide to a set of code changes: purpose, fundamental decisions, file-by-file review path, and diff noise to skip."
disable-model-invocation: true
argument-hint: "[PR/MR number or URL | branch | path | description of the changes]"
---

# Change review guide

A reviewer is about to read changes they did not write. Raw diffs give every hunk equal weight in alphabetical order, so the reviewer spends attention reconstructing intent instead of judging it. Write a guide that puts intent up front: what the change is for, which few decisions drive it, where to read closely, in what order, and what they can safely skim.

## Scope

Resolve the user's argument to a concrete diff:

- **PR/MR number or URL:** fetch it and diff its head against its merge base. Use its description and commit messages as evidence for intent.
- **Branch:** diff against its merge base with the main branch.
- **Path or area of code:** changes touching that area, from the working tree if dirty, otherwise from the current branch against main.
- **Description in words** ("the auth refactor", "the last three commits"): match against recent commits and changed files, and state in the guide which commits or files you resolved it to.
- **No argument:** the working tree if dirty, otherwise the current branch against main.

When the user narrows scope to an area, cover that area and mention outside changes only where they explain something inside it. If the resolved scope has no changes, say so and stop rather than guessing a different target.

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

**Scope:** <what was reviewed and how it was resolved, e.g. PR #123, 14 files>

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

Before saving, verify both completion checks:

- Every changed file in scope appears either as a stop on the review path or inside a skim cluster.
- Reading the Fundamental changes section alone lets a reader predict most of what the diff contains.

After saving, report the file path, the one or two decisions that shape the change most, and that `/review-guide-html` can render the guide as an interactive HTML page.
