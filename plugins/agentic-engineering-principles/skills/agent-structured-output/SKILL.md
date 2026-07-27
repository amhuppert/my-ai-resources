---
name: agent-structured-output
description: Covers how to get reliable machine-readable output from AI agents —
  separate the thinking turn from the formatting turn, keep schemas flat and
  bounded, offload substantive content to files and return a small manifest,
  inject orchestrator-owned fields after parsing, and validate the manifest and
  the referenced files at the boundary. Includes schema design do/don't lists,
  prompting rules, the failure model, layered extraction, and one bounded repair
  turn. Use when an agent's JSON response drives workflow state, when designing
  a response schema or JSON Schema/Zod contract for an agent, when structured
  output keeps failing validation, or when deciding what belongs in JSON versus
  in a generated file.
---

# Agent Structured Output

When an agent's response drives workflow state, that response is load-bearing: malformed JSON, an oversized field, or prose in the wrong place fails the run even when the agent did the underlying analysis correctly. The fix is not a better prompt so much as a smaller job — make the final structured response the easiest part of the task, put the real content in files, and validate strictly at the boundary. This skill covers the contract design, the prompting rules, and the recovery path.

## Core principles

1. **Separate thinking from formatting.** Do not ask an agent to research, weigh tradeoffs, reason through a problem, *and* satisfy a strict schema in one response when the result matters. Use one turn for analysis with no output-format pressure, then a follow-up turn whose only job is converting the prior answer into the required shape.
2. **Do not make models think in JSON.** JSON is a transport format, not a reasoning medium. Let the model reason in natural language; use structured output only as the final handoff.
3. **Keep schemas simple.** Prefer flat objects, short arrays, scalar fields, enums, and stable identifiers. Avoid deep nesting, unions inside unions, large maps, recursive structures, and fields that force the model to preserve complicated relationships across a large response.
4. **Bound every inline text field.** Every string should have one narrow purpose — a summary, identifier, status, path, or short rationale — and a length the model is told to respect in the field description and the prompt. Keep the real bounds in the authoritative schema and enforce them after parsing.
5. **Always offload substantive content to files.** The structured response is a small manifest referencing artifacts the agent created. The main answer, analysis, audit, citations, and long supporting material live in those artifacts.
6. **Make file use unconditional.** Never say "use a file if the content is long." A conditional rule makes the agent choose between two output strategies. Always require files, even for modest responses, so the model has one path to follow.
7. **Validate both the manifest and the files.** Schema validation proves the manifest's shape. File validation proves the referenced artifacts exist, stay inside the expected directory, are non-empty, and are within size limits.

## The two-turn protocol

Use this for any structured response that matters.

**Analysis turn**
- Give the agent the task and its role instructions.
- Allow normal prose, notes, drafts, and reasoning output.
- Encourage it to create the required files during this turn when the environment permits file writes.
- Do not enforce the final schema here.

**Formatting turn**
- Tell the agent to use its prior answer and the files it generated.
- Require it to create or update the standard artifact files before responding.
- Require the response to be *only* the manifest.
- Explicitly forbid embedding file contents, markdown bodies, or long prose in the manifest.

The second turn has exactly one job, which is why it succeeds. Failure pressure comes from stacking obligations.

## Schema design rules

**Do**

- `snake_case` field names.
- Shared field names across related agents and phases, so downstream code reads one vocabulary.
- `summary` and `artifacts` as the common manifest fields wherever they apply.
- Short bounded ids: `answer`, `audit`, `main`, `D-1`, `PC-1`.
- Arrays with small maximum lengths.
- Enums for decisions and categories.
- Artifact references shaped as `id`, `artifact_type`, `path`, and a short `summary`.

**Don't**

- Inline final answers, reports, audits, or research bodies in JSON.
- Free-form object maps keyed by model-generated strings.
- Large nullable surfaces where many combinations are technically valid.
- Redundant agent-specific field names (`accepted_from_agent_two_draft`) where a generic name works (`accepted_from_other_agent_draft`).
- Optional fields that change the intended output strategy.
- Bookkeeping the orchestrator already owns — see below.

## Orchestrator-owned fields

Some manifest fields are not judgments the model makes. They are facts the orchestrator already knows from the phase it is running: the phase or message kind, the acting agent, the target agent, the round number, and per-artifact tags like round/agent/phase.

Asking the model to emit them is pure downside. It cannot get them more right than the orchestrator, and a self-consistency slip — an artifact tagged with the wrong round, an envelope echoing a stale phase — fails the run on bookkeeping rather than substance. That failure also tends to surface as an opaque root-level validation error with no useful path.

Keep those fields **out of the model-facing schema entirely** and inject them after parsing:

1. The schema the model sees (and any JSON Schema rendered into the prompt) describes only model-authored content.
2. Define that content schema in **strip mode, not strict mode**. If a backend echoes an owned field anyway, it is dropped rather than rejected, then overwritten by the injected value — resilient instead of a hard failure.
3. After parsing the content, inject the orchestrator's values to rebuild the full record, then re-validate the complete object against the authoritative persisted schema.
4. Attribute failures distinctly. A content-schema failure is the model's fault and carries a named path; an injection failure is the orchestrator's fault and says so. Neither collapses into an unattributed root error.
5. Express required-artifact checks as named, path-attributed issues (`artifacts: must include a generated artifact with id "main"`) rather than a bare refinement at the root.

