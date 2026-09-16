---
name: writing-for-frontier-agents
description: Write or review agent instructions. Use when creating or editing
  skills, AGENTS.md, CLAUDE.md, system prompts, or reference documents agents
  consume.
---

# Writing for frontier agents

Write instructions that produce reliable outcomes while leaving routine implementation choices to the agent. Unless the user specifies a target model, write for **both Claude Fable and GPT-6 Astra**. Preserve the user's intended scope and existing authorization; an assessment request calls for findings, while an implementation request calls for the authorized changes.

## Choose references by need

The shared guidance below is the default. Load only the reference needed for a model-specific decision or a failure under investigation:

| Need | Reference |
| --- | --- |
| Skill frontmatter, invocation policy, or splitting skills | [Skill mechanics](references/skill-mechanics.md) |
| Differences between Fable and Astra, or adapting instructions between them | [Fable/Astra comparison](references/fable-astra-prompting-comparison.md) |
| Fable-specific behavior, remedies, or application settings | [Fable prompting guide](references/fable-prompting-guide.md) |
| Astra-specific behavior, remedies, or application settings | [Astra prompting guide](references/gpt-6-astra-prompting-guide.md) |
| Instructions targeting GPT-5.6 Sol, Terra, or Luna | [GPT-5.6 prompting guide](references/gpt-5.6-sol-prompting-guide.md) |

The guides are dated references, not a requirement to insert every remedy. For shared instructions, keep compatible principles and disclose model-specific exceptions. API settings, history preservation, compaction, and client display belong to the application; prompts alone cannot implement them. Verify current provider documentation before relying on version-sensitive API details.

## Outcomes, constraints, and completion

State the goal, audience, why the result matters, relevant context, constraints, evidence requirements, and what must be true before finishing. Explain reasons when they help the agent resolve unfamiliar cases. Prefer observable outcomes over instructions prescribing routine implementation steps.

Use an ordered procedure when dependencies or operational invariants require it. Otherwise, let the agent choose its path. A document may contain steps, reference rules, or both; reproducibility means meeting the same requirements, not taking an identical process every run.

Make completion criteria both **checkable** and **exhaustive within scope**:

- **Clarity:** specify evidence that distinguishes done from not done. Replace "understand the system" with the concrete facts or decisions needed next.
- **Demand:** account for every requested behavior or relevant rule, without expanding the assignment. "Every modified model accounted for" sets a coverage bar that "produce a change list" does not.
- **Stopping condition:** define sufficient retrieval and validation. Once required checks pass, broaden or repeat them only for new changes, failures, or unresolved concerns. Keep edits and permanent tests proportional to the requested behavior and repository practice.

When instructions fail to elicit enough work, sharpen the missing requirement, evidence, or stopping condition. Replacing "thorough" with "relentless" adds intensity without defining success.

Visible later steps can tempt premature completion of a fuzzy current step. Sharpen its completion criterion first. Only when the bound remains irreducibly fuzzy and observed runs still rush should you split the sequence across a real context boundary, such as a handoff or subagent dispatch. An inline reference does not remove later steps already in context. Carry the overall goal and constraints across the boundary.

## Collaboration and authority

When writing collaboration policy, separate tone from decisions about acting, asking, continuing, and stopping:

- Distinguish assessment from implementation. Treat requests such as "can you fix…" as action requests when intent is clear; use prior context and existing authorization for routine next steps.
- Ask when a missing answer materially changes the result and cannot be inferred. Continue independent work while awaiting an answer only when the host workflow supports it. For unattended runs, define what to do when user input is unavailable.
- Keep permission policy in one authoritative place. Prepare authorized, reviewable work before an approval boundary; skill guidance should not invent additional gates.
- State that explicit user instructions override skill guidelines within the host's instruction hierarchy. Higher-priority system/developer rules and tool permissions still apply. If a file causes a pause or scope change, identify the file and exact instruction and distinguish an explicit requirement from an interpretation.
- Specify delegation expectations only when the environment supports subagents: independent bounded tasks, clear deliverables and context, review of results, and useful lead-agent work while they run.

## Context pointers and the two loads

A **context pointer** names material outside the current context and states when to read it. Skill descriptions and document links in `AGENTS.md` serve the same purpose. The pointer's wording determines whether the agent reaches the target.

- State what the material does and the distinct cases that trigger reading it. Front-load the recognizable concept; collapse synonyms for the same case and omit identity already clear from the target.
- If necessary material is missed, sharpen its trigger before inlining the material. If that still fails, move the essential rule into the shared path.
- Distinguish **context load**, paid by always-loaded descriptions and instructions on every turn, from **human cognitive load**, paid when users must remember which documents exist and when to invoke them. Spend the latter where human judgment matters; remove avoidable discovery burden elsewhere.

