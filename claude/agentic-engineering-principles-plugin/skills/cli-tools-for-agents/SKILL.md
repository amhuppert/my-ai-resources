---
name: cli-tools-for-agents
description: >-
  Design a purpose-built project CLI as the primary tool surface for AI
  coding agents, instead of in-process tool or MCP servers. Covers text-by-
  default output with opt-in --json (format follows the consumer), the exit-
  code taxonomy, structured errors, file-based payloads with a validate
  verb, preflight verbs for gated transitions with findings named by the
  transition they block, job-shaped long operations, identity resolution, a
  doctor self-check, and build-parity stamps. Use when building a CLI for
  agents, migrating away from in-process tool servers, designing tool output
  and error contracts, deciding between text and JSON output for an agent-
  facing tool, designing a lint or check command that runs ahead of a gate,
  choosing severity levels for findings, or deciding how agents should
  invoke project actions.
---

# CLI Tools for Agents

A custom CLI invoked through the shell is the most reliable and portable way to give agents tools. In-process tool servers need a babysitting subsystem (rebinds, keepalives, kill escalation); a CLI has no binding to break — failures become ordinary non-zero exits with readable errors, which agents recover from well. Design the CLI for a calling agent, not a human, and every downstream decision (exit codes, error shape, payload format) falls out of that inversion.

## Why a CLI beats in-process tool/MCP servers

Ranked motivation:

1. **Reliability.** In-process tool servers require dedicated recovery machinery: pre-turn rebinds, rebind-on-stream-close, kill escalation, keepalive ticks. A shell-invoked CLI has no persistent binding to break. Failures become ordinary non-zero exits — the failure mode agents handle best — and the entire recovery subsystem becomes deletable.
2. **Portability.** In-process tool servers exist per-provider. A CLI works for any agent backend that can run shell commands — and for agents running entirely outside your platform, who just pass flags or export env vars themselves.
3. **Ergonomics.** Huge nested tool schemas force agents to emit entire payloads as inline tool arguments, where one escaping error wastes the whole attempt. `--file payload.json` plus a `validate` verb inverts this: payloads become files the agent writes, validates, and iterates on cheaply.
4. **Token efficiency.** Real but modest for most tools; the savings concentrate in the big-schema tools. Measure rather than assume — capture tool-schema tokens per fresh context window and invocation failure rates before and after migrating.

## Design for the calling agent, not a human

The primary consumer is a program that must branch on results, not a person reading a terminal. That inverts the human-CLI defaults. State this design target explicitly at the top of the tool's docs.

- Machine-checkable exit codes over prose.
- Terse one-line errors over paragraphs; errors to stderr, single actionable line first, detail after.
- Non-interactive always: no prompts, no TTY-detection surprises, no paging.
- No color dependence.
- A structured `--json` envelope available on every command.

**Format follows the consumer.** "The caller is a program" does not mean "output JSON": the agent branches on exit codes and *reads* the output, and an LLM reads compact line-oriented text more cheaply than JSON — structural keys and string-escaping cost tokens without adding meaning, and escaped multi-line content (stack traces, diffs) is harder to read, not easier. So:

- **Default output is terse, line-oriented text** with stable shapes (`<path>: <message>`, one fact per line) — not narrative prose, which is neither parseable nor skimmable.
- **`--json` is opt-in, for output that feeds code** — a script, an orchestrator, a `jq` pipeline — never for the agent's own reading.
- **Input payloads are the mirror image.** They are parsed by code, so they are structured: schema-validated files, not text the server must interpret (see file payloads below).

## Query output is bounded by default

Format discipline alone is not enough: a read verb with perfect line-oriented text can still dump the whole dataset into the agent's context. Volume is part of the output contract.

- A query command's default output is a bounded digest — a summary or outline with stable zoom-in handles — whose size stays roughly constant as the underlying data grows.
- Deeper detail is pull-based: drill-down verbs and flags, with the full form opt-in only and written to a file past a size threshold.
- Omission is explicit: output that leaves things out says so and names the exact command that reveals more.

`query-output-disclosure` covers the escalation ladder and the pattern menu (detail levels, field selection, filtering, pagination, aggregation).

## The exit-code taxonomy

Reserve a small, stable set of exit codes that answer "whose fault is it?" from `$?` alone, without parsing text. Publish the table in the tool's help and skill doc so recovery advice can key off it.

| Code | Meaning | Whose fault |
|---|---|---|
| 0 | Success | — |
| 1 | Operation failed (the server said no) | The request's semantics |
| 2 | Usage or validation error (bad flags, invalid payload) | The caller — fixable in one edit |
| 3 | Connection or auth failure (server unreachable, bad token) | The environment |
| 4 | Version mismatch (reserved; normally warn-only) | The deployment |

Every exit-3 error message points at the `doctor` command (below) — one recovery entry point, not scattered advice.

## Validate locally before any network round-trip

