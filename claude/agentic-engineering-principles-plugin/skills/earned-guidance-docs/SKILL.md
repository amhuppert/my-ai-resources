---
name: earned-guidance-docs
description: >-
  Applies an evidence-earned discipline to agent-facing documentation — a durable rule is written down only after it has bitten, and historical rationale lives in a dated lessons log rather than in code comments. Also covers instruction architecture: a small tool-agnostic root contract plus read-on-demand reference docs treated as persistent project memory with a drift-sync lifecycle. Use when setting up AGENTS.md or CLAUDE.md, when an instruction file keeps growing, when starting a lessons file such as PERFORMANCE.md, when deciding whether a rule has earned a place in agent guidance, or when agents appear to ignore instructions because the document is full of speculative advice.
---

# Earned Guidance Docs

Agent-facing documentation fails in two directions: it fills with advice nobody verified, and it grows until no agent reads it carefully. Both failures are structural, and both have fixes. This skill covers the admission rule that keeps a guidance document's signal high, and the architecture that keeps the always-loaded part small while everything else stays one hop away.

## Part A — the earned-claim rule

A guidance claim may be written down only once it has bitten.

Every durable rule cites a real incident, failure, or audit finding — never a speculated risk. The test is concrete: point at the failure. If you cannot name the run, bug, outage, review finding, or audit number that produced the rule, it does not ship.

Speculative advice is what destroys a guidance document's signal for agents. An agent cannot tell an earned rule from an imagined one, so it discounts them uniformly: the ten rules that would have prevented real outages get read at exactly the weight of the twenty someone thought sounded prudent. Every unearned line taxes the credibility of every earned line in the same file.

What this rules out:

- "It would be good practice to…" with no incident behind it.
- Advice imported wholesale from another project's style guide.
- Rules that restate what a linter, formatter, or type checker already enforces.
- Pre-emptive warnings about a mistake nobody has made here yet.

What it admits:

- A symptom you can date.
- An audit finding with a number attached.
- A bug with a reproduction and a fix.
- A recurring failure someone had to explain more than once.

## The durable lessons file

Maintain one durable log — `PERFORMANCE.md`, `LESSONS.md`, or one per axis (performance, reliability, agent behavior) once a single file gets long. Each file has three parts.

**A header that states the contract.** Say what the file is, when to add to it, and the reciprocal obligation:

> Keep this file updated. When you fix a real problem in this area, add an entry. When you write new code in an area covered by a pattern below, follow it. If you find yourself violating a pattern, stop and ask why — the pattern was written because the alternative bit us.

That last sentence does real work. It converts the file from passive reference into a decision checkpoint, and it gives an agent a sanctioned move — ask — instead of a silent deviation.

**A "patterns to follow" section.** The currently binding rules, in present tense, describing how the code works now. A pattern is promoted here once its lesson has recurred or once it governs new work.

**A "resolved issues" section.** Dated entries, newest first, one per real problem fixed. Fixed format:

- **Heading** — the date plus the symptom in one line, specific enough to grep for.
- **Symptom** — what was observed, with numbers where numbers exist. Not "it was slow"; "requests averaged N ms across M calls".
- **Root cause** — the mechanism, not the file. The sentence a future agent needs in order to recognize the same shape elsewhere.
- **Fix** — what changed, including what was deleted.
- **Verification** — how you know. Red→green: the test failed against the old behavior before it passed against the new one. An entry without verification is a guess with a date on it.
- **Lesson** — the transferable sentence. This is the part future agents actually read, so write it to travel: name the class of mistake, not the incident.

Add an entry when a real problem is **fixed** — not when a problem is noticed, and not when a risk is imagined.

## Keep historical rationale out of the code

Forbid comments that narrate the change:

- "now uses the focused accessor"
- "avoid the full read"
- "changed to fix the N+1"
- "no longer calls the old service"

Code documents its current state. *Why it isn't the old way* belongs in the durable log, where it is searchable, dated, and attached to its evidence. Without this rule, every fix leaves sediment — and future agents read sediment as active instruction. A comment saying "now uses X" is indistinguishable, three months later, from a directive to keep using X; eventually one of them references an API that no longer exists and an agent tries to honor it.

Comments that do belong: constraints, business reasons, and non-obvious edge cases — a reason the reader could not derive from the code itself.

Review checklist for any fix diff: does a new comment mention a previous version, a migration, a benchmark, or the word "now"? Move it into the lessons entry and delete it from the code.

## The same admission discipline at every guidance surface

The rule is not specific to lessons files. Every channel that injects guidance into an agent is rationed by the same logic, at a bar proportional to how often the agent is forced to read it.

| Surface | Admission rule | Cap |
|---|---|---|
| Runtime reminder in tool output | Earned by an observed failure, state-conditional, tier-true | ≤ 2 per response |
| Gotcha in the always-loaded root file | Added only after a real recurring failure it prevents or explains | Keep the root file readable in one sitting |
| Dated entry in the lessons file | Added when a real problem is fixed, with verification | Unbounded; it is append-only history |
| Pattern in a read-on-demand doc | Promoted when a lesson recurs or a decision needs one canonical owner | One owning doc per concern |

The scarcer the channel and the more often it is force-fed to the agent, the higher the bar. Runtime reminders are the scarcest, so they carry the strictest rule (see `agent-feedback-tiers`). The lessons file is the most permissive, because nothing loads it unless someone goes looking.