Material behind a pointer avoids always-loaded context cost, but still consumes attention when loaded. Material with no discoverable pointer depends on the human to supply it.

## Information hierarchy and splitting

Place material according to when it is needed:

1. **In-file actions and essential constraints:** required on the shared path; order actions only where order matters.
2. **In-file reference:** nearby definitions and rules needed to interpret the task. A flat set of peer rules is appropriate for a review or reference-only document.
3. **Disclosed reference:** separate files for substantial detail needed only by particular branches.

Use **progressive disclosure** to keep the shared path legible: inline what every branch needs and link what only some branches need. Moving essential constraints out of sight is not an improvement. When a document has steps, unrelated reference should not bury them.

Use **co-location** within each file: keep a concept's definition, rules, and caveats together. Scattering fragments one meaning across locations; duplication repeats the meaning. Avoid both.

**Sprawl** can occur even when every line is unique and relevant. Split by branch when each path needs different reference; split by sequence only when the completion problem above warrants it. Split by invocation only when independent discovery earns the additional context or human load; see the skill-mechanics reference.

## Precise language and examples

Use familiar, compact concepts as **leading words** when they reliably name an established behavior. Reuse the same term in prompts, pointers, and the body to connect discovery with execution. Define a coined term before relying on it; it has no established meaning to recruit.

Compression must preserve requirements. "Tight loop" does not by itself mean "fast, deterministic, low-overhead." Retain those properties where they affect correctness, then use shorthand after the definition. "Red" can name a test that demonstrably fails on the bug once that meaning is established. Prefer a concise concrete instruction when shorthand would be ambiguous.

Prefer positive directions that state the desired behavior. Use targeted prohibitions when they clarify a real boundary or prevent an observed failure; pair them with what to do instead when useful. Negation is not inherently ineffective, and a positive paraphrase is not automatically clearer. Reserve absolute wording for actual invariants.

Keep examples when they resolve meaningful ambiguity about output shape, quotations, tool choice, or a tricky rule. Prefer one complete example over many routine variants. Expressive tool interfaces and typed parameters can replace routine usage examples. Favor executable tests, reference implementations, inspectable artifacts, and rubrics when they express the requirement more precisely than prose.

## Tools, evidence, and reporting

Put tool mechanics in tool descriptions: purpose, trigger, inputs, meaningful results, and failure behavior. Instructions should supply task-specific routing and evidence requirements without copying the tool contract.

- Identify which claims require retrieval or validation and what counts as sufficient evidence. Require fresh verification for unfamiliar or changing facts where correctness depends on their current state. Distinguish supported facts, inference, and unresolved uncertainty.
- Request independent tool calls together when supported; keep dependencies sequential. Use bounded retry/fallback and stopping rules where needed.
- Specify useful progress updates for long tasks and a self-contained final answer covering results, relevant validation, and unresolved issues. Ground status claims in observed evidence. Account for whether the user can see tool output.
- Request direct, literal prose and enough structure for the content. Use paragraphs, headings, lists, or tables when they improve comprehension; avoid blanket formatting rules. Preserve essential evidence and limitations when asking for brevity.
- For continuation summaries, preserve user decisions, constraints, permissions, completed and unresolved work, rejected approaches and reasons, and hard-to-reconstruct identifiers or evidence. Condense explanations more aggressively than requirements. Explain continuation rather than using context countdowns that encourage premature stopping.

## Pruning and model-specific tuning

Keep each rule in one **authoritative source** so behavior changes require one edit. Tool contracts belong with tools; shared policy belongs in shared instructions. Repeating a defined term is useful; copying its definition into every section usually is not.

Distinguish duplicate authorship from deliberate runtime reminders. A repeated reminder generated from one source can be appropriate for an observed model-specific failure, such as Fable serializing independent tool calls. Keep it scoped to that failure and follow the model's history rules; do not make repetitive reminders the default for both models.

The **environment** is a source of truth too: scripts, configuration, directory layout, and command help. Restating a cheap lookup creates a stale cache. Document non-obvious conventions, reasons, and gotchas; cache discoverable facts only when the lookup cost warrants it. Keep durable memory focused on corrections and lessons absent from the repository, and remove duplicate or wrong notes.

Prune instructions that are irrelevant, stale, or ineffective. An instruction is a **no-op** only relative to the target models and task: determine whether it changes behavior through representative runs, not an assumption about capability. A rule useful for one model may be unnecessary or harmful for another. Retain useful shared guidance or disclose the model-specific branch.

When validating a change, inspect representative cases against the intended outcome, scope, authorization, evidence, and stopping conditions. Fix missing context and contradictory rules before adding instructions or raising effort. Change one intervention at a time when practical; compare completion, correctness, unnecessary questions or work, latency, and cost. Report the limits of validation; file checks alone do not establish behavior on both models.
