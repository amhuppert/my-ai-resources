---
name: logging-for-agent-debugging
description: Design structured logging that AI agents can actually debug from —
  a stable documented event vocabulary, ambient trace context, scoped routing
  with a global timeline, documented query gotchas, a bounded log-analysis CLI,
  and forensic per-run logs for long agent executions. Use when designing
  logging for a project agents will debug, when an agent cannot find what it
  needs in the logs, when building an agent-friendly log query or
  performance-analysis tool, or when adding observability to multi-step agent
  runs.
---

# Logging for Agent Debugging

Human-oriented logging assumes a person who already knows the system scrolls a terminal. Agent-oriented logging assumes a caller who must find the relevant twenty lines out of two million by grepping for names it was told exist. That single change of consumer drives everything below: event names become an API, every record must self-join, and the query traps must be documented as loudly as the schema.

## Log events are a documented vocabulary

Treat log event names as a public API with the same stability obligations as any other interface.

- **Name events `module.event`** — `prompt.submit`, `request.complete`, `lock.rejected`, `session.create_failure`. Predictable prefixes mean an agent can grep a whole subsystem (`"message":"prompt.`) without knowing every leaf name.
- **One JSON record per line (NDJSON).** Every line is independently parseable, so `grep | jq` works on any subset without repairing structure. Multi-line pretty-printed logs are unqueryable by the tools agents reach for first.
- **Keep a checked-in catalog table** of module → event → level → key fields → meaning. This is the discovery surface. An event that exists in code but not in the catalog is, for practical purposes, undiscoverable: agents do not read the logging call sites, they grep for names the docs promised.
- **Renaming an event is a breaking change.** It invalidates every saved query, skill recipe, and analysis tool that referenced it.

Example record:

```json
{"timestamp":"2026-01-14T09:31:07.412Z","level":"info","module":"tracing","message":"request.complete","traceId":"1f4c…","action":"send-prompt","projectName":"acme","sessionName":"fix-auth","status":200,"durationMs":842}
```

Example catalog rows:

| Module | Event | Level | Key fields | Meaning |
|---|---|---|---|---|
| `tracing` | `request.complete` | info | `method`, `path`, `status`, `durationMs` | Request finished (non-streaming) |
| `sessions` | `session.create` | info | `projectName`, `sessionName`, `mode` | Unit of work created successfully |
| `lock` | `lock.rejected` | warn | `scope`, `holderTraceId` | Concurrent operation blocked by single-flight lock |

## Canonicalize field names system-wide

One concept, one field name, everywhere. If duration is `durationMs` in one module, `totalMs` in another, and `elapsed` in a third, then no single query answers "what was slow" — and the agent that writes the obvious query gets a confidently wrong empty result.

- Pick canonical names for the cross-cutting fields (`durationMs`, `traceId`, `error`, `status`) and enforce them.
- Sub-phase breakdowns live *alongside* the canonical field, never instead of it: emit `durationMs` plus `waitMs`/`holdMs` where `durationMs = waitMs + holdMs`.
- When you canonicalize retrofit-style, **document the legacy fallback** ("logs before X recorded this under `totalMs`; the analysis parser still reads it as a fallback"). Otherwise old records look like missing data.

## Ambient trace context so every record self-joins

Every record should carry enough identity that "everything that happened during that one action" collapses to a single grep — not a manual join across five files.

- Establish a per-request / per-unit-of-work context (AsyncLocalStorage or your platform's equivalent) that auto-enriches **every** log line with a `traceId` plus domain identity (project / session / conversation, or your domain's equivalents).
- Auto-enrichment must be ambient, not a parameter each call site remembers to pass. Anything a caller can forget, callers forget.
- **Background entrypoints must opt in.** Jobs, scheduled work, workflow executions, and async agent turns run outside the request path and become invisible islands unless they explicitly run inside the same trace mechanism. Give them an entrypoint (`runAsTrace(action, fn)`) and require it.
- Wrapping is invisible at the call site, so make coverage an assertion: have the wrapper stamp a marker and have an architecture test enumerate every candidate entrypoint and assert it is wrapped. "Every route is instrumented" is only true if a test says so.

