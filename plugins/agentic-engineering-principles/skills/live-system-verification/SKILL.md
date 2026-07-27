---
name: live-system-verification
description: Verify features against the live running system — real user flows,
  real API and model calls, and durable backend state — before calling them
  done. Covers scratch-datastore isolation, evidence engineering with greppable
  markers, round-trip persistence checks, and the change classes that only break
  live. Use when asked to "verify it actually works", "test end to end",
  "confirm this works in the real app", or before declaring a feature complete
  on the strength of a green test suite.
---

# Live System Verification

Unit and integration tests routinely pass against fakes — in-memory stores, mocked runtimes — while the real wired-up path is broken. Before a feature is "done", drive the running application through the real user flow (real UI automation or real API calls, and real LLM calls when the feature involves agents) and confirm behavior against backend state, not the screen. A green suite alongside broken live behavior is not a contradiction; it is the most common failure shape this discipline exists to catch.

## Core stance: a green test suite is not evidence

- Unit and integration tests exercise fakes by construction. They prove the logic; they do not prove the wiring, the persistence layer, the process boundaries, or the real model's behavior.
- When the suite passes and the live behavior fails, that is itself a finding — record it as "tests exercise the mock, not production" — not a reason to doubt the live result.
- Feature-level "done" therefore requires a live pass in addition to the suite, never instead of it and never derived from it.

## The verification loop

Run every live verification through this order. Skipping a step is how false PASSes happen.

1. **Isolate.** Confirm the resolved datastore/config path points at scratch, not production, before mutating anything.
2. **Plan the evidence.** Decide per claim what durable artifact will prove it: a re-read database row, a traced log line, a transcript entry, an API response.
3. **Drive the real flow.** Exercise the running app the way a user would — real UI automation or real API calls, real model calls.
4. **Verify durable state.** Re-read the backend after the action and reconcile it against what the UI claimed.
5. **Verify the round-trip.** For persisted state, prove write → read-back → assert against the real persistence layer.
6. **Clean up.** Delete throwaway state, or explicitly flag what was left behind and why.

## Step 1 — Isolate: destructive testing safe by construction

Live verification creates and deletes real state — projects, sessions, records, files. Isolation is a precondition, not a courtesy.

- **Check the resolved target, not the assumed one.** Before any mutation, verify that the datastore/config path the running app actually resolved points at a scratch location (a worktree-local or test-dedicated directory), not the production location. Inspect the real resolved path — the server's startup command, its environment, the file on disk — rather than trusting a default.
- Use a scratch project and throwaway sessions set aside for testing, with no real work in them.
- If the default tooling does **not** produce an isolated target — no override, or the path resolves outside the sandbox, or to production — that is itself a defect worth reporting. Stop and surface it; do not proceed against production data.

## Step 2 — Plan the evidence before acting

Design the test so it produces unambiguous evidence:

- **Unique greppable markers in inputs.** Put a distinctive token in every prompt, name, or payload you send, so its arrival is findable in logs and transcripts.
- **Outputs that cannot occur by coincidence.** When a model is involved, ask for an answer that will not appear by accident (e.g., a specific arithmetic result), so the response side is as findable as the input side.
- **Name test artifacts orthogonally to the strings you grep for.** If you will grep logs for `foo`, do not name the test session `foo-test` — every line will match and the signal drowns.
- **Prove preconditions from server-reflecting signals.** If the flow depends on a state ("an agent turn is running"), verify it from signals that reflect server state — a stop control present, a status field, a log or API check — before acting on it. Do not assume the state holds just because you triggered it.
- **Know your harness's interference.** The tool driving the test can silently change what gets tested. In one real case, a harness that blocked foreground `sleep` caused the agent to background the command and settle the turn early — collapsing the timing window and changing which code path actually ran.

## Step 3 — Drive the real flow

