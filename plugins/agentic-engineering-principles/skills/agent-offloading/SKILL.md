---
name: agent-offloading
description: Covers the agent-offloading principle for AI-assisted development —
  offload everything deterministic (git operations, validation commands,
  iteration accounting, output parsing, message routing) from the agent onto
  code, and reserve the agent for judgment, language understanding, and code
  synthesis. Includes the division-of-labor table, decision heuristics,
  orchestrator-owned fields, and typed side channels for agent-produced
  artifacts. Use when designing an agent workflow or orchestration loop,
  deciding whether a check belongs in a script or a prompt, tempted to ask an
  agent to track its own iterations or decide when to halt, or when parsing
  structured data out of agent response text.
---

# Agent Offloading

Maximally useful AI-assisted development offloads as much as possible from the agent onto deterministic code. Reserve the agent for the things only it can do: judgment, language understanding, and code synthesis. Everything else — bookkeeping, validation, routing, retries — belongs in the orchestrator, where it is cheaper, reproducible, and cannot hallucinate.

## Division of labor

| Deterministic code | Agent |
|---|---|
| Git operations, file I/O, log/JSON parsing | Writing and editing source |
| Validation command + exit code | Judging whether a result matches intent |
| Iteration accounting, circuit breakers, locks | Producing the next plan step |
| Schema-validating agent output (Zod / JSON Schema) | Interpreting ambiguous prompts |
| Message routing between agents | Design review |

The left column is work a script does perfectly every time. The right column requires understanding what a human meant. If a responsibility could plausibly sit in either column, put it on the left.

## Heuristics

- **Binary + reproducible check → code, not prompt.** "Did the build pass?" is a script with an exit code. "Does this match the user's intent?" is an agent judgment. Never spend an LLM turn answering a question a command answers with certainty.
- **Validate agent output with a schema, then act deterministically.** Parse the agent's structured response with Zod or JSON Schema. On failure, the orchestrator decides whether to retry, repair, or halt — the agent never decides its own retry policy.
- **No agent bookkeeping.** Summarizing iterations, tracking remaining tasks, counting failures, and deciding when to halt all belong in orchestrator state — never in the model's context. An agent asked to remember "this is attempt 3 of 5" will eventually get it wrong, and the resulting failure is a bookkeeping slip, not a substantive one.
- **Narrow prompts.** Fewer asks per turn plus deterministic scaffolding beat sprawling omnibus prompts. Every additional obligation in a prompt raises the chance one of them is dropped.

## Checklist: where does this responsibility live?

Before adding an instruction to an agent prompt, ask:

1. Is the check binary and reproducible? → Script it; give the agent the failures, not the job of checking.
2. Does the orchestrator already know the answer (phase, round, id, path, count)? → Never ask the model to produce or echo it.
3. Is it loop control — retries, budgets, halting, locking? → Orchestrator state, always.
4. Is it parsing, moving, or transforming data whose shape is known? → Code.
5. Does it require understanding intent, weighing tradeoffs, or writing code? → That is the agent's job; keep the prompt focused on exactly that.

If a prompt survives this checklist with more than a few asks, split it.

## Run the cheap deterministic gate first

Worked example. When a unit of work has both a deterministic validator (build, typecheck, tests) and an LLM validator (does the change satisfy the acceptance criteria?), order them: deterministic first, agent second.

If the tree doesn't compile, no LLM turn helps — the agent validator would be judging the intent of code that cannot run. The deterministic gate is cheaper, faster, and its verdict is certain, so it burns first and short-circuits the expensive judgment call on failure.

Both kinds of failure still consume the same iteration budget and feed the same circuit breaker; the ordering only controls which check spends money first.

## Orchestrator-owned fields

Some fields in an agent's structured response are not judgments the model makes — they are facts the orchestrator already knows from the phase it is running: the current phase, the round number, agent names, target identifiers. Keep these **out of the model-facing schema entirely** and inject them after parsing.

Asking the model to echo them is pure downside:

- The model cannot get them more right than the orchestrator. Best case, it copies correctly and adds nothing.
- A self-consistency slip — an artifact tagged with the wrong round, a stale phase echoed back — fails the run on bookkeeping rather than substance. The agent did the real work correctly and the workflow failed anyway.

The pattern:

1. The schema the model sees describes only model-authored content: judgments, summaries, artifact references.
2. After parsing, the orchestrator stamps in its own values to rebuild the full record.
3. The complete object is re-validated against the authoritative schema before use.

The model authors only judgment and content. The orchestrator owns every fact it can compute.

## Typed side channels, not prose contracts

Don't make free-form agent prose the contract. When an agent produces a structured artifact — a plan, a manifest, a registration — prefer a typed side channel over parsing the response text:

- Have the agent **write a file** at a known path, then validate the file.
- Or have the agent make a **registration call** (a CLI command, an API endpoint) that validates on submission and rejects malformed input immediately.

The prose response is commentary for whoever is reading along; the canonical artifact travels through the typed channel. If you must extract structure from response text, instrument the fallback: needing a fenced-JSON rescue instead of the primary channel is a signal the contract is under strain, worth flagging rather than silently absorbing.

## Anti-patterns

- **The agent as its own project manager.** Prompts like "keep track of which tasks remain and stop when done" hand loop control to the least reliable component in the system. The orchestrator owns the task list, the iteration count, and the halt decision.
- **Prompting for what a script knows.** "Check whether the tests pass and report back" wastes a turn and invites a wrong answer. Run the tests; hand the agent the failure output.
- **Echo fields.** Any schema field the orchestrator could fill itself is a latent failure mode. Remove it from the model-facing schema and inject it after parsing.
- **Omnibus prompts.** One prompt asking the agent to implement, verify, summarize, update the tracker, and decide next steps will do several of those badly. Split: the agent implements; code verifies, records state, and schedules what comes next.
- **Retry policy in the prompt.** "If it fails, try again up to 3 times" makes the retry count invisible to the orchestrator. Retries are orchestrator state behind a circuit breaker, not an instruction to the model.
- **LLM validators judging compilability.** Sending an agent to review code the deterministic gate would have rejected pays judgment prices for a mechanical answer.

## Related skills

- `agent-structured-output` — reliable machine-readable agent output: small manifests, files for content, bounded repair
- `cli-tools-for-agents` — design a project CLI as the agent tool surface: exit codes, file payloads, jobs, doctor
- `mechanical-guardrails` — enforce conventions structurally with ratchets, tripwires, contract tests, and derived artifacts
