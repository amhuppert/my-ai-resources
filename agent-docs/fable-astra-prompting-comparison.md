# Prompting Comparison: Claude Fable 5.1 and GPT-6 Astra

Use when adapting prompts, skills, or an agent harness between `claude-fable-5-1` and `gpt-6-astra`. Based on official documentation reviewed **2026-09-15**. This compares documented behaviors and recommended interventions; it is not a head-to-head performance evaluation. A behavior highlighted for one model can occur in the other.

Detailed references: [Fable 5.1 prompting guide](fable-prompting-guide.md) and [Astra prompting guide](gpt-6-astra-prompting-guide.md).

## Shared starting point

Both benefit from a clear outcome, relevant context, explicit boundaries, and observable completion criteria. Keep instructions lean, resolve contradictions, and let the model choose routine steps. Add model-specific instructions in response to observed failures.

```text
Goal: [finished result, intended audience, and why it matters]
Context: [sources, relevant files, prior decisions, and unknowns]
Constraints: [scope, permissions, and required conventions]
Done when: [observable acceptance criteria and relevant validation]
Output: [artifact or answer, format, and supporting evidence]

Complete the authorized scope and make routine decisions from context.
Ask when missing information materially changes the work; continue independent
work while waiting when the workflow supports it. State assumptions and blockers.
Report results against evidence. Finish with a self-contained summary.
```

For unattended work, explicitly say that the user cannot answer mid-task and define the conditions that require stopping. For interactive work, define the desired clarification and update cadence. Keep the permission policy authoritative in one place.

## Where to tune differently

The behavior descriptions below come from [Anthropic's Fable 5.1 prompting guidance][fable-prompting] and [OpenAI's Astra prompting guidance][astra-prompting], with inherited shared practices described in the companion guides.

| Concern | Fable 5.1 | Astra |
| --- | --- | --- |
| **Follow-through** | Can announce the next step or seek permission before completing an async task. Define completion as doing the whole authorized task; require announced steps to become actions before ending. | More likely than Sol to clarify when an answer could change the result. Make implied authorization explicit, including “can you build/fix…”; prepare authorized work before an approval boundary. |
| **Skills and instructions** | Retain intent and constraints while removing obsolete procedures, repeated rules, and unnecessary examples. Leave room to change approach. | Audit skills and `AGENTS.md` for ambiguous rules that become stopping conditions. State the relationship between user instructions and skill guidelines; require the exact file and instruction when a rule causes a pause. |
| **Progress updates** | Gives fewer updates in long tool runs, especially at high effort. Enable readable updates in the client, remove narration-suppression rules, then request an opening line, periodic updates, and a full recap. | Specify the cadence your product needs. Preserve assistant `phase` values when replaying history so intermediate messages retain their intended role. |
| **Writing and formatting** | Can produce dense prose while using too little structure. Ask for literal language and paragraph breaks; remove blanket bans on headings, lists, and bold. | Tends toward detailed, formatted responses and recurring phrases. Ask for connected paragraphs, selective structure, and plain language; set `text.verbosity` for baseline detail. |
| **Edits and tests** | May fix nearby issues, add excess permanent tests, or rewrite an entire file for a small change. Define scope, prefer targeted edits, and distinguish scratch verification from permanent tests. | May run broader or more repetitive tests than needed. Define sufficient checks and stop after they pass unless changes, failures, or unresolved concerns justify more. |
| **Tool batching** | May serialize independent calls when their need is implied in coding or computer-use loops. Add a short batching reminder after tool results. | Specify tool-routing and concurrency policy where it matters. The Astra guide does not identify the same batching regression; evaluate before adding a repetitive reminder. |
| **Subagents** | Let the lead keep working: return immediately from spawn, deliver results later, and provide a separate wait tool. | May delegate less than desired. State when delegation is appropriate, give bounded deliverables and context, and require legible inter-agent messages. |
| **Search and evidence** | At `low` effort, searches less and answers from memory more than Fable 5. Explicitly require verification of current or unfamiliar names, using the user's exact wording in a query. | Specify evidence requirements and tool routing for the task. The reviewed Astra guide does not establish an equivalent low-effort search regression. |
| **Quotations** | More likely than Fable 5 to reproduce source text without marking quotes. Add one complete example showing a request, a paraphrased answer with attributed quotations, and why it is correct. | Keep quotation and citation requirements explicit. The reviewed Astra guide does not call out the same regression. |

## Effort and long outputs

Both support `low`, `medium`, `high`, `xhigh`, and `max`; the labels do not establish equal compute, quality, or cost across providers.

- **Fable 5.1:** Anthropic recommends starting at its default, `high`, and running a fresh effort sweep. Test `medium`/`low` for routine work. At `xhigh`/`max`, long deliverables can be drafted in thinking and then written again; budget `max_tokens` for thinking plus the answer and ask the model to write the full deliverable once.
- **Astra:** Preserve the effective supported effort when migrating; replace unsupported `none`/`minimal` with `low` and evaluate. For new workloads, `medium` is a reasonable evaluation starting point, not a claim about Astra's API default. Compare higher settings where quality warrants the latency. Use `reasoning.effort` explicitly for repeatable comparisons.

Evaluate completed tasks, correctness, unnecessary questions, scope changes, tool round trips, validation, latency, and total cost. Fix missing context and conflicting instructions before increasing effort. Change one variable at a time.

## Targeted prompt additions

Use only the addition that addresses an observed problem. These are adaptations of the official guidance, not universally required system prompts.

