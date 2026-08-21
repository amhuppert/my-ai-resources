---
name: agent-feedback-tiers
description: Define a three-tier feedback vocabulary — hint, reminders,
  instruction — for steering agents from tool output, with strict tier contracts
  and an evidence-gated admission rule for reminders. Use when designing tool
  output that guides agents, adding hints or reminders to a CLI or tool,
  deciding where mid-flow guidance belongs, or reviewing whether guidance text
  is in the right tier.
---

# Agent Feedback Tiers

Tool output is the highest-recency channel you have into an agent's decision-making — guidance delivered at the moment of action beats a system prompt read thousands of tokens ago. That power only survives if the vocabulary is small, the obligations per tier are crisp, and admission to the channel is rationed. This skill defines the three-tier contract and the rules that keep it from decaying into noise.

## The tier table

Command output (not just help) carries up to three guidance tiers with distinct agent obligations:

| Tier | Field | Semantics | Agent obligation |
|---|---|---|---|
| Hint | `hint?: string` | Advisory next step | Ignorable by contract |
| Reminders | `reminders?: string[]` | Invariants that stay binding while work continues | Keep true; not an action |
| Instruction | `instruction?: string` | Do this specific thing now | Obey before anything else |

The distinctions that matter:

- A **hint** is a likely next step the agent may skip with zero risk.
- A **reminder** is not an action — it is a constraint to keep true while continuing ("this workflow is halted; do not continue task work", "you have N of M iterations left").
- An **instruction** is load-bearing protocol: end your turn now, stop after this, do X before anything else.

## Rendering and envelope

Fixed render order in text mode: **primary output → detail/issue lines → `reminder:` lines → `hint:` line.** The most load-bearing content comes first; the ignorable tier comes last.

All three tiers are also carried in the structured `--json` envelope (`hint`, `reminders`, `instruction` fields alongside `error`/`issues`/`code`). Structured callers get the same guidance as text callers — tier content is never text-mode-only.

## Tier misuse is a review-blocking defect

The value of the vocabulary is the crispness of its contract. The moment something load-bearing appears in the ignorable tier, every tier's contract collapses: agents learn that the advisory channel sometimes matters, which means they can no longer safely skim it — and the whole point of a contractually-ignorable tier is that it can be skimmed.

Review rules, enforced as blocking:

- **Nothing load-bearing in `hint`.** End-turn messages, stop conditions, halt reasons are primary output or `instruction`, never demoted into a hint.
- **Nothing actionable-now in `reminders`.** A "do this now" in the keep-true tier is an instruction wearing the wrong badge.
- Protocol gets its own field. An agent must be able to ignore `hint` with no consequence, always.

Rejected alternatives worth knowing: overloading `hint` for everything destroys its ignorable-by-contract property; a single `messages[]` with severity levels is a weaker contract that invites misuse.

## Chained hints as a discovery surface

A one-line hint at the end of output turns a multi-step flow into a self-chaining one:

- `validate` succeeds → "valid — create it with `yourcli thing create --file payload.json`"
- `create` succeeds → "created <id> — start it with `yourcli thing start <id>`"
- read commands remind the agent of sibling verbs (list → how to register/delete)
- query commands chain the zoom-in: a `list` that omitted detail hints the drill-down (`show <id>`) or the narrowing flag (`--status failed`) — see `query-output-disclosure`

Discipline for hint authorship:

- One line, ~25 words max, imperative.
- Only where a likely next action exists. A hint is a pointer, not documentation — detail lives in the skill doc.
- Terminal actions get no hint (a notification send has no next step).
- Hints are authored next to command definitions, so hint text cannot name commands that don't exist; the server sends facts, never client verb names.

Hints are the **third discovery layer**: a one-line system-prompt nudge gets the agent to the skill doc, the skill doc gets it to the first command, and hints keep it on rails mid-flow without reloading anything.

## The reminder admission rule

The reminder channel's power comes from scarcity. A reminder ships only when **all four** hold:

