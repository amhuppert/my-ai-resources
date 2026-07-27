---
name: mechanical-guardrails
description: Converts recurring "please don't" guidance into structural
  enforcement agents cannot drift past — deleting the foot-gun API, making
  illegal states unrepresentable in types, shrink-only ratchets, coverage
  assertions, checked-in budgets, declare-or-fail registries, derived artifacts,
  and round-trip contract tests. Use when agents keep reintroducing a pattern
  you documented against, when asking how to make a convention stick, when
  planning a migration off a legacy API, when a wrapping or registration
  convention has silently drifted, or when code review is the only thing
  standing between the codebase and a defect class.
---

# Mechanical Guardrails

Agents follow prose guidelines imperfectly, and they forget them entirely under context pressure — the guideline was read forty thousand tokens ago, and the call site looks reasonable. A red test or a lint error at the moment of authoring beats any amount of documentation, because it arrives exactly when the decision is being made and it cannot be skimmed. This skill is about converting recurring "please don't" guidance into mechanisms that fail loudly.

## The enforcement ladder

| Rung | Mechanism | Fails when |
|---|---|---|
| 1 | Prose guideline in a doc | The agent didn't read it, or read it and forgot |
| 2 | Review vigilance | The reviewer is tired, or the violation is invisible at the call site |
| 3 | Lint rule with an allowlist | The allowlist becomes the pressure valve and grows |
| 4 | Shrink-only ratchet | Someone raises the ceiling to go green |
| 5 | Type-level impossibility | An escape hatch re-admits the shape |
| 6 | Deleting the operation | Cannot rot — there is nothing left to call |

Climb as far as the situation allows. Rule of thumb: **if you have written the same review comment three times, you are at least one rung too low.**

## Delete the foot-gun

A hot-path anti-pattern dies when the **operation** dies, not when a convention discourages it.

In one real audit, an expensive whole-state read had already been through a long migration — several reader families and a dozen write sites moved onto focused accessors — and the audit *still* counted thousands of calls averaging hundreds of milliseconds, landing on request paths. The anti-pattern had been addressed by convention: a lint allowlist plus review vigilance, while the expensive operation itself remained callable and public. Every migration removed instances; the surface that made new instances trivially cheap survived every one of them and refilled.

The sequence that actually ends it:

1. **Complete the migration first**, so nothing legitimate still depends on the old path.
2. **Leave at most one honest consumer**, and move it somewhere domain code cannot reach — a private module, not exported through the public barrel, not a method on the shared object every module already holds.
3. **Delete the API.** Not deprecate — delete, along with the machinery only it needed.
4. **Keep the lint rule as an empty-allowlist tripwire.** The names are gone, so the allowlist is empty; the rule now exists solely so re-introducing one fails immediately instead of being quietly re-allowlisted.
5. **Gate the one survivor by import restriction**, with an allowlist of exactly the sanctioned consumer and a written reason for each addition.

Test-only fixtures may replace the deleted API for test setup, as long as production code cannot import them.

Two things change shape when you do this:

- **Guards become structural.** A test that injected a spy to catch use of the bad path has nothing left to spy on; rewrite it to assert the replacement behaves correctly against real storage.
- **Watch your lint config's merge semantics.** If a flat config *replaces* rather than merges a rule when a later block re-declares it for overlapping files, any per-file override that forgets to re-include your restriction silently drops the guard for those files. Define the restriction once as a shared constant and spread it into every block that sets the rule.

The rewritten rule is "there is no such operation to call" instead of "please don't call it on a hot path". That is the only form of the rule that cannot rot.

## Make illegal states unrepresentable in types

Where deletion is too blunt, move the constraint into the type system so the violating call site does not compile.

- A callback parameter typed **deliberately non-async** — `(state) => Result`, never returning a promise — turns "await slow work while holding the lock" into a compile error rather than a review finding. The caller physically cannot await inside the critical section.
- **Return inert data, not callables.** A mutation callback that returns `{ events, pushes }` as plain data cannot broadcast from inside a transaction; the seam performs delivery after the commit resolves. Making the wrong thing inexpressible beats documenting when it is allowed.

