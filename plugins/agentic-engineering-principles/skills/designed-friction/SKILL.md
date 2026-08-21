---
name: designed-friction
description: Make a tool's deliberate constraints legible to agents — one-line
  rationale at the point of refusal, mechanisms stated where a wrong inference
  is invited, both sides of a ledger reported, and a published taxonomy of which
  friction is the product versus which is a defect. Use when agents work around
  or lobby against a constraint you intend to keep, when a tool refuses actions
  without saying why, when agents avoid a permitted action they have mis-priced,
  when designing refusal and status output, or when deciding what an agent
  should report as a bug versus absorb as the design.
---

# Designed Friction

A tool that constrains an agent teaches it two things: what is blocked, and — implicitly — whether the block is worth respecting. Most tools only say the first. An agent that cannot distinguish a deliberate constraint from an accident treats both as obstacles, and routes around whichever it can.

This skill is the complement to `mechanical-guardrails`. That skill makes a constraint unbreakable; this one makes it un-resented. A guardrail an agent does not understand is a guardrail it will argue against, work around at the edges, or — given the authority — reconfigure.

## Output teaches a model, whether or not you intended it

An agent builds its model of your system almost entirely from your system's output. That model then drives behaviour for the rest of the session. So output can be **entirely accurate and still teach something false**, through what it chooses to foreground.

In one real design, a gated-transition refusal read *"item R5 needs a valid approval for `<revision-id>`"*. Every word was true. But naming the revision an approval was bound to invited an obvious inference: approvals are scoped to a revision, so reopening the document destroys them. In fact approvals were scoped to individual elements and carried forward across revisions untouched — the exact opposite of what the message taught. The agent operated on the wrong model for an entire session.

> **State the mechanism where the wrong inference is invited, not only where it is catalogued.**

Documenting the true behaviour elsewhere does not help. The agent is not reading the reference at the moment it forms the belief; it is reading the refusal. Correctness lives at the point of inference.

### Report both sides of a ledger

The same design also listed only what remained outstanding: *"11 pending of 18"*. An agent reads that as **7 lost**, not 7 banked. Progress output that reports only the deficit systematically under-reports progress, and an agent that believes it is losing ground behaves differently from one that knows it is 60% done.

Where a command reports outstanding work against a total, report the satisfied side too, and name why the remainder is outstanding:

```
approvals: 12 carried, 6 pending (content changed since last approval)
```

That one line states the mechanism (approvals carry), the position (12 done), and the reason for the remainder — replacing a list of failures with a progress report.

## Mis-priced sanctioned actions get avoided, silently

The most dangerous wrong belief is not about what is forbidden. It is about what is **expensive**.

An agent that believes a permitted action is costly stops taking it, and — this is what makes the failure mode hard — never says so. There is no error, no complaint, no refusal in the logs. There is only absence: a path the design intended to be routine that quietly goes unused.

In the design above, believing that reopening a document destroyed a human's approvals made the agent reluctant to reopen it. It framed every legitimate correction as expensive to the human, apologised for iterations that cost nothing, and hesitated over cheap, sanctioned edits. The constraint it was respecting did not exist.

The general shape, which recurs well beyond gated documents:

- An agent that thinks interrupting is costly stops asking clarifying questions and guesses instead.
- An agent that assumes a test suite is slow stops re-running it and ships unverified.
- An agent that reads `revert` as destructive works forward through a bad change instead of backing out.

> **A wrong cost model suppresses a sanctioned path as effectively as a prohibition, and leaves no trace.**

Wherever your design *wants* an agent to use an action freely — reopen, retry, revert, ask, re-validate — state its true cost at the decision point. Cheapness is a feature agents will not assume.

## A constraint without a stated reason is a constraint under negotiation

A refusal that names the correct alternative but not the reason for the restriction teaches the agent that the restriction is incidental. Agents are built to find paths around obstacles; an obstacle with no stated purpose reads as one.

In one real system, a staged authoring tool refused design content until requirements were settled. The refusal named the correct surface to use instead — helpful, and still insufficient. The agent inferred the boundary was an implementation artifact and spent a substantial part of a review report arguing to weaken it. The argument dissolved the moment a human supplied a single sentence of reasoning: the boundary exists so the design cannot shape the requirements around itself. Had the agent held authority over that setting, a well-meaning version of it would have reconfigured the constraint rather than merely complaining about it.

