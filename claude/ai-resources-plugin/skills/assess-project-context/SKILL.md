---
name: assess-project-context
description: "Rate default project context (AGENTS.md, CLAUDE.md, and auto-loaded files) for clarity and token efficiency, with ranked improvement proposals."
disable-model-invocation: true
allowed-tools: Read, Glob, Grep
---

# Assess default project context

Audit the files and instructions loaded automatically at conversation start on two axes: how clearly they explain the project to an agent, and whether they earn their always-loaded token cost.

This is a read-only assessment of the default context as it stands, not a codebase investigation. Do not edit files, and stay within these tool limits:

- Steps 1, 2, and 4 use only content already in the conversation. Make no tool calls during those steps.
- Step 3 reads only the directive references found in Step 2. Do not follow secondary links inside those files.

## 1. Baseline assessment

Rate understanding on a 1 to 5 scale using only automatically loaded context, citing specific evidence from that context for each dimension:

| Dimension | What to assess |
| --- | --- |
| Tech stack | Languages, frameworks, runtimes, key libraries, build tools |
| Code standards | Style rules, patterns to follow or avoid, quality bar |
| Project purpose | What the project does, who uses it, why it exists |
| Major components | Top-level modules, services, directories, and their roles |
| Features | User-facing capabilities and primary workflows |
| Development workflows | How to build, test, install, deploy, and run common tasks |

Scale: 1 = unaddressed; 2 = mentioned, too vague to act on; 3 = partial, major gaps remain; 4 = strong, minor gaps only; 5 = complete enough to work confidently from day one.

Report a table (`Dimension | Rating | Key evidence`), the mean baseline score (`X.X/5`), a 2 to 3 sentence narrative of what an agent knows and misses at baseline, and explicit lists of concrete **gaps** (missing facts an agent needs) and **ambiguities** (statements vague enough to misread).

## 2. File reference inventory

Scan the auto-loaded context for any pointer to external files: `@path` syntax, explicit file paths, globs, directory references that imply reading their contents, or phrases like "read", "check", "consult", or "see" pointing at a path.

List every reference grouped by the loaded file that contains it, and mark each as:

- **Directive:** explicitly instructs the agent to read the file.
- **Informational:** mentions the path for awareness without instructing a read.

## 3. Extended assessment

Read every directive reference from Step 2 (and nothing else). Re-rate all six dimensions on the same 1 to 5 scale.

Report a table (`Dimension | Baseline | Extended | Delta | What changed`), the mean extended score (`X.X/5`), and a 2 to 3 sentence narrative calling out which references paid off and which added little. If Step 2 found no directive references, note that and carry the baseline scores forward.

## 4. Context efficiency audit

Auto-loaded context is paid on every turn. Review every loaded file and section and flag content that burns tokens without proportional value:

- **Redundant:** instructions repeated in different words or duplicated across loaded files. Cite both locations and state which copy to keep.
- **Unnecessary:** stale notes, contradictory rules, cheap environment lookups restated as prose, or generic platitudes ("write clean code") that do not change behavior.
- **Low relevance:** valid material needed only in occasional tasks that belongs behind a skill, a branch reference, or an on-demand pointer.

For each flagged item, cite the exact location, name its category, and recommend an action (delete, deduplicate, or move behind an on-demand pointer). Include counts by category and a rough token-savings estimate.

## 5. Ranked improvements

Propose concrete edits grouped into four buckets:

1. **Quick wins:** small edits to existing auto-loaded files that close real gaps.
2. **Structural changes:** new files, reorganizations, or front-loading that lift baseline clarity.
3. **Reference optimization:** promoting informational links to directive, inlining high-value rules, or dropping low-value links.
4. **Trim bloat:** deletions or relocations from Step 4.

For every proposal, state what to change, which gap or bloat finding it fixes, the expected impact (dimensions improved or tokens saved), and whether it increases, reduces, or leaves neutral the default context size. Rank the proposals by impact-to-cost ratio.

## 6. Summary

Close with a short recap containing:

- Baseline score, extended score, bloat count, and estimated token savings.
- The 2 or 3 largest remaining understanding gaps.
- The 2 or 3 worst token-waste offenders.
- The top 5 recommended actions in priority order.

Done when all six sections are present, every score and bloat flag cites loaded text or a Step 3 directive file, no files outside Step 2's directive list were read, and no repository files were modified.
