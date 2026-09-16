---
name: characterize-codebase
description: "Characterize what a codebase is built for: infer its design
  envelope from the mechanisms in the code, compare it with the operating
  envelope it actually faces, and report where the code is overbuilt or
  underbuilt."
---

# Characterize Codebase

Every mechanism in a codebase that is not domain logic exists to handle a **condition**: a kind of caller, a level of concurrency, a topology, a failure, a lifetime, a consumer, a volume. The set of conditions a system is built to handle is its **design envelope**. The set of conditions it actually faces in use is its **operating envelope**. Code is **overbuilt** where the design envelope is wider than the operating envelope (mechanisms for conditions that never occur) and **underbuilt** where the operating envelope reaches outside the design envelope (conditions that occur and nothing handles them).

Envelopes are regions, not ranks. A library and a local daemon can be equally intricate and sit in different regions: the library's envelope is wide on compatibility and trivial on topology, the daemon's the reverse. The question is which conditions the code is built for and whether those are the conditions it meets. The user runs this to learn what their code is built for, and to catch a tool built for conditions it never meets.

Read `references/envelope.md` before the survey. It defines the values of each dimension, the **archetypes** (named regions of envelope space), and the **mechanism catalog** the survey grades evidence against.

## Dimensions

| Dimension | Question the envelope answers |
|---|---|
| **Users** | Who invokes it, who operates it, and who is affected when it misbehaves? |
| **Trust** | Which callers and which data can be hostile? |
| **Concurrency** | What runs at the same time against the same state? |
| **Topology** | How many processes and machines, and what sits between them? |
| **Lifetime** | How long does a run last, and what must survive across runs and versions? |
| **Failure cost** | What does a failure cost, and to whom? |
| **Compatibility** | Who else depends on its interfaces and formats, and for how long? |
| **Scale** | How much data and how many requests? |

## Scope and the stated envelope

<scope>
The invocation carries two optional things. A path or area name narrows the survey to that part of the code; the rest of the codebase is read only as far as needed to understand that part. Prose about who runs the code and where ("local CLI, only I run it", "internal service for the data team") states the operating envelope. So does `ENVELOPE.md` at the project root, the durable form of the same statement, read on every run when it exists; where the invocation and the file cover the same dimension and differ, the invocation wins and the report notes the difference. A stated envelope is ground truth for every dimension it covers; the dimensions it leaves open are inferred in step 2. The survey never overrides a statement. When artifacts directly contradict it (the user says Macs, the README documents Linux backends), grade against the statement and mark the finding **contested** with the evidence, so the user can strike it in a word. With no path, survey the whole repository. An unstated envelope is inferred; uncertainty goes in the Assumptions section, and the report is the place to raise it. State the resolved scope and the stated envelope in one line before the survey begins.
</scope>

## Step 1: Survey the design envelope

Walk the code in scope looking for mechanisms from the catalog: code that exists to handle a condition rather than to implement the domain. Record each **sighting**: the mechanism, its location, the dimensions it belongs to (often more than one), the condition it presumes, and what it costs (lines, dependencies, layers of indirection a reader crosses, runtime moving parts such as a broker or cache that must be running). Also note absences: a catalog mechanism missing where the code plainly meets its condition and the consequence would cost something (a state file rewritten in place with no atomic write; a listening socket with no authentication). Absences become findings only in step 3.

Tests are evidence too: read them for the conditions they encode, and count them in a mechanism's cost. A mechanism that handles a condition of the data the tool operates on rather than of the tool itself (a refactoring tool warning that a renamed symbol is exported from the target project) is domain logic.

For a scope beyond roughly twenty thousand source lines, dispatch subagents to survey independent areas in parallel: give each a bounded area, the path to `references/envelope.md`, and the sighting fields to return. Survey one area yourself while they run, and keep the envelope judgment in your own hands.

Directories holding no executable code (docs, prompts, generated copies) count as domain-only once listed. The survey is complete when every other top-level module in scope has either produced sightings or been read and confirmed domain-only. Then state, per dimension, the condition the code presumes, and name the archetype the code is built like.

## Step 2: Establish the operating envelope

Use the stated envelope (the invocation, then `ENVELOPE.md`) for every dimension it covers. Infer the rest from environmental evidence, weighted in this order:

- README and docs: audience, install method.
- Deployment artifacts, or their absence: Dockerfile, orchestration manifests, service units, CI deploy jobs.
- Package metadata: private, bin, published versions.
- Network surface: listens on a port; bound to localhost or all interfaces, counting the runtime's default when no host is given.
- Where state lives: a dotfile directory, local SQLite, a hosted database URL.
- The external data it ingests.
- Internal call sites and registrations: which skills, docs, hooks, manifests, or CI jobs invoke each entry point.
- Signs of parallel use: several worktrees, orchestration config.
- Git history: authors, age, release tags.