That escalation is the point:

| Agent's authority | What an unexplained constraint produces |
|---|---|
| None | Complaint in a report; wasted analysis |
| Local | Workarounds at the edges; the constraint under-used |
| Configuration | The constraint removed, sincerely, as an improvement |

One sentence prevents all three. Add a `why:` to every refusal that enforces a **designed** constraint:

```
stage_blocked: decisions belong to the design stage — author them there.
  why: requirements settle before design so the design cannot shape the
       requirements around itself.
```

### Assert the value; do not apologise

*"This is deliberate: X"* and *"unfortunately you have to wait"* produce different agents. The first recruits the agent into the intent and gives it a reason to defend the constraint. The second concedes the constraint is a cost, which invites the agent to look for a way to avoid paying it.

## Where rationale goes — and where it must not

Rationale is expensive text. Site it where a restriction is *encountered*, not where it is catalogued, and cap it at one sentence.

1. **Typed refusals — highest leverage.** This is where the belief forms. Every refusal enforcing a designed constraint carries a one-line `why`.
2. **Command help `context:` blocks — for the constraints an agent meets before tripping them.** Explain the shape of the rule, not just its existence.
3. **The skill doc — for the taxonomy**, not per-command rationale.
4. **Never on the happy path.** Rationale printed on success is noise, and **noise trains skimming**. An agent that learns your output contains skippable text starts skipping — including the refusal text you needed it to read. This is the same scarcity argument that rations the reminder channel in `agent-feedback-tiers`, applied to explanatory text.

## Publish which friction is the product

The most useful thing you can hand an agent is not more procedure but a **classification**, so it can tell your design from your defects without being corrected.

Ship a short taxonomy in the tool's skill doc:

**Designed friction — absorb it, do not route around it, do not report it as a bug.** Typically: gated transitions, staged write boundaries, human-only acts, immutability of approved artifacts, refusals that protect an audit trail, validation that rejects unverifiable claims.

**Incidental friction — report it, do not design around it.** Typically: reads that answer from the wrong state, output that truncates silently, missing verbs, messages that mislead, two-step sequences that should be one.

> **The heuristic for the ambiguous middle: if the friction protects a human judgement or an audit property, it is designed. If it is a read path, a message, or a missing verb, it is a defect.**

**One friction can be both, and the taxonomy has to say so.** When a gate can only be discharged by a human act, the human-only boundary is designed — but if no surface exposes that act, the missing affordance is a defect sitting behind it. An agent told only that human-only acts are designed friction will dutifully absorb a deadlock and report nothing; an agent told only that missing verbs are defects will report the boundary itself. Classify the layers separately: absorb the boundary, report the surface. The other half of this contract — that a blocking rule must have a remedy reachable on *some* surface — is a guardrail-design rule, in `mechanical-guardrails`.

What this buys: agents spend their reporting effort on real defects instead of on constraints you would defend, and their retrospectives arrive pre-sorted. An agent without the taxonomy produces reports where the two are mixed, and a human has to separate them every time.

## Anti-patterns

- **Refusing without a reason.** Naming the correct alternative is necessary and not sufficient; an unexplained constraint is one the agent will negotiate with.
- **Accurate output that foregrounds the wrong mechanism.** Technically-true messages that seed a false model are a defect class, not a wording preference.
- **Deficit-only progress reporting.** "N pending" with no satisfied count reads as loss and changes behaviour.
- **Leaving a cheap action to look expensive.** Silence about cost is not neutral; agents assume expense and quietly stop using the path.
- **Apologetic constraint language.** Framing a deliberate boundary as an unfortunate cost invites workarounds.
- **Rationale on success output.** Explanation where nothing went wrong trains agents to skim the channel you need them to read.
- **An unpublished designed-versus-defect boundary.** Without it, every agent re-derives the line, and gets it wrong in both directions.

## Related skills

- `mechanical-guardrails` — make a constraint structurally unbreakable; this skill makes it understood
- `agent-feedback-tiers` — hint/reminder/instruction tiers and the scarcity rule that keeps a guidance channel credible
- `cli-tools-for-agents` — exit codes, structured errors, preflight verbs, and findings named by the transition they block
- `agent-retrospectives` — how to read what agents report about friction, and separate a wrong model from a real defect
- `earned-guidance-docs` — write guidance only once it has bitten
