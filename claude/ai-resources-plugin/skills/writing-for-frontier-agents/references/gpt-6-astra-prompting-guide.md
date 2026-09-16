# Prompting Guide: OpenAI GPT-6 Astra

Concise prompting reference for `gpt-6-astra`, researched against official OpenAI documentation on **2026-09-09**. Companion to the [Fable guide](fable-prompting-guide.md) and [GPT-5.6 Sol guide](gpt-5.6-sol-prompting-guide.md). Prompt examples below adapt the official guidance. Configure API settings through the application or agent harness.

## Model facts

- **Role:** OpenAI's most capable model for complex reasoning, coding, computer use, research, and document creation.
- **Limits:** 1,050,000-token context, 922,000 max input, 128,000 max output; knowledge cutoff 2026-04-30. Text/image input, text output. See the [Astra model page](https://developers.openai.com/api/docs/models/gpt-6-astra).
- **Reasoning effort:** `low | medium | high | xhigh | max`. Astra supports neither `none` nor `minimal`. When migrating, preserve the effective effort if supported; replace `none`/`minimal` with `low` and evaluate.
- **Tool calling requires Responses.** Chat Completions is supported for requests without tools. Remove `temperature`, `top_p`, and log-probability options when migrating. See [Astra migration guidance](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart).

## Core principles

### 1. Define the outcome and completion criteria

Keep the useful GPT-5.6 baseline: provide the goal, relevant context, constraints, evidence requirements, and what must be true before finishing. Let the model choose routine implementation steps. Remove duplicate rules and examples that do not change behavior; retain domain requirements and meaningful tool-routing instructions. See the shared [GPT-5.6 prompting guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6).

```text
Goal: [the finished result and who will use it]
Context: [relevant files, evidence, and prior decisions]
Constraints: [scope, permissions, and required conventions]
Done when: [observable acceptance criteria and validation]
Output: [artifact, format, and essential supporting evidence]
```

### 2. Specify when to act, ask, and continue

**Astra asks for clarification more readily than Sol**, even though it maintains coherence better over long tasks. Tune the collaboration policy to your workflow. For an implementation agent, make action requests and existing authorization explicit; prepare authorized work before an approval boundary. See [initiative and follow-through](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#initiative-and-follow-through).

```text
Treat requests to build or fix something, including "can you...", as requests
to execute. Use prior context to infer scope and make routine assumptions.
Complete the authorized work and relevant validation before finishing.
Ask a focused question when the missing answer materially changes the result;
continue independent work while awaiting it. Where approval is required,
first prepare the concrete result the user will review.
```

Keep the actual permission policy in one place. Distinguish a request for assessment from a request for implementation, and specify which actions require additional authorization. Repeated permission prompts should be diagnosed against that policy and the conversation's existing authorization.

### 3. Audit skills and instruction files

**Astra is more sensitive to instructions in skills and `AGENTS.md`.** An ambiguous guideline can become an unintended stopping condition. Audit the files the agent can load, resolve conflicting rules, and state how user intent relates to skill guidance within your application's instruction hierarchy. OpenAI recommends making user instructions take precedence over skill guidelines. See [instruction following](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#instruction-following).

```text
Apply skill guidelines in service of the user's request. Explicit user
instructions override skill guidelines. If a file causes you to pause or
change course, identify the file and exact instruction, and explain whether
the restriction is explicit or your interpretation.
```

This does not override higher-priority system/developer rules or tool permissions.

### 4. Specify readable output

**Astra tends toward detailed, heavily formatted responses and recurring phrases.** GPT-5.6's guidance instead emphasizes its increased concision relative to GPT-5.5. Re-evaluate inherited brevity instructions when switching models. Use `text.verbosity: low | medium | high` for baseline detail and the prompt for required content and style. See [Astra writing style](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#personality-and-writing-style) and [verbosity configuration](https://developers.openai.com/api/docs/guides/deployment-checklist#set-up-textverbosity).

```text
Start with the result. Use plain language and connected paragraphs; use lists
or tables when they make the information easier to compare. Include evidence
and material limitations. Keep technical detail appropriate to the reader.
Trim stock phrases, repeated conclusions, and unnecessary formatting.
```

### 5. Set delegation expectations

**Astra may delegate less often than a workflow needs.** If the application exposes subagents, specify when to use them and the desired scope. Tool availability alone does not establish the delegation policy. See [subagent delegation](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#subagent-delegation).

```text
Delegate independent, bounded tasks when this is likely to improve quality
or completion time. Give each agent a clear deliverable and necessary context.
Continue useful work while agents run, then review and integrate their results.
Write inter-agent messages legibly because people may read them.
```

### 6. Bound verification by the change

**Astra can run broader or more repetitive tests than small changes warrant.** Define sufficient verification and a stopping condition instead of adding generic demands for more thoroughness. See [testing and verification](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#testing-and-verification).

```text
Run the required checks and validation relevant to the changed behavior.
Add tests when they verify a meaningful requirement. Once checks pass, repeat
or broaden them only for new changes, failures, or an unresolved concern.
Report what was verified and any checks that could not be completed.
```

### 7. Tune reasoning using representative tasks

Preserve a supported effort setting as the migration baseline. For new workloads, evaluate `medium` as a starting point; compare `low` for latency-sensitive work and higher levels when measured quality warrants the extra time and tokens. Reserve `max` for difficult work that benefits in evaluations. Set effort explicitly for repeatable comparisons. See [reasoning effort](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort).

Fix missing context, contradictory instructions, and unclear success criteria before escalating effort. Change one part of a working prompt at a time and rerun the same tasks; measure completion, correctness, latency, and cost. See the [prompt migration workflow](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6#prompt-migration-workflow).

## Long-running work and API support

- **Async tools:** Astra can keep working while application-run function/custom tools execute. Configure `async: true`, return results with their original `call_id`, and wait only when subsequent work depends on a pending result. This requires application job management; it does not apply to hosted built-in tools or Programmatic Tool Calling. See [async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling).
- **Mid-turn steering:** Responses over WebSockets accepts corrections while Astra is working. GPT-5.6 does not support this. Steering does not undo completed actions or cancel tools already started; the application must handle the continuation and pending results. See [mid-turn steering](https://developers.openai.com/api/docs/guides/steering).
- **Effort changes without changing the cached prefix:** Astra supports `configuration_update` between responses in standard, single-agent mode. Keep request-level effort stable. This has compatibility limits, including automatic compaction/truncation; check them before combining features. See [changing reasoning effort](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation).
- **Conversation continuity:** Preserve response items, including assistant `phase` and opaque reasoning items, when replaying history. `previous_response_id` preserves prior response state, but request-level `instructions` must be supplied again. Persisted reasoning is reusable only within a compatible model family; switching between Sol, Terra, and Luna preserves compatible reasoning, while switching families omits incompatible items. See [reasoning continuity](https://developers.openai.com/api/docs/guides/reasoning#preserve-reasoning-across-calls) and [instruction persistence](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following).

## Sol, Terra, and Luna compared with Astra

OpenAI publishes one prompting guide for Sol **and the GPT-5.6 family**. The official pages reviewed do not prescribe separate Terra/Luna prompting styles. Start with the shared prompt, then evaluate each tier on the intended workload; a shared API surface does not establish equal task performance. See the [GPT-5.6 guide](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6) and [family prompting guidance](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6).

| Model                                                                        | Documented positioning                                                         | Prompting implication                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra)     | Most capable; hardest work from request to finished result                     | Tune clarification, instruction-file sensitivity, writing, delegation, and testing as above. |
| [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)     | GPT-5.6 flagship for complex professional work                                 | Shared outcome-focused GPT-5.6 guidance; `gpt-5.6` is an alias for Sol.                      |
| [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra) | Balances intelligence and cost; corresponds roughly to the earlier mini tier   | Use the shared guidance and validate the quality/cost tradeoff for the task.                 |
| [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)   | Cost-sensitive, high-volume work; corresponds roughly to the earlier nano tier | Use the shared guidance and validate task success before routing volume to it.               |

All three GPT-5.6 tiers list the same context/input/output limits as Astra, text/image input and text output, and the same tool lists. They support `none | low | medium (default) | high | xhigh | max`; Astra removes `none`. GPT-5.6's cutoff is 2026-02-16, versus Astra's 2026-04-30. These are documented capabilities, not guarantees about effective recall or task accuracy. See the model pages linked in the table.

Programmatic Tool Calling, multi-agent orchestration, persisted reasoning, prompt caching, compaction, and pro mode already existed in GPT-5.6. Astra's async tools, mid-turn steering, and cache-preserving effort updates are distinct additions. See [what changed in Astra](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#gpt-6-astra-what-is-new).

## Migration pitfalls

- In Responses, remove `message.output_text.logprobs` from `include` as well as unsupported sampling options. In Chat Completions, remove `logprobs` and `top_logprobs`; move tool workflows to Responses.
- Use the model-specific links in this guide when revisiting it: the unqualified `latest-model` page can change its target. Recheck compatibility against [Astra's migration guidance](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart).
