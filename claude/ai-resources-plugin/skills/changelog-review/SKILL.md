---
name: changelog-review
description: This skill should be used when the user asks to "review the changelog", "what's new in Claude Code", "Claude Code updates", "recent Claude Code changes", "changelog report", "what changed in Claude Code", or wants a summary of recent Claude Code changes and their significance.
argument-hint: "[--comprehensive] [--since <date>]"
allowed-tools: Read, Write, WebFetch, WebSearch, Task, AskUserQuestion
---

# Claude Code Changelog Review

Fetch the Claude Code changelog, analyze recent changes, and produce a report that explains the significance and implications of the most important updates.

<arguments>
$ARGUMENTS
</arguments>

## Step 1: Parse Arguments

Extract from the arguments:

- **Mode**: Default (significant changes only) or comprehensive (`--comprehensive` flag)
- **Time range**: Past week (default), or custom range if `--since <date>` specified
- **Output path**: Current working directory (default)

## Step 2: Fetch the Changelog

Fetch the Claude Code changelog from:

```
https://code.claude.com/docs/en/changelog
```

Use WebFetch to retrieve the full page content. If the fetch fails, try WebSearch to locate the current changelog URL — it may have moved.

## Step 3: Identify Changes in Scope

Parse the fetched content and identify all changelog entries that fall within the target time range.

- Match entries by their date headers/labels
- If dates are ambiguous, include entries that could plausibly fall within range
- Collect the full text of each matching entry for analysis

## Step 4: Categorize and Prioritize

Classify each change into one of these categories:

| Category | Description | Default mode | Comprehensive mode |
|----------|-------------|--------------|-------------------|
| **Major feature** | New capabilities, workflows, or integrations | Include | Include |
| **Significant enhancement** | Meaningful improvements to existing features | Include | Include |
| **Developer experience** | CLI UX, performance, configuration changes | Include if impactful | Include |
| **Minor enhancement** | Small quality-of-life improvements | Omit | Include |
| **Bug fix** | Corrections to existing behavior | Omit | Include |
| **Internal/infrastructure** | Build, CI, dependency updates | Omit | Omit |

In **default mode**, focus on changes that would affect how a user works with Claude Code — new capabilities, changed workflows, or features that unlock new use cases.

In **comprehensive mode**, cover all user-facing changes including minor enhancements and bug fixes. Still omit purely internal changes.

## Step 5: Research Context

For each included change, determine whether additional research is needed to explain its significance:

- **New features**: Search for documentation, blog posts, or discussions that explain the feature's purpose and intended use cases
- **Integration changes**: Research the integrated tool/service if unfamiliar
- **API or protocol changes**: Look up relevant specifications or migration guides
- **Terminology**: Clarify any Claude Code-specific terms that may be unfamiliar

Use WebSearch and WebFetch to gather this context. The goal is to provide enough background that the reader understands *why* a change matters, not just *what* changed.

## Step 6: Write the Report

Generate a markdown report with the following structure:

```markdown
# Claude Code Changelog Review

**Period**: [start date] to [end date]
**Mode**: [Default | Comprehensive]
**Generated**: [current date]

## Highlights

[2-3 sentence executive summary of the most significant changes in this period]

## [Category Name]

### [Change Title]

[1-2 paragraph explanation covering:]
- What changed
- Why it matters — how it affects workflows, unlocks new capabilities, or changes existing behavior
- How to use it — brief practical guidance if applicable
- Any caveats or limitations discovered during research

[Repeat for each change in this category]

[Repeat for each category that has changes]

## Summary

[Brief closing that ties together themes across changes, if any patterns emerge]
```

### Writing guidelines

- Do not merely restate the changelog entry — add context and analysis
- Explain significance from the perspective of a daily Claude Code user
- Use concrete examples where they help illustrate a change's impact
- Group related changes together even if they appeared as separate entries
- If a change builds on a previous change outside the time range, briefly note the connection

## Step 7: Save and Present

Save the report as `claude-code-changelog-review.md` in the current working directory.

After saving, present a brief summary to the user highlighting the 2-3 most impactful changes.
