---
name: assess-project-context
description: This skill should be used when the user asks to "assess project context", "audit default context", "evaluate project understanding", "check what I know about this project", "review project onboarding context", "rate my CLAUDE.md", "grade my onboarding context", or wants to understand how well the default conversation context conveys the project to an AI agent. Produces a scored baseline and extended assessment across six dimensions with concrete improvement recommendations.
allowed-tools: Read, Glob, Grep
---

# Assess Default Project Context

Evaluate the default project context — the files and instructions automatically loaded at conversation start — in two directions: whether it conveys the project effectively to an AI agent, and whether it does so efficiently without wasting tokens on redundant, unnecessary, or rarely-relevant content.

**Critical constraint:** Do NOT perform any research, exploration, or discovery beyond what is described in this skill. The goal is to assess the default context as-is, not to learn about the project through investigation.

## Step 1: Baseline Assessment

Assess understanding based ONLY on what is already present in the conversation context — the content loaded automatically before any tool calls. Do not read any files. Do not use any tools.

For each dimension below, rate understanding on a 1–5 scale and cite specific evidence from the loaded context that supports the rating:

| Dimension | What to assess |
|-----------|---------------|
| **Tech Stack** | Languages, frameworks, runtimes, key libraries, build tools |
| **Code Standards** | Style rules, patterns to follow/avoid, quality expectations |
| **Project Purpose** | What the project does, who it serves, why it exists |
| **Major Components** | Top-level modules, services, directories, and their roles |
| **Features** | User-facing capabilities and key workflows |
| **Development Workflows** | How to build, test, install, deploy; common developer tasks |

### Rating Scale

- **1 — No understanding**: Dimension not addressed at all in loaded context
- **2 — Minimal**: Mentioned but too vague to act on confidently
- **3 — Partial**: Key aspects covered but significant gaps remain
- **4 — Strong**: Sufficient to work effectively; minor gaps only
- **5 — Comprehensive**: Complete picture; an agent could work confidently from day one

### Output Format

Present the baseline assessment as a table followed by a brief narrative:

```
## Baseline Assessment

| Dimension | Rating | Key Evidence |
|-----------|--------|-------------|
| Tech Stack | X/5 | [specific content cited] |
| ... | ... | ... |

**Overall Baseline Score: X.X/5**

### Narrative

[2-3 sentences summarizing what an agent knows and doesn't know at baseline, without having read any additional files]
```

Identify specific **gaps** — things an agent would need to know but cannot determine from baseline context alone. Also identify **ambiguities** — things mentioned but unclear enough that an agent might misinterpret them.

## Step 2: Identify File References

Without using any tools, scan the context already loaded in memory for references to files that an agent could follow for additional understanding. These include:

- `@file/path` references (Kiro steering references)
- Explicit file paths mentioned in instructions (e.g., "see `agent-docs/code-standards/...`")
- Glob patterns suggesting files to consult
- Directory references that imply reading their contents
- Any instructions that say "read", "check", "consult", or "see" a specific path

List every reference found, grouped by source (which loaded file contains the reference). Note whether each reference is:
- **Directive**: The context explicitly instructs the agent to read this file
- **Informational**: The context mentions the path for awareness but doesn't instruct reading it

## Step 3: Extended Assessment

Read ONLY the files identified as **directive** references in Step 2 — files the default context explicitly points the agent to read. Do not explore beyond these references. Do not follow secondary references found within those files.

After reading the directive references, re-assess each dimension using the same 1–5 scale:

```
## Extended Assessment

| Dimension | Baseline | Extended | Delta | What Changed |
|-----------|----------|----------|-------|-------------|
| Tech Stack | X/5 | X/5 | +X | [what the references added] |
| ... | ... | ... | ... | ... |

**Overall Extended Score: X.X/5**

### Narrative

[2-3 sentences on how following references improved understanding. Call out any references that were high-value vs. low-value for project understanding.]
```

## Step 4: Context Efficiency Audit

The default context is loaded into every conversation and consumes tokens. Audit the loaded content for bloat — content that costs tokens without proportional value.

Review every instruction, section, and file loaded by default. Flag content that falls into any of these categories:

### Redundancy
Instructions that say the same thing in different ways, or content repeated across multiple loaded files. For each instance, cite both locations and identify which occurrence to keep.

### Unnecessary Instructions
Content that provides no value because:
- It states something the model would already do by default (e.g., "write clean code")
- It restates tool behavior the model already knows
- It is too generic to influence behavior in any meaningful way
- It is self-contradictory or conflicts with other loaded instructions

### Low Relevance
Content that is valid and useful but unlikely to be relevant to most conversations. This content would be better served by:
- A Claude skill that loads on demand when the topic arises
- A reference file pointed to only when needed
- A steering file that is conditionally loaded

For each flagged item, state: **what** the content is (cite it), **why** it's flagged (which category), and **recommendation** (remove, deduplicate, or move to an on-demand mechanism).

### Efficiency Summary

```
## Context Efficiency Audit

**Total items flagged: X**
- Redundant: X items
- Unnecessary: X items
- Low relevance: X items

**Estimated token savings if addressed: [rough estimate]**
```

## Step 5: Suggest Improvements

Based on the gaps, ambiguities, and bloat identified in previous steps, propose concrete improvements to the default project context. Organize suggestions into four categories:

### Category 1: Quick Wins
Changes to existing loaded files that would close gaps with minimal effort. Examples:
- Adding a missing dimension to a steering file
- Clarifying an ambiguous instruction
- Adding a key file reference that's currently missing

### Category 2: Structural Changes
Reorganization or new files that would meaningfully improve baseline understanding. Examples:
- A new steering file for an uncovered dimension
- Restructuring existing context to front-load critical information
- Consolidating scattered information into a single source

### Category 3: Reference Optimization
Improvements to how file references work in the default context. Examples:
- Promoting informational references to directive references
- Inlining high-value content that's currently behind a reference
- Removing references that add little value relative to their token cost

### Category 4: Trim Bloat
Removals or relocations of content flagged in the efficiency audit. Examples:
- Removing redundant instructions that appear in multiple files
- Deleting instructions the model follows by default
- Moving rarely-relevant sections into on-demand skills or reference files

For each suggestion, state: **what** to change, **why** (which gap or bloat issue it addresses), **impact** (which dimensions improve and by how much, or how many tokens are saved), and **token cost** (adds, removes, or neutral on default context size).

### Priority Ranking

After listing all suggestions, rank them by impact-to-cost ratio. The most valuable improvements close the largest understanding gaps with the smallest token budget increase.

## Step 6: Summary

Close with a concise summary:

```
## Summary

**Baseline Score: X.X/5** → **Extended Score: X.X/5**
**Bloat items flagged: X** (estimated token savings: ~X)

### Biggest Gaps
- [Top 2-3 understanding gaps that remain after extended assessment]

### Biggest Bloat Offenders
- [Top 2-3 items wasting the most tokens for the least value]

### Top 5 Recommended Actions
1. [Highest-impact improvement]
2. ...
3. ...
4. ...
5. ...
```