## Scoped routing with a dual-written global timeline

Drill-downs should be small; timelines should be complete. You need both.

- **Route records to narrow per-entity files** resolved at write time from the active trace context: conversation-scoped → the conversation file, session-scoped → the session file, otherwise the global log. A per-entity file stays small enough for an agent to read a meaningful slice of it.
- **Dual-write request lifecycle events** (`request.start` / `request.complete` / `request.error`) to the global log as well, so a chronological cross-cutting timeline always exists. Without this, scoped routing destroys the ability to see ordering across entities.
- **Sanitize path components** derived from user data: map anything outside `[A-Za-z0-9._-]` to `_`, strip leading dots, truncate long names with a hash suffix.
- **On routing failure, degrade — never drop.** Fall back to the next-priority scope and emit a diagnostic event (`logger.path.sanitize_failure`). A lost line is a lie by omission.
- **Provide env-var escapes** to collapse everything to one file: an explicit single-file destination override, and a flag that disables scoped routing entirely. Agents debugging an unfamiliar deployment need one file they can trust.

## Document the query gotchas, not just the schema

A logging doc that describes only the schema teaches agents to write queries that read clean and are wrong. Document the ways a query silently lies.

**Rotation is the canonical correctness trap.** With size-based rotation, the active file holds only the newest window; older records live in numbered backups. So:

- `tail` and "most recent" checks are correct against the active file.
- "Count all errors", "how often does X happen", and "trace this older id" are **silently wrong** unless the query globs the rotated backups.
- A surprisingly small or empty active file usually means it just rotated — the history is in the `.1` backup, not gone.

Use `grep -h` across the glob so the output has no `filename:` prefixes and stays valid NDJSON for `jq` (line ordering is irrelevant when each record is timestamped):

```bash
grep -h '"level":"error"' "$LOG_DIR"/app.log* | jq -r .message | sort | uniq -c | sort -rn
grep -h 'TRACE_ID'        "$LOG_DIR"/app.log* | jq '{timestamp,module,message,durationMs}'
```

Also document: which files are auto-discovered by tooling and which must be passed explicitly; that debug-level events (locks, verbose internals) are absent unless the level is raised; and any event emitted only above a threshold, since its absence means "fast", not "never happened".

**Teach an orientation-first workflow.** Before any deep dive:

1. Confirm the file exists and has plausible size (`wc -l`) — catch a just-rotated or wrong-path file immediately.
2. Error frequency summary by event name, most common first.
3. Warning frequency summary.
4. Last few errors with context, to extract a `traceId`.
5. Only then reconstruct the single trace, and only then narrow to the scoped per-entity file.

Agents that skip orientation anchor on the first error they see rather than the dominant one.

## A log-analysis CLI as the agent's first resort

Reading a large log costs tokens proportional to its size and returns evidence in no particular order. Give agents a command that returns **bounded structured output** so they rank evidence instead of reading it.

Capabilities worth building, roughly in order of value:

- **Ranked slow operations** — top-N requests/operations by duration, filterable by time window, entity, and path.
- **Hotspot aggregation** — total inclusive and exclusive time per operation across all traces; answers "where does execution time actually go".
- **Duplicate-work detection** — the same operation signature repeated within one trace, which is where accidental N+1 and redundant recomputation surface.
- **Before/after comparison of two time windows or two log files** — p95 deltas per endpoint and per operation, new duplicate-work signatures, new warnings and errors. This is what turns "it feels faster" into evidence.
- **Single-trace reconstruction** — the timed intervals of one trace with inclusive time, exclusive time, duplicates, and warnings.

Two properties matter more than the feature list:

