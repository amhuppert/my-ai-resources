---
name: writing-for-frontier-agents
description: "Write or review agent instructions: skills, AGENTS.md, CLAUDE.md, system prompts, and reference docs consumed by agents."
---

# Writing for frontier agents

Write instructions that get reliable results while leaving routine implementation choices to the agent. Unless the user targets a specific model, write for **both Claude Fable and GPT-6 Astra**. Respect the user's scope and existing authorization: an assessment request asks for findings, while an implementation request authorizes the changes.

## Choose references by need

Use the shared guidance below by default. Load a reference only for a model-specific decision or a failure you are diagnosing:

| Need | Reference |
| --- | --- |
| Skill frontmatter, invocation policy, or splitting skills | [Skill mechanics](references/skill-mechanics.md) |
| Differences between Fable and Astra, or porting prompts between them | [Fable/Astra comparison](references/fable-astra-prompting-comparison.md) |
| Fable-specific behavior, fixes, or API settings | [Fable prompting guide](references/fable-prompting-guide.md) |
| Astra-specific behavior, fixes, or API settings | [Astra prompting guide](references/gpt-6-astra-prompting-guide.md) |
| Instructions targeting GPT-5.6 Sol, Terra, or Luna | [GPT-5.6 prompting guide](references/gpt-5.6-sol-prompting-guide.md) |

Treat the model guides as dated references, not checklists to copy into every prompt. In shared instructions, keep compatible rules and call out model-specific exceptions explicitly. API parameters, history handling, compaction, and UI display live in the application layer; prose alone cannot enforce them. Verify current provider docs before relying on version-sensitive API details.

## Outcomes, constraints, and completion

State the goal, audience, why it matters, relevant context, constraints, evidence requirements, and what must be true before finishing. Explain reasons when they help the agent handle edge cases. Specify observable outcomes instead of scripting routine steps.

Use an ordered procedure only when dependencies or operational invariants require a sequence. Otherwise let the agent pick its path. A document can mix steps and reference rules; reproducibility means meeting the same acceptance bar, not following identical keystrokes.

Make completion criteria **checkable** and **exhaustive within scope**:

- **Clarity:** name the evidence separating done from not done. Replace "understand the system" with the exact facts or decisions needed next.
- **Demand:** require coverage of every requested item or applicable rule without expanding scope. "Every modified model accounted for" sets a real bar; "produce a change list" does not.
- **Stopping condition:** state what retrieval and validation are sufficient. Once required checks pass, widen or repeat them only for new edits, failures, or unresolved concerns. Keep edits and permanent tests proportional to the change and repository norms.

When runs come up short, sharpen the missing requirement, evidence bar, or stopping rule. Swapping "thorough" for "relentless" turns up the volume without defining success.

Visible later steps can tempt an agent to rush through a fuzzy earlier step. Tighten the earlier step's completion bar first. Split a workflow across a real context boundary (a handoff or subagent dispatch) only when the boundary is irreducibly fuzzy and observed runs still rush. An inline link does not hide later steps already sitting in context. Carry the overall goal and constraints across any split.

## Collaboration and authority

Keep tone separate from rules about acting, asking, continuing, and stopping:

- Separate assessment from implementation. Treat clear requests like "can you fix..." as action requests, and use prior context and existing authorization for routine next steps.
- Ask only when a missing answer materially changes the result and cannot be inferred. Continue independent work while waiting only when the host supports it. For unattended runs, state what to do when no human can answer.
- Put permission rules in one authoritative place. Prepare authorized, reviewable work before an approval boundary; skills should not invent extra approval gates.
- State that explicit user instructions override skill guidelines within the host's instruction hierarchy, while higher-priority system/developer rules and tool permissions still hold. If a file forces a pause or scope change, cite the exact file and line and distinguish an explicit rule from your own interpretation.
- Add delegation rules only when the host supports subagents: bounded independent tasks, clear context and deliverables, review of returned work, and useful lead-agent work in parallel.

## Context pointers and the two loads

A **context pointer** names external material and says when to load it. Skill descriptions and doc links in `AGENTS.md` both work this way, and their wording decides whether the agent ever opens the file.

- State what the file does and the distinct situations that trigger reading it. Put the recognizable concept first, collapse synonyms for the same case, and skip details already obvious from the target name.
- When agents miss needed material, sharpen the pointer trigger before inlining the content. Inline only the essential rule if sharper triggers still fail.
- Separate **context load** (always-loaded instructions and skill descriptions paid on every turn) from **human cognitive load** (requiring users to remember which files or commands exist and when to invoke them). Spend human load where human judgment matters; remove avoidable discovery work everywhere else.