1. **Earned by an observed failure.** It cites a real incident, audit finding, or bug — never a speculated risk. If you cannot point at the failure it prevents, it does not ship.
2. **State-conditional.** It fires from a runtime-state predicate (iterations remaining ≤ 2, a halt is active, a retry count crossed a threshold) — not unconditionally on a command. An always-on reminder is skill or system-prompt content in the wrong place.
3. **Tier-true.** It is genuinely violable *after* this command succeeds. If it must happen now, it is an instruction; if it is optional, it is a hint.
4. **Capped.** ≤ 2 reminders per response, priority-ordered.

Expanding the rule set — more rules, or reminders on new command families — requires **measured post-hoc evidence** that the existing reminders reduce violations: compare protocol-violation classes (silent stalls, breaker trips, scope creep) across real runs before and after. Unrestricted authoring dilutes the channel until agents tune it out; scarcity is the mechanism.

## Author guidance where the state lives

Whichever layer can see runtime state computes the guidance; the layer the agent talks to only renders it.

- The server authors reminders via a **pure rule engine**: `input → string[]`, directly unit-testable with no mocks — predicate boundaries, the ≤2 cap, and verb filtering all as plain function tests.
- Each rule carries a **required `evidence` field** pointing at the observed failure that earned it. A rule without evidence does not compile past review.
- Rule firings are **logged** (which rule ids fired, for which context) so effectiveness can be analyzed later — this is what makes the "measure before expanding" requirement enforceable.
- The client is a dumb renderer. It never authors reminders: client-side static reminders sit at the wrong layer, cannot see state, and require redistribution to tune.

## Why this works

**Recency beats system-prompt distance.** An invariant reinforced at the decision point — in the output of the command the agent just ran, immediately before its next action — reliably outperforms the same invariant stated thousands of tokens earlier. That is the justification for a mid-flow guidance channel.

It is also the reason the channel must be rationed: the same recency that makes it powerful makes it easy to abuse into ambient noise. Every unearned reminder taxes every future reminder's credibility. Scarcity is not a style preference; it is what keeps the channel working.

The same scarcity rule governs explanatory text. A one-line rationale attached to a **refusal** is well spent — it lands where the agent is forming a belief about whether your constraint is worth respecting (`designed-friction`). The identical sentence printed on **success** is noise, and noise trains skimming: an agent that learns your output contains skippable text starts skipping, including the refusal text you needed it to read. Rationale earns its place at the moment a restriction is encountered, nowhere else.

## Anti-patterns

- **Protocol in a hint.** "hint: remember to end your turn" — the agent is contractually allowed to ignore it, and eventually will.
- **Actions in reminders.** "reminder: run the tests now" is an instruction mislabeled; it teaches agents reminders are commands.
- **Always-on reminders.** Unconditional per-command text belongs in a skill or system prompt; in the reminder tier it is noise that erodes the state-conditional signal.
- **Speculative reminders.** "Agents might forget X" is not evidence. Wait for the incident.
- **Uncapped reminder lists.** Five reminders per response is a wall of text no tier contract survives.
- **Client-authored reminders.** The renderer cannot see state; guessing at state from the client produces wrong-context guidance.
- **Hints as documentation.** Multi-line hints explaining concepts duplicate the skill doc and bloat every invocation.
- **Hints naming nonexistent commands.** Author hints beside command definitions so the vocabulary cannot skew from the real surface.

## Related skills

- `cli-tools-for-agents` — design a project CLI as the agent tool surface: exit codes, file payloads, jobs, doctor
- `progressive-disclosure-tooling` — help as a navigable disclosure graph derived from one typed registry
- `query-output-disclosure` — bounded query output whose zoom-in suggestions ride the hint tier
- `earned-guidance-docs` — write agent guidance only when earned by real failures; root contract plus read-on-demand docs
- `designed-friction` — one-line rationale at the point of refusal, and why the same sentence on success is noise