- Drive the actual running application: real UI automation tool or real API calls, and real LLM calls when the feature involves agents. No stubbed backends.
- Seed test state programmatically (API or fixture commands) where possible, and reserve UI driving for the behavior actually under test — faster, less flaky, and the setup is not what you are verifying.
- If the feature is sensitive to which agent backend or provider runs, test each one. Do a startup precheck per backend (one trivial prompt, confirm a real turn runs); a backend that cannot start in this environment is an environment issue to flag separately — report it as untested, never as passed.

## Step 4 — Verify against durable state (the actual test)

Never trust the UI or any other optimistic surface. Client state happily displays "done", "queued", "saved", or "sent" for something the server silently dropped. The UI is a hint; durable state is proof. Every PASS must cite at least one of:

- **The database row, re-read after the action.** Re-reading is the point: it proves the change persisted, not that an in-memory copy mutated.
- **Structured logs, traced by request/correlation id.** Confirm which API path actually ran and that it returned success — an optimistic UI can make a dropped action look identical to a successful one.
- **The agent transcript.** What the agent actually received and produced, in order, exactly once — no duplicates, no missing entries, nothing dangling.
- **The API response.** Fetch the same endpoints the UI uses and confirm the server's view matches the claim.

Two rules while reconciling:

- **When UI and backend disagree, the backend is the truth — and you have found a bug.** Report it as such.
- **Watch for the absence of an expected event.** Silent loss often logs nothing at warn or error; the missing `request.complete`, missing row, or missing transcript entry is the evidence.

## Step 5 — Verify the real round-trip, not the fake's

A feature can pass its entire suite and still lose data, because the fake store preserves fields the real persistence layer drops.

- Classic invisible-loss shape: a schema field with a default that silently resets on every read because the read mapping omits it. Every read looks valid; the data is gone.
- Check that the real schema actually has storage for the new state, and that both the write mapping **and** the read mapping handle it.
- Verify explicitly: real write → read-back → assert the value survived.
- Prefer a contract test against the real repository as the cleanest deterministic evidence — a failing round-trip test is the best possible repro, timing-independent and reviewable.

## Step 6 — Clean up and report

- Delete throwaway sessions/projects, close automation sessions, or clearly flag what was left behind and why.
- If you added a repro test or temporary file, say so explicitly and ask whether to keep it.
- Report per scenario (and per backend where relevant): PASS cited to specific durable evidence — log lines, DB rows, transcript entries, API responses. For failures, give the root cause with `file:line` and a deterministic repro.
- Never imply coverage you did not achieve. "Could not test X in this environment because Y" is a legal and required answer.

## Change classes that only break live

Some classes of change have historically passed every unit test and broken only in the real system — for example:

- turn-end and handoff semantics between processes or agents,
- restart survivability (state that must outlive a server restart),
- cross-process protocol changes.

Name the classes that fit this description in your project, and gate them on a mandatory live run with a **written scenario list** — including a mid-flight restart where relevant. A change in one of these classes is not done at green tests; it is done at a completed live scenario list.

## Red before green

Prove the verification fails against the old behavior before trusting that it passes against the new. A check that was never red proves nothing about the fix — it may be exercising the wrong path, asserting a tautology, or passing for reasons unrelated to your change.

## Anti-patterns

- **PASS from the optimistic UI.** The screen said "saved"; nobody re-read the row.
- **Trusting the green suite over the live result.** The live failure is real; the suite is testing a fake.
- **Asserting on the in-memory copy.** Reading back the object you just wrote from the same process memory proves nothing about persistence.
- **Grep-colliding names.** Test artifacts named after the marker you grep for, burying the evidence.
- **Mutating whatever datastore the tooling resolved.** Isolation assumed rather than checked.
- **Coverage inflation.** Reporting a scenario or backend as passing when it could not run in this environment.
- **Never-red verification.** Trusting a check that has never been observed to fail.

## Related skills

- `logging-for-agent-debugging` — structured logs agents can debug from: stable event names, trace context, bounded analysis
- `mechanical-guardrails` — enforce conventions structurally with ratchets, tripwires, contract tests, and derived artifacts
- `agent-retrospectives` — reflect on agent instructions, skills, process, and tooling after real runs