Pin the constraint itself with a **type-error fixture test**: a deliberately illegal call site annotated as expected-to-fail. Without it, someone widens the signature later and the hole reopens silently — the guardrail is regression-guarded only if a test asserts it still rejects.

Checklist for a type-level guardrail:

- Which exact call site should fail to compile?
- Is there a fixture pinning that failure?
- Does a legitimate-looking escape hatch (a generic wrapper, an overload, an `unknown` cast) re-admit the shape?

## Ratchets and floors for migrations

Encode the current count of a legacy pattern as a checked-in ceiling that only goes down.

Works for: legacy call sites, legacy selectors or stylesheet lines, architecture seam violations, uses of an async form where the sync form is now the default, files still on a superseded module.

Rules that make a ratchet work:

- The ceiling drops when you migrate. A change that adds an instance fails the check.
- **Never raise a ceiling to make a failure disappear.** Migrate the new call site, or document an approved survivor with an explicit deletion condition — the condition that must become true before it goes.
- Record the ceiling as checked-in data (a number in a config or a manifest), so a deliberate change is a reviewable diff, not a comment nobody sees.
- Make the failure message actionable: what to migrate to, and where the approved-exception path is. "Count exceeded" tells an agent nothing it can act on.
- A ratchet that reaches zero becomes a tripwire. Keep it — that is when it is cheapest and most valuable.

## Coverage conventions must be assertions

"Every route is instrumented / wrapped / registered / published through the seam" is only true if a test says so.

In one real audit, 22 handlers shipped outside the request-tracing net. The wrapping happened inside library modules and the route shells just re-exported the result, so a module that forgot the wrap — or added a sibling handler without it — was indistinguishable by eyeball from one that did it right. Those requests carried no trace context, and their timings could not be joined back to a request.

The mechanism:

1. **The wrapper stamps a marker** on what it returns — a non-enumerable symbol property, invisible to consumers and impossible to fake accidentally.
2. **An architecture test enumerates every candidate** — glob every module of the relevant kind, import each one, iterate its exports.
3. **Assert the marker** on every export that should be covered.
4. **Prove the test red** against an intentionally-unwrapped fixture before you trust a pass.

Generalizes directly to: every event publisher goes through the typed publication seam; every persisted repository has a contract test; every command has a help entry; every trusted schema is registered.

The design tell: **if a convention's compliance is invisible at the call site, it will drift.** Either make it visible or make it asserted.

## Budgets as checked-in data

Encode performance and size ceilings in a data file and check them: route p95, hold time for a serialized section, storage-read latency, row or payload size, bundle size.

- **Run advisory first.** Report breaches, exit 0, and calibrate the numbers against reality for a while. A budget set from imagination fails on day one and gets disabled.
- **Then gate.** Non-zero exit on breach.
- **Pair budgets with finding rules** that encode conventions numerically — for example, an accepted-for-later response that takes over a second is not actually "performed later", so flag it as a convention violation.
- **Keep the budgets in version control** beside the code, so raising one is a diff someone reviews.

The payoff is timing. One real 5× degradation went unnoticed for two weeks and was only found by retrospective percentile archaeology, because no budget existed to turn it into a number. A checked-in budget converts slow-drift regressions into a same-week red number.

## Declare-or-fail registries for latent-defect classes

For a recurring class of latent defect, build a gate that **enumerates every instance of the class and demands an explicit, typed discharge for each**.

The worked example: every collection nested inside a value that is serialized whole into a single storage column grows without eviction, so a per-element write rewrites the entire column. The gate registers each such schema, walks its JSON-schema projection for arrays without a maximum and for open-ended maps, and requires every finding to carry one of:

- `not-persisted` — dropped on write (cross-checked against the durability policy).
- `normalized: <table>` — not in the blob; lives in its own child table.
- `pruned: <where>` — evicted to a bounded working set by named code.
- `bounded: <why>` — capped by construction (author-fixed shape, one in-flight set, config-keyed map).
- `tracked: <item>` — honestly still unbounded, naming the structural change that will fix it.

Design rules that keep such a registry honest:

