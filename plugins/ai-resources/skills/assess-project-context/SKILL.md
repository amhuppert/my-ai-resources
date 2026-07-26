---
name: assess-project-context
description: Assess / rate the default project context (CLAUDE.md, onboarding).
  Scores how well it conveys the project to AI across six dimensions, with
  improvement recommendations.
---

# Assess Default Project Context

Evaluate the default project context — the files and instructions automatically loaded at conversation start — in two directions: whether it conveys the project effectively to an AI agent, and whether it does so efficiently without wasting tokens on redundant, unnecessary, or rarely-relevant content.

The goal is to assess the default context as-is, not to learn about the project through investigation, so do not research or explore beyond what the steps below describe: Steps 1, 2, and 4 use only content already loaded in the conversation (no tools, no file reads), and Step 3 reads only the directive references identified in Step 2.

## Step 1: Baseline Assessment

For each dimension below, rate understanding on a 1–5 scale based only on the content loaded automatically before any tool calls, citing specific evidence from that loaded context:

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

Identify specific **gaps** — things an agent would need to know but cannot determine from baseline context alone — and **ambiguities** — things mentioned but unclear enough that an agent might misinterpret them.

## Step 2: Identify File References

Scan the loaded context for references to files that an agent could follow for additional understanding:

- `@file/path` references (Kiro steering references)
- Explicit file paths mentioned in instructions (e.g., "see `agent-docs/code-standards/...`")
- Glob patterns suggesting files to consult
- Directory references that imply reading their contents
- Any instructions that say "read", "check", "consult", or "see" a specific path

List every reference found, grouped by source (which loaded file contains the reference), and classify each as:

- **Directive**: The context explicitly instructs the agent to read this file
- **Informational**: The context mentions the path for awareness but doesn't instruct reading it

## Step 3: Extended Assessment

Read only the files identified as directive references in Step 2; do not follow secondary references found within those files. Then re-assess each dimension using the same 1–5 scale:

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

The default context is loaded into every conversation and consumes tokens. Review every instruction, section, and file loaded by default and flag content that costs tokens without proportional value:

- **Redundancy** — Instructions that say the same thing in different ways, or content repeated across multiple loaded files. Cite both locations and identify which occurrence to keep.
- **Unnecessary instructions** — Content that provides no value: it states something the model would already do by default (e.g., "write clean code"), restates tool behavior the model already knows, is too generic to influence behavior, or contradicts other loaded instructions.
- **Low relevance** — Content that is valid but unlikely to matter in most conversations, better served by an on-demand mechanism: a skill that loads when the topic arises, a reference file pointed to only when needed, or a conditionally loaded steering file.

For each flagged item, state: **what** the content is (cite it), **why** it's flagged (which category), and **recommendation** (remove, deduplicate, or move to an on-demand mechanism).

```
## Context Efficiency Audit

**Total items flagged: X**
- Redundant: X items
- Unnecessary: X items
- Low relevance: X items

**Estimated token savings if addressed: [rough estimate]**
```

## Step 5: Suggest Improvements

Based on the gaps, ambiguities, and bloat identified above, propose concrete improvements in four categories:

1. **Quick Wins** — Small edits to existing loaded files that close gaps (e.g., clarifying an ambiguous instruction, adding a missing key file reference)
2. **Structural Changes** — Reorganization or new files that meaningfully improve baseline understanding (e.g., a new steering file for an uncovered dimension, front-loading critical information, consolidating scattered information)
3. **Reference Optimization** — Improvements to how file references work (e.g., promoting informational references to directive, inlining high-value referenced content, removing references worth less than their token cost)
4. **Trim Bloat** — Removals or relocations of content flagged in the efficiency audit

For each suggestion, state: **what** to change, **why** (which gap or bloat issue it addresses), **impact** (which dimensions improve and by how much, or how many tokens are saved), and **token cost** (adds, removes, or neutral on default context size).

Rank all suggestions by impact-to-cost ratio: the most valuable improvements close the largest understanding gaps with the smallest token budget increase.

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