## Artifact file rules

Generated files use a predictable directory layout owned by the workflow — for example a per-run directory keyed by workflow id, round, agent, and phase. The manifest references files under that directory using **relative POSIX paths**.

Reject any reference that:

- is an absolute path
- contains backslashes
- contains traversal segments
- points outside the expected directory for that workflow/round/agent/phase
- does not end in the expected extension
- is missing, empty, or too large

The main user-visible response comes from a generated file, not from a large JSON field.

## Prompting rules

The formatting prompt should be direct and repetitive about the contract:

- Create the required artifact files **first**.
- Put the complete answer or analysis **in those files**.
- Return **only** the JSON manifest.
- Keep every manifest text field short and bounded.
- Do not include markdown file contents in JSON.
- Ensure every artifact reference uses the exact required path pattern.

Include these instructions **even when the backend receives a schema**. Shape validation cannot prove the model chose the right division of content between files and manifest — a schema-valid manifest with the whole report crammed into `summary` still defeats the design.

## Enforcement portability

Treat schema enforcement as an accelerator, never a correctness dependency.

- Send the authoritative schema through a **neutral request layer** in your backend adapter. Do not call a provider SDK directly for application structured output, and do not hand-maintain provider-specific copies of the schema.
- Backends differ in where enforcement happens. Some support native final-response enforcement; others only accept a schema rendered into the prompt as a deterministic final-message instruction. Select that behavior from declared backend capabilities, not from backend identity, and keep the transport choice inside the adapter.
- When rendering a schema into a prompt, retain **every** keyword — string length, pattern, numeric range, array length. Do not strip keywords in shared or caller code; that duplicates transport knowledge and weakens validation.
- **Prompting with a schema is not constrained decoding.** Descriptions and explicit instructions help the model satisfy constraints; they do not guarantee it.
- Express bounds in field descriptions and prompts as advisory generation signals while retaining them in the authoritative schema (e.g. Zod) for post-parse enforcement.
- Re-validate every manifest after the turn with the owning schema's `safeParse`, so a too-long or malformed field becomes a named validation error rather than a runtime surprise.

## Failure model

Make malformed output rare by reducing the difficulty of the final response, then recover once from a correctable transport mistake using precise validation feedback.

The failure modes this design contains:

- The model produces excellent analysis but invalid JSON.
- The model produces parseable JSON with missing, mistyped, or extraneous fields.
- The model fills a bounded field with a full essay.
- The model hits token pressure trying to fit the whole answer into JSON.
- The model uses inconsistent field names across agents.
- The model omits a required file because file use was conditional.
- The workflow accepts a manifest pointing at missing or unsafe paths.

## Layered extraction

Try candidates in priority order:

1. Backend-native structured output.
2. Raw response JSON.
3. The last fenced JSON block in the response.

Run **every** candidate through the same post-turn validation gate. This matters: an invalid higher-priority candidate must not mask a valid correction that appears later in the response.

## One bounded repair turn

When every first-pass candidate fails the gate, make **one** bounded repair turn by default.

- The repair prompt carries the complete schema, a bounded tail of the rejected output, and the named validation issues. It does **not** repeat the full work context.
- A background/one-shot run repairs through a fresh isolated one-shot; a live conversation uses one corrective turn on its resolved runtime.
- The repaired response is extracted and gated exactly once more.
- A second failure returns the normal schema-validation outcome with candidate diagnostics, while preserving the original transcript, content blocks, and artifact references — the work is not lost because the envelope was wrong.
- Callers can explicitly set the repair budget to zero.

## Anti-patterns

- **One turn that reasons and formats.** The most common cause of "great analysis, invalid JSON."
- **The report inside the JSON.** Any field that can hold a document will eventually hold one. Bound it and point at a file.
- **Conditional file use.** "Write a file if the output is long" produces two strategies and intermittent omissions.
- **Echoed bookkeeping.** Round numbers, phases, and agent names in the model-facing schema turn substantive successes into bookkeeping failures.
- **Strict-mode content schemas.** A backend that helpfully echoes an owned field becomes a hard failure instead of a dropped key.
- **Trusting native enforcement.** Native schema support is an accelerator; skipping post-turn validation makes correctness depend on the provider.
- **First-candidate-wins extraction.** Accepting or failing on the first candidate hides a valid later correction.
- **Unbounded repair loops.** Repeated repair turns burn tokens and drift; one bounded attempt, then report with diagnostics.
- **Manifest-only validation.** A shape-valid manifest that points at a missing, empty, or out-of-tree file is still a failed run.

Keep the contract boring: prose in files, small manifests in JSON, strict validation at the boundary.

## Related skills

- `agent-offloading` — offload deterministic work from agents onto code; reserve agents for judgment
- `cli-tools-for-agents` — design a project CLI as the agent tool surface: exit codes, file payloads, jobs, doctor
