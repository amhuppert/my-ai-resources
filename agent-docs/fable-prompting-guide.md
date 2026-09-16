# Prompting Guide: Claude Fable 5.1

Concise prompting reference for Anthropic's Claude Fable 5.1 (`claude-fable-5-1`), released September 1, 2026. Researched against official documentation on **2026-09-15**. Existing Fable 5 prompts generally carry over; re-evaluate effort and apply the behavioral remedies below where needed. Prompt examples adapt the official guidance. API settings belong in the application or agent harness.

## Model facts

- **Model ID:** `claude-fable-5-1` — 1M context, 128K max output, $10/$50 per million input/output tokens. Cache reads cost **$0.25/MTok**, a quarter of Fable 5's rate.
- **Adaptive thinking is always on.** It applies whenever `thinking` is unset; `thinking: {"type": "disabled"}` returns a 400 — omit the param instead. `budget_tokens` (extended thinking) is removed.
- **Omit sampling params:** non-default `temperature`, `top_p`, or `top_k` values return 400. Steer with prompting and effort.
- **Raw chain of thought is never returned.** `thinking.display` supports `"omitted"` (default, empty thinking blocks), `"summarized"` (progress updates plus reasoning summaries), or **`"updates"`** (progress updates only; beta header `thinking-display-updates-2026-08-18`). Render non-empty `thinking` blocks if users need progress text.
- **Assistant-turn prefills return 400.** Use structured outputs (`output_config.format`) or system-prompt instructions.
- **Forced tool choice now returns 400:** `tool_choice` types `any` and `tool` are unsupported. Use `auto` plus an explicit instruction naming the tool. Use `strict: true` for schema-valid tool arguments or structured outputs for JSON responses; schema enforcement does not force a call. `none` remains supported.
- **Effort** (`output_config: {effort: ...}`) is the primary intelligence/latency/cost control: `low | medium | high (default) | xhigh | max`.

## Core principles

### 1. State the goal and intent, not step-by-step instructions

Give the goal, audience, constraints, and success criteria, then leave room for judgment. Re-audit prompts and skills when migrating: procedures written to compensate for older models can constrain better approaches. Give the reason as well as the request:

> I'm working on [the larger task] for [who it's for]. They need [what the output enables]. With that in mind: [request].

### 2. Pick effort deliberately

Start at `high` and run a fresh effort sweep on your own evaluations: the same effort name does not imply the same thinking budget across models. Anthropic reports that `medium` roughly matches Fable 5 at lower cost; use `medium`/`low` where quality holds. Gains are largest at `xhigh`/`max`, which also add latency.