## Part B — instruction architecture

### The root contract

`AGENTS.md` holds only what every agent needs in every session:

- **Commands** — install, dev, test, single-test, typecheck, lint, build — plus where to run them from.
- **Safety rules** — which state is shared or live, what must not be touched, which operations require explicit human approval before use.
- **Canonical boundaries** — one line per architectural decision naming its single owner, each pointing at the doc that explains it.
- **Development process** — the testing contract, spec/approval gates, scope discipline.
- **A "read on demand" list** — every other doc, one line each.

Everything else moves out. The target: an agent can read the whole root file at the start of every session without regretting the tokens.

### Progressive disclosure for instructions

Instructions disclose exactly like tool help: a terse index at the root, richness at the leaves. Each read-on-demand doc gets one line in the root:

```
- <path> — <what it owns; when to read it>
```

The one-line description *is* the routing decision, so write triggers, not topics: "before changing persistence", "before adding a mutation, query hook, or server event", "before authoring or migrating UI". A description that says "covers the data layer" gives the agent nothing to route on.

State the reading rule in the root file itself: read only the task-relevant docs; do not load the whole directory into every turn.

### One owning document per concern

Every concern has exactly one owning document. The root holds a pointer, never a copy.

Duplicated guidance drifts, and when two files disagree an agent picks arbitrarily — often the wrong one, always with full confidence, because both are presented as authoritative.

Make the same-change rule explicit, as the last line of the root file: **when a command, path, or canonical boundary changes, update the root pointer and the owning document in the same change.**

### Patterns, not catalogs

Reference docs capture patterns that guide decisions — not catalogs of files, dependencies, exports, or routes.

The golden rule: *if new code follows an existing pattern, the doc should not need updating.* If adding a file requires a doc edit, you wrote a catalog.

- **Bad**: enumerate every file in the directory tree, every dependency with its version, every API route.
- **Good**: describe the organization pattern, give two examples, and state the rule for where a new one goes.

Catalogs are wrong twice: they go stale the day they are written, and they bloat every context they are loaded into. A stale catalog is worse than no catalog, because an agent will act on it.

### Reference docs as persistent project memory

Treat the doc set as project memory with a maintenance lifecycle, not as a one-time write.

**Bootstrap** — derive the initial docs from the codebase: purpose and capabilities; stack, versions, and the decisions behind them; structure, naming, and import conventions. Extract patterns rather than inventories. Present the result for human review and approval as source of truth.

**Sync** — periodically detect drift in *both* directions:

- A doc claims X but the code does Y → **warning**. Either the doc is stale or the code drifted from an intended rule; a human decides which.
- The code grew a pattern no doc describes → **update candidate**.
- A custom or domain-specific doc → check it is still relevant to code that still exists.

**Update additively.** Add, don't replace. Preserve human-written sections verbatim. When uncertain, report both states and ask rather than overwrite.

**Human customizations are sacred.** A sync pass proposes; it never silently deletes or rewrites a human-authored rule. An agent that rewrites the instruction file it was given has removed the only stable reference point in the loop.

Never write secrets, keys, or tokens into these documents — they are read into every relevant context by design.

### Tool-agnostic by design

Keep the shared engineering contract in a neutral `AGENTS.md`. Let each per-tool file (`CLAUDE.md` and its equivalents) import or reference the shared contract and add only tool-specific routing: which skills to load for which task, which browser or diagnostic tooling to use, which slash commands drive the workflow.

The test: if a claim is true regardless of which agent runs it, it belongs in the neutral file.

The payoff is that adding a second agent tool costs a small routing file instead of a fork of the entire contract — and a fork guarantees divergence, because nobody updates both halves.

## Checklist: before adding a line to a guidance doc

1. Can you name the incident, bug, or audit finding that earned it?
2. Is this the one owning document for that concern, or is it a copy?
3. Does it describe a pattern that survives new files, or is it a catalog entry?
4. If it belongs in the always-loaded root file, has it actually recurred — or is once enough to justify taxing every session?
5. Is it stated as a current-state rule, or does it narrate history that belongs in the lessons log?
6. Does the change also update the root pointer, if a command, path, or boundary moved?

## Anti-patterns

- **Speculative rules.** "Agents might forget X" is not evidence. Wait for the failure.
- **The root file as a dumping ground.** Every session pays for every line; a root file nobody finishes is a root file nobody follows.
- **The same guidance in two files.** They will disagree, and the agent will not know which one won.
- **Catalog documents.** Stale on write, expensive on every load, and confidently acted upon.
- **Historical rationale in code comments.** Sediment that future agents read as instruction.
- **Lessons entries without verification.** Undated claims and unproven fixes turn the log into folklore.
- **Sync passes that overwrite human edits.** Destroys the one part of the doc set with the highest signal.
- **One-line descriptions that name topics, not triggers.** The agent cannot route on "covers the data layer".
- **A per-tool fork of the whole contract.** Two copies, one maintainer, guaranteed drift.
- **Pointers left behind after a move.** A stale path in the root file trains agents to distrust every path in the root file.

## Related skills

- `agent-feedback-tiers` — hint/reminder/instruction output tiers and the reminder admission rule
- `agent-retrospectives` — reflect on agent instructions, skills, process, and tooling after real runs
- `mechanical-guardrails` — enforce conventions structurally with ratchets, tripwires, contract tests, and derived artifacts