Material behind a pointer avoids always-loaded cost, though it still spends attention once opened. Material with no discoverable pointer relies entirely on the user to supply it.

## Information hierarchy and splitting

Put content where it pays its way:

1. **In-file actions and core constraints:** everything the shared path requires, ordered only where sequence matters.
2. **In-file reference:** nearby rules and definitions needed to execute the task (a flat set of peer rules works well for review or reference docs).
3. **Disclosed reference:** separate files for deep branch-specific detail.

Use **progressive disclosure** to keep the shared path scannable: inline what every run needs and link what only specific branches need. Hiding essential constraints behind a link hurts reliability; burying steps under unrelated reference does too.

Use **co-location** inside each file: keep a concept's definition, rules, and caveats together. Avoid scattering one rule across sections or repeating it in multiple places.

**Sprawl** happens even when every line is unique and accurate. Split by branch when different paths need different references; split by sequence only when the premature-completion problem above proves it necessary; split by invocation only when independent discovery earns the extra context or human load (see [Skill mechanics](references/skill-mechanics.md)).

## Precise language and examples

Use established, compact terms as **leading words** when they reliably name a known behavior, and reuse the exact same term across pointers, prompts, and body text. Define any newly coined term before using it; a made-up phrase carries no prior meaning on its own.

Keep every real requirement when tightening prose. "Tight loop" does not automatically convey "fast, deterministic, low-overhead." Spell out the properties that affect correctness first, then use shorthand afterward ("red" works once defined as a test that demonstrably fails on the bug). When shorthand stays ambiguous, write the concrete instruction.

Default to positive instructions stating what you want. Use targeted prohibitions to mark real boundaries or block observed failures, paired with the alternative when helpful. Negation is not inherently broken, and positive phrasing is not automatically clearer. Save absolute words ("never", "always") for genuine invariants.

Keep examples when they settle real ambiguity about output shape, quotation style, tool choice, or tricky edge cases. One complete example beats five routine variations. Clear tool interfaces and typed schemas replace routine usage snippets. Prefer executable tests, reference code, inspectable artifacts, and rubrics whenever they express a rule more cleanly than prose.

## Tools, evidence, and reporting

Tool contracts belong in tool descriptions: purpose, trigger, inputs, meaningful outputs, and failure modes. Task instructions should specify routing and evidence standards without repeating the tool schema.

- State which claims require retrieval or verification and what counts as sufficient proof. Require fresh checks for unfamiliar or changing facts. Separate verified facts, inference, and open uncertainty.
- Ask for parallel independent tool calls when supported; keep dependent steps sequential. Add bounded retry, fallback, and stopping rules where failures are plausible.
- Define useful progress updates for long runs and a self-contained final answer covering outcomes, validation performed, and unresolved issues. Ground every status claim in observed output, and account for whether the user sees raw tool output.
- Ask for direct, plain prose with structure matched to the content (paragraphs, headings, lists, or tables where they clarify). Skip blanket formatting bans, and never trade away evidence or caveats just to sound brief.
- For continuation summaries, keep user decisions, constraints, permissions, completed vs. remaining work, rejected approaches with reasons, and hard-to-reconstruct identifiers or evidence. Trim explanations much harder than requirements. Explain how continuation works instead of adding context countdowns that nudge premature stopping.

## Pruning and model-specific tuning

Keep every rule in one **authoritative source** so policy edits happen in one place. Tool mechanics stay with tools; shared rules stay in shared docs. Reusing a defined term is good; pasting its definition into three sections is not.

Do not confuse duplicate authorship with an intentional runtime reminder. A single-source reminder injected at runtime can fix a documented model quirk (such as Fable serializing independent tool calls), provided it stays scoped to that failure and obeys the model's history rules. Do not bake repetitive reminders into shared defaults for both models.

Treat the **environment** itself (scripts, configs, directory layout, `--help`) as a source of truth. Copying cheap lookups into prose creates stale caches. Document non-obvious conventions, rationale, and gotchas; cache discoverable facts only when lookup cost is genuinely high. Keep durable memory focused on corrections missing from the repo, and prune stale or duplicate notes.

Cut instructions that are stale, irrelevant, or ineffective. Whether a rule is a **no-op** depends on the target models and task: check on representative runs instead of guessing from assumptions about capability. A rule that helps one model may waste tokens or misfire on another. Keep shared guidance compatible or disclose model-specific branches.

Validate edits against representative tasks for outcome quality, scope discipline, authorization, evidence, and stopping behavior. Fix missing context and conflicting rules before piling on more prompt text or raising reasoning effort. Change one variable at a time when practical, comparing completion, accuracy, unnecessary questions or edits, latency, and cost. Report validation limits honestly: inspecting files alone does not prove behavior on both models.