### Fable: quiet or serialized tool loops

```text
Briefly state what you will do, give useful progress updates, and finish with
a recap of the whole task. Ground progress claims in results you have observed.
Request independent tool calls together; wait for a result only when the next
action depends on it.
```

For repeated batching reminders, use the history-preserving placement described below. A prompt cannot make hidden progress blocks visible; configure the client too.

### Fable: oversized changes

```text
Implement every requested behavior. Report unrelated improvements as follow-ups
unless they are necessary for the requested behavior to work. Prefer targeted
edits. Keep permanent tests proportional to the change and repository practice;
scratch checks need not become permanent files.
```

### Astra: repeated clarification or skill-induced pauses

```text
Treat requests to build or fix something as requests to execute. Use existing
authorization and context to make routine decisions. When approval is required,
prepare the authorized, reviewable result first. If a skill causes a pause,
link the exact file, quote the instruction, and distinguish an explicit rule
from your interpretation. Explicit user instructions override skill guidelines.
```

The instruction hierarchy and tool permissions still apply; this does not override higher-priority system or developer rules.

### Astra: excess verification

```text
Complete required checks and validation relevant to the change. Once they pass,
broaden or repeat them only for new changes, failures, or unresolved concerns.
Report what was verified and what could not be checked.
```

## Application differences that prompting cannot fix

Consult the linked API documentation before implementing these features; beta support and compatibility vary by platform.

| Area | Fable 5.1 | Astra |
| --- | --- | --- |
| **Visible progress** | `thinking.display: "updates"` exposes progress with beta header `thinking-display-updates-2026-08-18`; `"summarized"` includes progress and reasoning summaries. Default `"omitted"` hides them. | Preserve response items and assistant `phase`. Use `text.verbosity` to control answer detail; it does not replace a progress-update policy. |
| **Tool execution** | Forced `tool_choice` types `any`/`tool` return 400. Use `auto`, explicit routing instructions, and strict schemas where needed. | Tool calling requires Responses. `async: true` applies to application-run function/custom tools; return results with their original `call_id`. It does not apply to hosted tools or Programmatic Tool Calling. In multi-agent mode, do not combine async tools with parallel tool calls. |
| **History** | Keep history append-only and preserve thinking blocks. Prefix edits can invalidate later thinking. Use mid-conversation system messages; turn-scoped reminders use `clear_at: "next_user_message"` and its beta header. Keep cleared messages in history. | Preserve opaque reasoning and other response items. `previous_response_id` carries prior state, but supply request-level `instructions` again. Reuse reasoning only within compatible model families. |
| **Effort changes** | Append a system message with per-message `output_config` and beta header `mid-conversation-output-config-2026-07-01` to preserve the cached prefix. | Append `configuration_update` in standard, single-agent mode while keeping request-level effort stable. Response `reasoning.effort` still reports the request-level setting. |
| **Compaction** | Prefer server-side compaction/context editing. A client-written summary must not carry stale thinking from retained turns; strip affected blocks or use the documented `drop_block` control. | `configuration_update` is incompatible with automatic compaction/truncation and standalone `/responses/compact`. Explicit `compaction_trigger` is supported; restore the desired effort with a fresh update afterward. |

Fable's prefix check is enforced by default for accounts created on or after August 31, 2026; older accounts activate enforcement by setting the documented binding control. See [Fable migration][fable-migration] for precise rules and beta headers. For Astra, see [reasoning and configuration updates][astra-reasoning], [async tools][astra-async], and [instruction persistence][astra-instructions].

Across providers, carry forward a readable task summary containing decisions, constraints, completed work, evidence, and open issues. Rebuild the provider-specific conversation state; opaque reasoning blocks are not a portable memory format.

## Applying the comparison

1. Keep the task's goal, evidence requirements, permissions, and completion criteria stable.
2. Configure the target API and client behavior before diagnosing prompt failures.
3. Start with the shared prompt; add a targeted instruction for a failure visible in real traces.
4. Run the same representative tasks and compare completed outcomes, latency, and cost.
5. Retain only changes that help. Provider-specific tendencies guide what to inspect; your evaluations determine what to keep.

## Sources

- [Anthropic: Prompting Claude Fable 5.1][fable-prompting] — behavioral differences, effort, progress, scope, search, quotations, and async delegation.
- [Anthropic: Fable 5.1 migration guide][fable-migration] — tool choice, history binding, compaction, and per-message settings.
- [OpenAI: Using GPT-6 Astra][astra-prompting] — initiative, skills, writing, delegation, testing, and migration baseline.
- [OpenAI: GPT-5.6 prompting guidance][shared-prompting] — inherited outcome, evidence, and evaluation practices.
- [OpenAI: Reasoning models][astra-reasoning] — effort, continuity, assistant phase, and configuration-update compatibility.
- [OpenAI: Async tool calling][astra-async] — application execution and multi-agent restrictions.
- [OpenAI: Prompt engineering][astra-instructions] — request-level instruction persistence.

[fable-prompting]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1
[fable-migration]: https://platform.claude.com/docs/en/models/fable-5-1/migration-guide
[astra-prompting]: https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md
[shared-prompting]: https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6
[astra-reasoning]: https://developers.openai.com/api/docs/guides/reasoning
[astra-async]: https://developers.openai.com/api/docs/guides/async-tool-calling
[astra-instructions]: https://developers.openai.com/api/docs/guides/prompt-engineering