Everything checkable without the network — flag names, file readability, payload parse, identity resolution — fails locally and fast with a distinct exit code (2), before any request is sent. The agent gets a stable, reproducible failure fixable in one edit, instead of an ambiguous server error that may be transient.

Server-side validation remains the source of truth for semantics: schema validation at the route boundary produces the real errors. The CLI's local checks are the cheap deterministic layer in front of it.

## Structured errors: never flatten computed detail into prose

When the server has computed per-field validation issues, it returns them as structured data (`{ error, code?, issues? }`) — never concatenated into one sentence. The CLI forwards `code` and `issues` into its `--json` envelope rather than flattening them.

- Text mode renders one issue per line (`  <path>: <message>`).
- JSON mode carries the same detail structurally.
- **Structured detail is never text-mode-only.** If the text output shows per-field issues, the JSON envelope must carry them as data.

This coexists with text-by-default output: the *data* stays structured internally and in the `--json` envelope, while text mode renders the same issues as keyed lines. Neither mode flattens computed detail into a sentence.

In one real audit, structured issues were being extracted by the error classifier and then dropped at the rendering seam — JSON callers got less information than text callers. Treat that class as a defect.

## File payloads and the validate verb

Any payload beyond a couple of scalars is passed as a file (`--file <path>`, `-` for stdin), not a proliferation of flags. Agents are good at writing JSON with an editor tool and iterating against validation errors; they are bad at long shell quoting.

Pair every complex `create`/`replace` verb with a persist-nothing `validate` verb that runs the full server-side validation without creating anything. This turns a complex command into an author → validate → retry loop with a persistent artifact:

1. Agent writes `payload.json` with its editor tool.
2. `yourcli thing validate --file payload.json` — exit 2 lists issues one per line.
3. Agent edits the file and re-validates until clean.
4. `yourcli thing create --file payload.json`.

## Preflight gated transitions

The validate verb above is payload-scoped: one document, checked before one call. Its generalization is state-scoped. Wherever a command **gates a transition** — publish, merge, submit, promote, release, deploy — expose a read-only verb answering *what would refuse this right now*, callable at any point during the work rather than only at the moment of the attempt.

Refusal is the worst possible discovery channel for a rule. The agent has already committed to the transition; the failure arrives as a list of conditions it must reverse-engineer into edits; and a rule it never trips is a rule it never learns. A preflight verb converts all of that into information available beforehand.

Three properties make one trustworthy:

- **Parity with the gate.** The preflight runs the *identical* rule set the transition runs — not a reimplementation, not a subset. A preflight that diverges is worse than none: it grants confidence the gate then contradicts, and agents stop consulting it.
- **Callable at any time.** A standalone verb, not a flag on the transition. `--dry-run` is the weaker form, because it still frames checking as part of attempting; a separate verb lets the agent poll cheaply mid-work and steer toward a legal state.
- **An explicit clean verdict.** When nothing would refuse, say so and name the transition now unblocked. Silence is ambiguous between "clean", "did not run", and "matched nothing because the target was wrong".

### Findings name the transition they block

A finding's severity says *which transition it blocks* — `blocks_publish`, `blocks_merge`, `advisory` (for example) — never an abstract intensity. `error`/`warning`/`info` forces the agent to guess the consequence and re-derive it per rule; naming the blocked transition makes the next action readable from the finding alone, and lets one command serve several gates by grouping findings under each.

This is the finding-level counterpart to the obligation-based vocabulary in `agent-feedback-tiers`: define the levels by what the consumer must *do*, never by how bad the thing is.

### Mutations report their effect on the gate

A write that changes gated state returns the blocking-finding count before and after it — `{ blockingBefore, blockingAfter }` in the envelope, a short line in text mode. The agent gets a closed feedback loop on every edit instead of a mutate → re-check → compare cycle, and an edit that silently makes things worse surfaces at the edit rather than at the transition.

### Report both sides of the ledger, not just the deficit

A gate that reports only what remains outstanding — `11 pending of 18` — is read as **7 lost**, not 7 banked. Where progress accumulates across attempts, report the satisfied count and the reason for the remainder alongside the outstanding one:

```
approvals: 12 carried, 6 pending (content changed since last approval)
```

Deficit-only output systematically under-reports progress to an agent, and an agent that believes it is losing ground behaves differently from one that knows it is nearly done.

### Accurate output can still teach a false mechanism

Output is where an agent builds its model of your system, and a message can be entirely true while foregrounding the wrong thing. In one real design, a gate refusal read *"item R5 needs a valid approval for `<revision-id>`"* — correct, but naming the revision an approval was bound to taught the agent that approvals were per-revision and destroyed by reopening the document. They were per-element and carried forward. The agent operated on the inverted model for an entire session and avoided a cheap, sanctioned action because it had mis-priced it.

State the mechanism where the wrong inference is invited, not only where it is catalogued — the agent is reading the refusal at the moment it forms the belief, not your reference doc. `designed-friction` covers this failure class, mis-priced sanctioned actions, and rationale placement in refusals.