- **Bounded output by default.** JSON with a top-N cap, plus optional markdown. An analysis tool that can emit unbounded output will eventually be the thing that blows the context window.
- **Self-diagnosing.** When unexplained time dominates a reconstructed trace — wall time far exceeding the sum of instrumented spans — the tool should say so explicitly: *add instrumentation coverage before optimizing code.* Otherwise the agent optimizes the only thing it can see, which is by construction not the bottleneck.

Support **performance budgets as checked-in data** evaluated by the same tool: run advisory first to calibrate against real numbers, then gate. A budget file in the repo is reviewable and diffable; a threshold buried in a script is not.

## Forensic per-run logs for long agent executions

For multi-step agent executions (workflows, orchestrated runs, multi-agent pipelines), general application logs are the wrong shape. Write a dedicated per-execution log tree, split by concern.

```
runs/<executionId>/
├── _manifest.json        # Entry point: status, halt reason, definition, summaries
├── lifecycle.jsonl       # started / paused / resumed / aborted / completed / halted
├── decisions.jsonl       # cross-cutting decisions: scheduling, rotation, retry, circuit breaker
└── units/<unitId>/
    ├── iterations.jsonl  # per-iteration lifecycle
    ├── tasks.jsonl       # task completion, reopening, agent-added tasks
    ├── validation.jsonl  # validator invocations, results, remediation
    └── prompts/          # full prompts and responses, verbatim
```

Design rules:

- **The manifest is the documented entry point.** One file that states status, failure reason, and summaries, so an agent orients in one read rather than by listing directories.
- **State an investigation order** in the docs — manifest, then lifecycle, then decisions, then drill into a single unit. The split exists so agents load only the file relevant to their question; without a stated order they load all of them.
- **Shared record schema** across files (`{ timestamp, event, executionId, ...data }`) so one query pattern works everywhere.
- **Fire-and-forget writes.** A logging failure must never affect execution. Never `await` a forensic write on the critical path, never let it throw into business logic.
- **Capture prompts and responses verbatim.** Post-hoc investigation of an agent run is impossible without the exact text that was sent and returned — paraphrase, truncation, and templating all destroy the evidence. Record which parse path succeeded for structured responses, too; that is the difference between "the model complied" and "the fallback saved us".

## Hygiene

- Never log secrets, tokens, credentials, or full prompt contents in general application logs. Log lengths, hashes, or previews (`argsPreview`, `promptLength`) instead of payloads.
- **Verbatim prompt and response capture belongs only in the dedicated forensic store** — a separate, access-controlled location with its own retention, not the log everyone greps.
- Log identifiers, not user content. `conversationId` is safe; the conversation is not.
- Warn/error to stderr as well as the file (with a silence switch) so failures are visible without a query.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| "The agent can't find anything in the logs" | Events exist in code but not in a catalog the agent was given | Publish the catalog table; treat uncatalogued events as undiscoverable |
| A duration query returns nothing meaningful | Field names diverged (`totalMs` vs `elapsed` vs `durationMs`) | Canonicalize; document legacy fallbacks |
| Error counts look implausibly low | Query hit only the active file after rotation | Glob rotated backups with `grep -h` |
| Background work has no logs | Jobs and async turns never entered the trace mechanism | Require an explicit trace entrypoint; assert coverage in a test |
| Trace shows mostly unexplained time | Instrumentation gap, not a code problem | Add timing coverage before optimizing |
| A scoped log is missing a whole action | Routing failed and dropped, or the entity was never in context | Degrade to the next scope with a diagnostic event |
| Agent read the whole log and ran out of context | No bounded analysis command existed | Provide ranked, capped structured output as the first resort |
| An agent run cannot be reconstructed after the fact | Prompts were summarized rather than stored | Capture verbatim in the forensic store |

## Related skills

- `ai-readable-tool-output` — configure linters, compilers, and test runners for low-noise agent consumption
- `query-output-disclosure` — the general query-output contract the log-analysis CLI instantiates: bounded defaults, ranked digests, explicit omission
- `live-system-verification` — verify features against the running system and durable state, not fakes or UI
- `agent-retrospectives` — reflect on agent instructions, skills, process, and tooling after real runs
