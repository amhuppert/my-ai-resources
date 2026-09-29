# Ownership decisions

Read when classifying a dependency or choosing a refactoring boundary.

## Find the decision behind the edge

Ask what fact the caller must know, who is entitled to change it, and what would
force several modules to change together. Use behavior tests and actual journeys
to distinguish business policy from transport, representation, and orchestration.
A folder is a hypothesis about ownership; the decision is the evidence.

| Crossing | Ownership test | Typical disposition |
|---|---|---|
| Domain contract or schema | Does the caller exchange this domain's vocabulary or validate its public representation? | Retain the canonical owner; separate pure vocabulary from execution code if importers acquire both. |
| Domain policy | Does this rule decide eligibility, transitions, routing, pricing, or permissions? | Give the decision one domain owner; callers invoke that policy at the authoritative point. |
| Storage codec | Does the code translate database fields, decode old rows, or implement storage-specific ordering? | Keep representation knowledge with persistence; call domain rules where validity depends on them. |
| Infrastructure adapter | Does it translate a domain operation into a database, network, filesystem, or event operation? | Keep the domain-facing operation narrow and compose the concrete implementation at the application boundary. |
| Production composition | Does it bind real services, shared instances, runtimes, or queues? | Keep binding knowledge in a production entrypoint; allow cores and focused fixtures to receive their collaborators. |
| Generic primitive | Do several domains consume identical semantics independent of their policies? | Share only that stable operation. Similar names or implementations alone do not establish identical semantics. |

A repository importing domain policy can be correct. For example, moving order
transition rules to the order domain should still leave the transaction responsible
for rereading current state, checking revision identity, invoking that policy, and
committing state plus audit atomically. Evaluating policy only before the transaction
would change concurrency semantics.

## Look for concealed capabilities

Trace what an apparently small import brings with it:

- A schema module that also imports validators, executors, or service defaults.
- A repository getter exported from an HTTP route or full application service.
- A reusable engine that imports its own production factory through a helper.
- A fixture that imports the public singleton instead of the dependency-required core.
- A pure event constructor colocated with publication and notification delivery.
- A domain-only workflow under `shared`, or a generic encoder under persistence.
- A barrel that combines contracts and side-effectful modules.

Check additional forms of coupling that import graphs miss: shared tables and
writes, duplicated wire formats or hashes, reflective registrations, generated
clients, event ordering, ambient configuration, and assumptions about ownership of
locks or caches. Cite the concrete read/write or protocol relationship separately.

## Choose the smallest replacement

For each extraction, name a present caller and the knowledge the new module hides.
Compare keeping the current module, moving one operation, splitting policy from
composition, and injecting a narrow dependency. Prefer the option that reduces
knowledge across callers, even if another option yields a prettier graph.

Useful cuts include contracts from admission/execution policy, decisions from row
mutation, projection from delivery, and repository binding from route handling.
Preserve a single semantic owner. A forwarding layer that leaves every caller
knowing the same details has not established a deeper boundary.

A core may still use legitimate infrastructure. Choose the boundary needed by the
current design instead of injecting every imported function. Integration fixtures
should continue proving real persistence and lifecycle behavior; smaller unit
fixtures can supply controlled external operations. Explicit ports also expose
where a supposedly unit-level test is actually exercising production composition.

## Preserve operational invariants

Identify the applicable invariants before moving code:

- **Identity:** one runtime, singleton, cache, lock, write queue, or subscription owner.
- **Timing:** lazy initialization, initialization retries, deferred evaluation,
  cancellation barriers, and cleanup ordering.
- **Authority:** current-state rereads and revision/lease checks inside the
  authoritative operation; side effects at their established commit boundary.
- **Contracts:** public signatures, refusal types/messages relied upon by callers,
  serialized bytes, hash inputs, and persisted representations.

Source comparison can establish a mechanical move; durable-state and integration
tests establish the transaction and lifecycle behavior source comparison cannot.
Use compatibility adapters only where an actual consumer or rollout requires them.
Internal consumers can usually move directly to the canonical owner.

## Interpret survivors

A legitimate runner-to-lifecycle or machine-to-actor import can participate in a
cycle because of a separate production backedge. Break that return path, retaining
the useful forward interface. Remove the forward edge's *cycle allowance* when it
ceases to be cyclic; removing the import itself may make the design worse.

Require a concrete path and ownership argument before reorganizing packages or
folders. Both merging inseparable concerns and separating independent decisions
can improve the design; neither minimizing file size nor eliminating every
cross-domain import is the objective.
