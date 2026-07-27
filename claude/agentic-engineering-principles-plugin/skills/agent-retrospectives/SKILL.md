---
name: agent-retrospectives
description: Run structured retrospectives on any agent setup — instructions (AGENTS.md, CLAUDE.md, system prompts), skills, slash commands, workflows, processes, and tooling — after real use, mining finished runs for durable improvements. Covers the quality → cost → speed review order, deterministic extraction before judgment, spot-checking agent self-reports, and routing every finding to a concrete owner. Use when asked for a "retrospective on how the agent did", "post-mortem on this run", "improve my CLAUDE.md from this session", "audit how the workflow performed", or after rolling out new instructions, skills, or tooling and wanting to know what to change.
---

# Agent Retrospectives

Every substantive stretch of agent-assisted work is an auditable artifact — not just formal orchestration runs, but any session where an agent worked under your instructions, skills, and tooling. The trigger for this skill: you just finished such a stretch, or rolled out new instructions/skills/tooling, and want to mine the experience for durable improvements rather than vague impressions. A retrospective that produces no change to an instruction file, skill, tool, or process was a reading exercise, not a retrospective.

## Review in priority order: quality → cost → speed

Answer three questions, in this order — do not let a cheap-and-fast run excuse a wrong one:

1. **Quality.** Did the work meet intent? Where did the agent stall, deviate from the plan, or need rescuing? What silently degraded output (context pressure, compaction, ignored truncations)?
2. **Cost.** What did it cost in tokens/dollars, and where was spend wasted — churn, re-derivation of things already written down, oversized contexts, repeated failing commands?
3. **Speed.** Wall clock vs. agent time vs. waiting. What serialized or sat idle that didn't need to?

## Always report what worked

An audit that only lists problems is half an audit. Improvements need to know what to **preserve** — which instructions were followed cleanly, which skills triggered correctly, which decompositions produced first-try passes. Include a "what worked (preserve these)" section with mechanism → evidence pairs, or the next revision will churn the parts that were fine.

## Route every finding to a concrete owner

A finding without an owner changes nothing. For each finding, name the surface that will absorb the fix:

- **An instruction file** — root contract (AGENTS.md / CLAUDE.md), system prompt, or a read-on-demand doc.
- **A skill** — new rule, sharper trigger description, added failure mode.
- **A tool or CLI change** — better exit codes, a validate verb, a guardrail.
- **A process/workflow change** — different decomposition, added gate, changed review step.
- **Config** — budgets, limits, model/effort defaults.

If a finding fits no owner, either generalize it until it does or drop it — "the agent should be more careful" is not a finding.

## Findings become earned guidance — the closed loop

The meta-pattern that makes retrospectives compound: each new rule, reminder, or gotcha **cites the incident that earned it** (see `earned-guidance-docs`). Retrospectives mine real runs for failure modes; failure modes become named rules in planning and instruction docs and invariants in tooling; the next run operates under the improved rules and is audited again. Guidance that cites its originating incident stays specific; guidance written from speculation reads as generic advice and gets ignored.

## Method: deterministic extraction first, judgment second

When telemetry exists — transcripts, logs, cost data — run mechanical tallies **before** reading anything qualitative:

- Count turns, tool calls by name, errored calls, repeated commands, re-read files, cost per conversation.
- Let the flags decide which expensive artifacts deserve a deep read. Do not hand-tally what a script already computes, and do not deep-read transcripts the numbers say were healthy.
- Keep extraction read-only; never open a live datastore through a path that mutates it on connect.

When no telemetry exists, say so — and treat "we could not measure this" as a finding about the tooling.

## Every published number traces to primary telemetry

A subagent's deep-read summary is a **hypothesis, not a source**. In one real audit, two deep-read agents returned quantifications — a per-iteration dollar split and an errored-call count — that failed verification against the mechanical extractor. Rules:

- Before a number ships in a report, re-derive it from the primary source (logs, DB rows, transcript tallies) — or drop it.
- Label floors and inconclusive figures explicitly ("cost total is a floor: N conversations had no cost row").
- Never average, split, or extrapolate a figure the telemetry cannot actually attribute.