Raise effort for difficult or search-heavy turns and lower it for routine ones. To preserve prompt-cache hits, use a per-message `output_config` on a `role: "system"` message (beta header `mid-conversation-output-config-2026-07-01`) rather than changing the top-level setting. See [per-message effort](https://platform.claude.com/docs/en/build-with-claude/effort#change-effort-mid-conversation-beta).

### 3. Budget for thinking and long deliverables

Single responses can run minutes at higher effort; autonomous runs can take hours. Adjust timeouts and streaming. At `xhigh`/`max`, Fable 5.1 may draft a long deliverable in thinking and then write it again. Prefer `high` unless evaluations justify more effort; size `max_tokens` for **thinking plus the reply**. When needed, append this to the request, substituting its actual limit:

> This turn has a total limit of [max_tokens] tokens, including thinking and the reply. Use thinking to check inputs and settle difficult decisions and structure; write the full deliverable once, in the reply.

To prevent overplanning:

> When you have enough information to act, act. Do not re-derive facts already established in the conversation, re-litigate a decision the user has already made, or narrate options you will not pursue in user-facing messages. If you are weighing a choice, give a recommendation, not an exhaustive survey.

### 4. Ask for progress and a complete final recap

Fable 5.1 gives fewer updates during tool runs. First enable `thinking.display: "updates"` or `"summarized"`, then remove old instructions that suppress narration. If more updates are needed:

> Before starting, briefly say what you will do. Give brief updates as you work. Finish with a self-contained recap of the whole task: what you found, what you did, validation, and anything still unresolved.

Tell the model if users cannot see tool output; ask it to include any necessary results in its reply. For a partial deliverable that must appear verbatim mid-turn, a client-side `send_to_user` tool remains useful: render its input directly and reserve it for user-facing content. Ordinary progress can use the display options above.

Ground status claims in evidence:

> Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. If tests fail, say so with the output; if a step was skipped, say that.

### 5. Complete the authorized scope

On complex async work, Fable 5.1 can still announce the next step or request permission instead of completing it. For **unattended pipelines**, state the operating mode explicitly; do not claim the user is absent in an interactive session:

> You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task. Proceed with reversible actions covered by the request. Stop for destructive actions, genuine scope changes, or input only the user can provide. Before ending, carry out any next step you have announced. Complete all unblocked parts and report exactly what remains blocked.

Pair persistence with boundaries:

> The request or approved plan sets the deliverable. Implement every requested behavior without quietly narrowing or expanding it. When the user asks only for an assessment, report findings and stop. Before changing system state, verify that the evidence supports that specific action.

### 6. Keep edits and tests proportional

Fable 5.1 may fix nearby issues, add excess permanent tests, or rewrite whole files for small changes. Steer these separately from task completion:

> Implement the requested behavior completely. Report unrelated bugs or improvements as follow-ups unless they prevent the requested behavior from working. Verify the change; keep permanent tests when requested or established by this repository, sized like neighboring tests. Scratch checks need not become permanent files. Prefer targeted edits when they produce the same result; rewrite a whole file only when its size or the extent of changes warrants it.

### 7. Batch independent tool calls

In coding and computer-use loops, Fable 5.1 sometimes serializes independent calls whose need is implied. Append a short reminder after each batch of tool results:

> First privately list what you need next; then request every item that doesn't depend on another's result in this one response.

Use a turn-scoped system message (see below), or a text block after the `tool_result` blocks in the same user message. Keep earlier copies unchanged. Calls that need another result must remain sequential.

### 8. Let the lead agent work alongside subagents

When delegation is available, have the spawn tool return immediately, deliver results later in a user message, and provide a separate wait tool. Let the lead do independent work in the meantime; it can still choose to wait. For long runs, use fresh-context verifiers against the specification at explicit checkpoints.

### 9. Trigger search for current or unfamiliar facts

At `low` effort, Fable 5.1 searches less often and answers from memory more often. Raise effort on affected turns or add:

> Search before answering about an unfamiliar name or a fast-changing area such as AI models and developer tools. Include the name exactly as the user wrote it in at least one query. Recognizing a name does not establish its current state.

### 10. Request readable prose and marked quotations

Fable 5.1 can write denser prose while using fewer headings and lists. Remove blanket anti-formatting rules and specify when structure helps:

> Lead with the outcome. Use direct, literal language, complete sentences, and paragraph breaks. Remove mannered prose. Use headings and lists when they clarify multifaceted content; follow requests for minimal formatting. Make the final summary understandable without the tool history.

For document summaries, demonstrate paraphrasing and marked quotes with **one complete example** in the system prompt: a user request, a correct response, and a short explanation. Model most of the answer in original wording, with any exact source phrases quoted and attributed. See the [official quotation example](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1#quoting-retrieved-sources).

### 11. Give vision work crop-and-zoom tools

For dense charts, images, or video, provide raw assets and image-processing tools such as PIL/OpenCV in a container, or at least a tool that returns cropped, enlarged regions. Let the model inspect and visually verify details iteratively.

## Conversation history and compaction

These are application requirements; prompting alone cannot fix them. See the [5.1 migration guide](https://platform.claude.com/docs/en/models/fable-5-1/migration-guide).

- **Keep history append-only.** Replay assistant turns exactly, including empty thinking blocks. Changing earlier messages, the top-level `system` prompt, tool definitions, or bytes behind image/document URLs invalidates later thinking blocks. The prefix check is enforced by default for accounts created on or after August 31, 2026; older accounts enforce it when `thinking.block_binding.prefix_mismatch_behavior` is set.
- **Diagnose mismatches.** With beta header `thinking-binding-controls-2026-08-01`, set `thinking.block_binding.prefix_mismatch_behavior: "drop_block"` and inspect `input_transformations`. This drops invalidated thinking instead of returning `400: The block is bound to a different conversation`; fix the history edits and choose an explicit production policy.
- **Append instruction changes.** Use mid-conversation `role: "system"` messages. For per-turn reminders, add `clear_at: "next_user_message"` with beta header `mid-conversation-system-clear-at-2026-08-21`. Keep cleared messages byte-for-byte in history; they stop rendering and cost no input tokens. Use documented [mid-conversation tool changes](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages#mid-conversation-tool-changes) instead of rebuilding `tools`.
- **Compact without stale thinking.** Prefer server-side compaction/context editing. For simple client-side compaction, replace the entire history with a summary plus the new user turn. If retaining recent turns behind a client-written summary, strip their `thinking` and `redacted_thinking` blocks or use `drop_block`; those blocks were produced against the old prefix. For background swaps, handle every pre-swap block, not just the first request. Consider later compaction now that cache reads cost less.
- **Preserve continuation state.** In custom summaries, retain exact user decisions, preferences, constraints, and boundaries; completed and unresolved work; problems and resolutions; rejected approaches and why; and hard-to-reconstruct names, numbers, dates, wording, and links. Condense the assistant's explanations more aggressively than the user's requirements.
- **Handle model switches.** Fable 5.1 can read older models' thinking blocks; earlier models cannot read its blocks. The API drops incompatible blocks (reported in `input_transformations` with the binding-controls beta). Do not rely on thinking transferring to an older fallback model.

## Context engineering

The earlier Claude 5-generation context-engineering guidance still provides a useful baseline; apply 5.1-specific remedies only where needed:

- **Rules → judgment.** Anthropic removed over 80% of Claude Code's system prompt for Opus 5/Fable 5 with no measurable eval loss. Replace prohibition lists with intent plus context ("match the surrounding code's comment density" beats "never write comments").
- **Repetition → single authoritative source.** State each instruction once, in the one place that owns it — tool usage belongs in tool descriptions, not also in the system prompt.
- **Upfront loading → progressive disclosure.** Keep entry-point files lean; split detail into skills and reference files loaded on demand.
- **Examples → interface design.** Prefer expressive tools and typed parameters to routine usage examples. Keep examples for real requirements, such as the quotation behavior above.
- **CLAUDE.md stays lightweight:** a brief repo description plus non-obvious gotchas — not every known practice, and not a memory repository (auto-memory handles that).
- **Specs → rich references.** Prefer code (test suites, reference implementations), HTML artifacts, and rubrics over prose descriptions — source code over screenshots.
- **Instruction-sensitivity balance:** provide enough context to expose consequential unknowns while leaving room to change approach. Surface assumptions and architecture-changing decisions early.
- **Memory:** store one durable lesson per file with a one-line summary and the reason it mattered. Record corrections and confirmed approaches; update duplicates and remove wrong notes. Keep material already recorded in the repo out of memory.
- **Context-budget anxiety:** avoid remaining-context countdowns that encourage premature stopping. Explain how continuation works. This differs from giving an accurate per-response `max_tokens` limit for a long deliverable.

## Pitfalls

- **Reasoning extraction:** requests to echo internal reasoning can trigger `reasoning_extraction`. Use `thinking.display: "summarized"` for supported summaries; audit prompts for instructions to transcribe hidden reasoning.
- **Refusals:** inspect `stop_reason: "refusal"` and `stop_details.category` even on HTTP 200. Categories still include offensive cyber, bio/life sciences, and reasoning extraction; benign requests can also trigger. Finding vulnerabilities in source code is permitted, and 5.1 has fewer false positives than Fable 5 at launch.
- **Benign coding false positives:** give documentation for lesser-known languages and remove unnecessary base64 blobs from tool output. Anthropic also reports fewer false positives with bug-finding wording ("Are there any bugs in this program?") than compile-check wording; preserve the actual task and required build checks.
- **Fallback:** `fallbacks: "default"` (beta header `server-side-fallback-2026-07-01`) routes to Anthropic's recommended model for the refusal category. Explicit targets may be `claude-opus-4-8` or `claude-opus-5`; client-side fallback is also supported. Refusals before any output are not billed. See [refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback).
- **Oversteering:** replace aggressive legacy instructions with brief, specific guidance; evaluate changes against observed behavior.

## Sources

- [Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1) (primary source for behavioral remedies)
- [What's new in Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1) (API changes, pricing, refusals/fallback)
- [Fable 5.1 migration guide](https://platform.claude.com/docs/en/models/fable-5-1/migration-guide) (history binding, compaction, tool choice)
- [Claude Fable 5.1 overview](https://platform.claude.com/docs/en/models/fable-5-1/overview) (release date and specs)
- [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) (inherited intent, memory, verification, and verbatim-delivery guidance)
- [The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) (Jul 24, 2026)
- [A field guide to Claude Fable 5: Finding your unknowns](https://claude.com/blog/a-field-guide-to-claude-fable-finding-your-unknowns) (Jul 6, 2026)
