---
name: change-review-guide
description: "Write a reviewer's guide to a set of code changes: purpose, the
  fundamental decisions, a file-by-file review path, and the diff noise to
  skip."
---

# Change Review Guide

A reviewer is about to read a set of changes they did not write. Raw diffs present every hunk with equal weight, in alphabetical order, so the reviewer spends their attention reconstructing intent instead of judging it. Write the guide that gives them the intent up front: what the change is for, which few decisions drive it, where to read closely, in what order, and what they can safely skim.

## Scope

<scope>
The user's invocation names the target. Resolve it to a concrete set of changes:

- A PR/MR number or URL: fetch it and diff its head against its merge base. Its description and commit messages are evidence for intent.
- A branch: diff against its merge base with the main branch.
- A path or area of the code: the changes touching that area. Take the changes from the working tree if it is dirty, otherwise from the current branch's diff against main.
- A description in words ("the auth refactor", "the last three commits"): match it against recent commits and the changed files, and state in the guide which commits or files you took it to mean.
- Nothing: the working tree if it is dirty, otherwise the current branch against main.

When the user narrows the scope to an area, the guide covers that area; other changes in the same diff appear only where they explain something inside it. If the resolved scope contains no changes, say so and stop rather than guessing at a different target.
</scope>

## Understanding the change

Read the diff, then read enough of the surrounding code that you understand the changes as the author does, not as the diff presents them. The guide rests on three findings:

**Purpose.** What the change makes true that was not true before, and why that matters. Take reasons from the PR description, commit messages, linked issues, and code comments. When you infer a reason the evidence does not state, say it is your inference. Uncommitted work often has no stated intent at all; then say once, in the scope line, that every reason is inferred from the code.

**Fundamental changes and their implications.** Some changes exist on their own terms; most exist only because another change forced them. A change is *fundamental* when reverting it would force reverting many others. A change is an *implication* when it would have no reason to exist without a fundamental change. Rank the fundamental changes by how much of the diff they account for. Where a fundamental change is really a *decision* the author made (a new abstraction, a changed contract, a moved responsibility), name the decision, the alternative it displaced if evident, and what it forces downstream. A handful of decisions usually explain most of the diff; that handful is the core of the guide.

**Diff noise.** Renames, moves, import updates, formatting, generated files, snapshot updates, and mechanical call-site changes that follow from one decision. Group each cluster of noise under the decision that caused it so the reviewer can see it is derived and skim it. Noise is skimmable, not invisible: a rename that also changes behavior belongs on the review path, so read the mechanical-looking hunks closely enough to be sure they are mechanical.

For large diffs, dispatch subagents to read independent areas in parallel and report back their fundamental changes and noise clusters. Keep the ranking and the review order in your own hands.

## The review path

Order the substantive changes so each file is read with the context it needs already in hand: contracts before their implementations, producers before consumers, the fundamental change before its implications. Where a file mixes a fundamental change with noise, point the reviewer at the specific functions or hunks that matter.

Each stop on the path tells the reviewer three things: what to look at, what it does in the story of the change, and what deserves scrutiny there (an assumption the author made, a behavior that changed, an edge the tests do not cover).

## The guide

Save the guide to `<slug>-review-guide.md` (or as directed by the user), where the slug names the change. Use this shape, scaled to the diff: a small change gets a short guide, and a section that would hold a single item collapses to a sentence.

```markdown
# Review guide: <change title>

**Scope:** <what was reviewed and how it was resolved, e.g. PR #123, 14 files>

## Purpose
<A few sentences: what the change makes true, and why. Inferred reasons marked as inferred.>

## Fundamental changes
<Ranked. For each: the change or decision, why it was made, and which parts of the diff it forces. This is the part the reviewer reads first.>

## Review path
<Numbered. For each stop: file (and functions or hunks within it), its role in the change, and what to scrutinize. Order justified by what each stop needs the reader to already know.>

## Skim
<Noise clusters grouped by the decision that caused them, with a count or file list and one line on how to spot-check that the cluster really is mechanical.>

## Open questions
<Only if there are any: things the evidence left unclear that the reviewer should raise with the author.>
```

The guide is done when every changed file in scope is either a stop on the review path or in a skim cluster, and the fundamental-changes section alone would let a reader predict most of what the diff contains. Check both before saving.

Write for a developer who knows the codebase but has not seen the change. Quote code only where seeing it is faster than describing it. The guide's value is selection and ordering; a guide that restates the diff has failed.

After saving, tell the user the file path and the one or two decisions that most shape the change, and that `/review-guide-html` can render the guide as an interactive HTML page.