## Agent self-reports are claims to spot-check, not evidence

Iteration summaries, handoff notes, and completion messages overstate. A handoff claiming "independent reviewer APPROVED" or "TDD'd failing-test-first" is only true if the transcript shows the reviewer invocation or the RED test run. Spot-check specifically the claims the success verdict leaned on — those are the ones that were load-bearing and the ones most likely to have been asserted rather than done.

## When a reviewer rejected work, ask whether the criterion was wrong

For every rejection or NO-GO, read both the verdict **and** what followed:

- Was the finding real, or did the validator faithfully enforce a wrong or ambiguous acceptance criterion? A validator correctly enforcing a bad spec is a **planning/instruction defect, not an agent failure** — the fix belongs in the guidance, not in pressuring the implementer.
- Symmetrically: criterion-anchored review can pass work that is faithful-but-wrong. Judge the work product against **intent**, not just against the checklist it was graded on.

## Build a named failure-mode catalog

Over time, give recurring findings stable names, each mapped to a "where to dig next" and a canonical fix class. Generic starters that transfer to any agent setup:

| Failure mode | Signal | Canonical fix class |
|---|---|---|
| Context-window pressure | High occupancy; quality degrades silently near the limit | Split the work into smaller units |
| Prompt growth | Instructions/feedback accumulate across iterations instead of resolving | Resolve feedback into the artifact; don't re-inject verbatim |
| Structured-output parse fallback | Output needed fenced-JSON/raw salvage | Fix the output contract or schema |
| Unexplained stall gap | Wall time covered by no known activity | Instrument the orchestration dead air |
| Hung/silent turn | Long stretch with zero events | Liveness watchdog; treat as a reliability incident, not labor |
| Scratch debris in commits | Temp files/logs shipped in the final change | Hygiene gate before publish |

State the catalog's limits explicitly, and hand-check outliers no detector ranks: an iteration far longer than its siblings, an extreme cost-per-turn ratio, a file re-read ten times.

## Classify time by cause

When analyzing slowness, bucket every wall-clock gap by **cause** — agent work, human wait, tooling/validation wait, dead air — so only the unexplained residual counts as process overhead. Long agent-work gaps can be normal; unexplained ones are the problem. Measure operator recovery time (halted → resumed) as its own metric: in one real case, runs with hours of halted-waiting-for-operator time reported **zero** human wait until recovery time was measured separately. A category you don't measure reports as zero.

## Delegating expensive reading

Artifacts too large for your context (multi-thousand-line transcripts) go to subagents with a strict, citation-enforcing brief:

- Read-only; tally mechanically first (entries by type, tool calls by name, errors, repeated commands), then classify.
- Classify waste vs. legitimate spend, with one-line evidence per finding.
- Bounded output size (e.g. 40–60 lines).
- **Every numeric claim cites the entry range or tally it came from — unattributed numbers get dropped.**

Run one subagent per hotspot, in parallel, and verify any number you republish (see above).

## Anti-patterns

- **Problems-only reports.** Nothing marked "preserve" means the next revision churns what worked.
- **Ownerless findings.** Observations that name no instruction file, skill, tool, or process change.
- **Trusting the summary layer.** Publishing a subagent's or the agent's own numbers without re-deriving them.
- **Reading before counting.** Deep-reading transcripts chosen by gut instead of by mechanical flags.
- **Blaming the agent for a guidance defect.** Punishing faithful enforcement of a bad criterion instead of fixing the criterion.
- **Unlabeled floors.** Shipping a total that silently omits unmeasured spend or time.
- **One-off insights.** Fixing the incident without naming the failure mode, so the next occurrence starts from zero.

## Related skills

- `earned-guidance-docs` — write agent guidance only when earned by real failures; root contract plus read-on-demand docs
- `agent-feedback-tiers` — hint/reminder/instruction output tiers and the reminder admission rule
- `logging-for-agent-debugging` — structured logs agents can debug from: stable event names, trace context, bounded analysis
- `live-system-verification` — verify features against the running system and durable state, not fakes or UI