- **The honest `tracked:` discharge is what makes it adoptable.** You do not need everything fixed to turn the gate on today; you need every instance *decided*.
- **Match discharge keys exactly by default**, so a collection added next to a discharged one is still flagged. Allow a subtree wildcard only where every descendant is genuinely bounded.
- **Stale keys that cover nothing must also fail.** Otherwise the registry rots into a list of historical claims about a schema that has since moved on.
- **The forced decision at authoring time is the entire point.** Adding a field fails the gate until you cap it or record why it is bounded — which is exactly the thought that would otherwise have happened in production.

Other classes worth a registry: schemas allowed to skip validation in production (each must be provably free of defaults and transforms), modules allowed to import a restricted path, surfaces allowed to break a layout or design rule.

This is the generalizable alternative to "we wrote a guideline about it".

## Derived artifacts over hand-synced copies

When several surfaces express the same facts, derive them all from one typed source and let a contract test fail on drift.

Typical set: command help text, per-command flag allowlists, the parser's boolean-flag set, top-level usage, group dispatch, and the command reference table inside a skill doc. They are the same facts, so a hand-maintained copy is a guaranteed future divergence.

The contract test *is* the definition of correctness: every dispatchable path has an entry, every leaf has at least one example, every cross-reference resolves, every referenced file exists on disk, kind collisions fail.

Drift in agent-facing documentation is worse than absence: absence sends the agent to the source, while drift sends it confidently to the wrong place and trains distrust of every other doc you wrote. **Hand-syncing is a defect class, not a review duty.**

## Round-trip contract tests as the durability floor

Every persisted shape gets a maximal write → reload → assert backstop against the **real** storage layer.

- **Maximal** — populate every field, including optional and deeply nested ones. A round trip that exercises three fields proves three fields.
- **Real storage, cold reader** — reload through fresh repositories over the same storage that never saw the write. Only genuinely persisted state passes. An in-memory fake proves that one object equals another object; it cannot prove durability.
- **Extend it for every new persisted field or table.** This is the rule that makes the backstop a floor rather than a snapshot.
- **Declare intentionally derived or non-persisted fields in an explicit policy list**, so an omission is a decision someone made, not an accident nobody noticed. Cross-check that policy against the `not-persisted` discharges in your bounds registry.
- **Assert cache invalidation too**, if the layer caches parsed rows. A cascading delete that removes child rows behind the cache's back leaves a warm reader serving ghosts.

## Rolling out a guardrail

1. Name the defect class and the real incident that earned it.
2. Pick the highest rung of the ladder you can reach today; note the rung you want next.
3. **Prove it red** — an intentionally violating fixture must fail before you trust a pass.
4. Run advisory to calibrate, and record the current state as a ceiling or a set of discharges rather than blocking on a full cleanup.
5. Make the failure message say what to do, and where the approved-exception path is.
6. Write the earned lesson in the durable log, and delete the prose guideline the mechanism now replaces.

## Anti-patterns

- **Raising the ceiling to go green.** The ratchet's only property is monotonicity; one raise and it is decoration.
- **The allowlist as pressure valve.** An allowlist that keeps growing is a convention wearing a lint rule's clothes.
- **Guardrails nobody proved red.** A check that has never failed may not be checking anything.
- **A registry with no stale-key check.** It silently degrades into historical claims about schemas that moved.
- **Documenting a convention instead of asserting it.** If compliance is invisible at the call site, prose will not save it.
- **Hand-synced doc tables.** Two copies of the same facts, one of which is wrong by next month.
- **In-memory fakes as durability proof.** They prove a fake round-tripped through a fake.
- **Budgets in a wiki page.** Not in version control means not reviewed and not gated.
- **Removing the tripwire after the migration.** "The migration is done, so the lint rule is unnecessary" — that is precisely when it is cheapest to keep and most likely to be needed.
- **A docstring as a guardrail.** "Do not call this on a hot path" is rung one with extra steps.

## Related skills

- `earned-guidance-docs` — write agent guidance only when earned by real failures; root contract plus read-on-demand docs
- `progressive-disclosure-tooling` — help as a navigable disclosure graph derived from one typed registry
- `live-system-verification` — verify features against the running system and durable state, not fakes or UI
- `agent-offloading` — offload deterministic work from agents onto code; reserve agents for judgment