Design docs and specs record intent, which is evidence of the design envelope, never of operation. A README's claims about audience yield to artifacts: a project described as a multi-tenant platform with no deployment and one author is a single-operator tool. Record the evidence per inferred dimension and name the archetype the operating envelope matches.

## Step 3: Compare and grade

Per dimension, compare design envelope against operating envelope: **fit**, **overbuilt**, or **underbuilt**.

Grade every sighting whose condition lies outside the operating envelope:

- **Cannot occur**: the condition is impossible in this envelope. A distributed lock in a tool that runs as one process; retry with backoff around local file reads. Some of these are **fossils**: mechanisms for a condition a previous architecture had (a runtime check for an interpreter the code now runs under). Git history shows the origin; name it.
- **Not worth handling**: the condition can occur, but its likelihood times its cost is below the mechanism's cost. Crash recovery for a cache that regenerates in seconds.
- **Unverified**: whether the condition occurs hinges on a fact the repository cannot show (a lock around a state file, when whether two invocations ever overlap depends on how the user works). Name the fact that would settle it, and report the cost as if the condition does not occur, so the user sees what rides on the answer.
- **Kept**: the mechanism looks out of envelope and earns its place anyway, with the reason. A second backend implementation exists; the user says the condition is one release away.

A component nothing invokes (no registration, no call site, no doc that reaches it) has an empty operating envelope: report it once, as a unit, with the evidence it is not run, instead of grading its mechanisms one by one.

Every condition the operating envelope contains that no mechanism handles is an **underbuilt** finding, stated with its consequence. An unhandled condition whose consequence the envelope already absorbs (a half-applied rename inside a git checkout) is one line, not a finding.

When a finding rests on runtime behavior (a schema drops keys, a diff is quadratic), verify it with one short side-effect-free script before reporting it.

Rules that keep the grading honest:

- **Quality is not envelope.** Tests, types, naming, module boundaries, readable errors, docs, and validation at boundaries belong in every envelope beyond throwaway. They are never findings, with one carve-out: a schema for a format another program also writes is a compatibility mechanism, in scope. The test for a finding: the code exists to handle a condition on one of the eight dimensions.
- **Inherent complexity is not envelope.** A single-operator tool can be as large as a compiler. Complexity spent on the domain is never a finding; only complexity spent on conditions.
- **A finding costs something.** A cheap interface, a one-line guard, an assert: no cost, no finding. Cite the cost.
- **Hostile data is in nearly every envelope.** A local tool that parses files fetched from the internet still treats those bytes as hostile; strict parsing of external data is fit, not overbuilt.
- **Every finding cites code** as `file:line` and names the envelope-appropriate alternative: often deletion, sometimes the simpler mechanism (a single attempt with a clear error instead of retries; a loop instead of a job queue; a PID file instead of a distributed lock).

The deliverable is the report; the code stays untouched.

## Step 4: Report

Write the report once, directly in the reply; save it to a file only when the user asks. Scale it to the findings: a section with nothing to say collapses to one line, and each finding appears once, named in the Verdict and detailed in its section.

```markdown
# Envelope report: <scope>

**Scope:** <what was surveyed>
**Operating envelope:** <from the invocation | from ENVELOPE.md | inferred; the strongest evidence in one line>

## Verdict
<Built like <archetype>; operated as <archetype>. Two to four sentences on the size of the gap and the findings that most account for it. When the envelopes match, say fit and what the code is well sized for.>

## Envelope
| Dimension | Design envelope | Operating envelope | Fit |
|---|---|---|---|
| Users | <condition the code handles> | <condition it faces> | fit / overbuilt / underbuilt |
| ... | | | |

## Overbuilt
<Grouped by condition, largest cost first. Each: grade (cannot occur / not worth handling / unverified), mechanism, location, cost, envelope-appropriate alternative. Contested findings carry the contradicting evidence.>

## Underbuilt
<Each: the condition, the evidence nothing handles it, the consequence, the envelope-appropriate fix.>

## Kept
<Mechanisms that look out of envelope and stay, one line each with the reason.>

## Fit
<Mechanisms sized to the envelope, one line per cluster: this is what the code is built for.>

## Assumptions
<One per inferred dimension: what the inference rests on, and what would change the verdict if it is wrong.>

## Noticed
<Only if the survey turned up drift outside envelope scope (dead references, an installer pointing at a deleted file): a few lines at most.>
```

The report is done when every sighting from the survey appears in Overbuilt, Kept, or Fit, every overbuilt finding cites its cost and alternative, and every underbuilt finding names its consequence. Check all three before printing.

When `ENVELOPE.md` is absent, close the report with an offer to write it from the operating envelope the report used, so later runs and other agents start from the same statement. Write it on acceptance, with the user's corrections, in the shape given in `references/envelope-file.md`; it is the one file this skill writes.