### Publish the rule catalogue offline

Ship the full set of rule identifiers with their severities as a readable document, not only as findings emitted when tripped. An agent that can enumerate the rules authors toward them; an agent that can only meet them by violation authors blind and learns the rule space one refusal at a time. Rule identifiers are stable and greppable, so a finding, the catalogue entry, and any prose about it all name the same string.

## Long operations are job-shaped

Operations that outlive a comfortable shell-tool timeout are server-side jobs:

- The CLI offers `--wait [--timeout <dur>]` long-polling and a separate `status <id>` verb.
- If the agent's shell call is killed mid-wait, the work continues server-side; `status <id>` resumes observation.
- Never fire-and-forget: flags that detach and hide failures make errors invisible to the agent.
- If the agent harness has a shell timeout ceiling, raise it via the injected environment so `--wait` flows aren't truncated by a default.

## Identity by contract

Give the agent's environment its ambient identity via injected env vars, with a documented resolution order: **explicit flags > env vars > file**.

- Missing identity fails with a usage error (exit 2) naming the exact missing variable — not a generic "not configured".
- Any operation targeting a *different* scope than the ambient identity (another project, session, or workspace) requires explicit flags. The tool never silently acts on a neighbor.
- The flags-over-env order keeps the CLI usable by agents outside your platform: they pass flags or export the env themselves.

**Do not name the binary something already on PATH.** If the environment contract prepends your bin directory to PATH, a name collision silently shadows the existing tool for every agent session (a two-letter name collided with the system C compiler in one real design; the longer `-ctl` style name avoided it).

## The doctor self-check

Ship one self-diagnostic command — `doctor` — that reports connectivity, auth, identity resolution, and version parity in one pass. It is the single recovery entry point:

- Every connection-class error (exit 3) points at it by name.
- It is the acceptance test for the tool's installation: an agent in a fresh session runs `doctor` and gets a green handshake.

## Version and build parity

When the CLI talks to a long-running service and agents work in per-branch worktrees, a client built from worktree code silently drifts from the service's API. Make the *service* the single source of the binary:

- The service publishes the client binary at startup (atomic write: temp file + rename).
- A build stamp (git SHA + build time) is compiled into both server and CLI; every request carries it.
- Mismatch produces a one-line stderr warning (the CLI proceeds — mismatch should be transient across a restart); `doctor` surfaces it explicitly.

## Keep the core a pure function

Structure the CLI core as a pure function of `(argv, env, injectedClient) → { exitCode, stdout, stderr }`, with the HTTP client injected. Behavior is then testable without a server; a thin contract-test layer runs the real CLI against real route handlers in-process.

## Break contracts cleanly

When the only consumers of an output shape are agents plus a skill doc updated in the same change, prefer clean replacement over dual-shape back-compat. A dual shape doubles the surface and teaches agents that two formats exist. Update the output contract and its skill doc atomically; rollback is a revert.

## Anti-patterns

- **Prose-only errors.** An error the agent must parse with regex to branch on is a defect; give it an exit code and a `code` field.
- **JSON-by-default output.** Defaulting the envelope on because "the caller is a program" — the agent branches on exit codes and reads text; JSON is for output that feeds code.
- **Dump-by-default query output.** A read verb that returns every record in full; the default is a bounded digest with drill-down, not the dataset.
- **Inline mega-payloads.** Requiring a large JSON document as a quoted shell argument; one escaping error wastes the attempt.
- **Fire-and-forget flags.** Detached operations whose failures nothing observes.
- **Refusal as the discovery channel.** A gated transition with no way to ask what would refuse it beforehand; the agent learns the rules by tripping them, one attempt at a time.
- **A preflight that diverges from its gate.** A check that approximates the real rules rather than running them — the one failure mode that makes a preflight worse than not shipping one.
- **Abstract severity levels on findings.** `error`/`warning`/`info` where the consequence differs per rule; name the transition each finding blocks instead.
- **Silent scope widening.** Falling back to a different project/session than the ambient identity without explicit flags.
- **Interactive fallbacks.** Prompting on a TTY "for convenience" — agents hang on prompts.
- **Dual-shape output for back-compat.** When consumers are agents plus a doc you control, replace cleanly.
- **Ambiguous network errors for local mistakes.** A bad flag should never require a network round-trip to discover.

## Related skills

- `progressive-disclosure-tooling` — help as a navigable disclosure graph derived from one typed registry
- `query-output-disclosure` — bounded digest defaults, zoom-in handles, and the disclosure pattern menu for query output
- `agent-feedback-tiers` — hint/reminder/instruction output tiers and the reminder admission rule
- `ai-readable-tool-output` — configure linters, compilers, and test runners for low-noise agent consumption
- `agent-offloading` — offload deterministic work from agents onto code; reserve agents for judgment
- `designed-friction` — refusal rationale, ledger framing, and the designed-versus-defect taxonomy for agent-facing tools
