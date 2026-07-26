# Prompting Guide: Claude Fable 5

Concise prompting reference for Anthropic's Claude Fable 5 (`claude-fable-5`), distilled from Anthropic's official docs (June 2026 launch) and July 2026 context-engineering guidance. Fable 5 is Anthropic's most capable widely released model, built for long-horizon agentic work — tasks that take a person hours, days, or weeks.

## Model facts

- **Model ID:** `claude-fable-5` — 1M context, 128K max output, $10/$50 per MTok in/out
- **Adaptive thinking is always on.** It applies whenever `thinking` is unset; `thinking: {"type": "disabled"}` returns a 400 — omit the param instead. `budget_tokens` (extended thinking) is removed.
- **Sampling params removed:** `temperature`, `top_p`, `top_k` return 400. Steer with prompting.
- **Raw chain of thought is never returned.** `thinking.display: "omitted"` (default, empty thinking blocks) or `"summarized"` (readable summary). Set `"summarized"` if you surface reasoning, or the UI shows a long pause before output.
- **Assistant-turn prefills return 400.** Use structured outputs (`output_config.format`) or system-prompt instructions.
- **Safety classifiers can refuse** (offensive cyber, bio/life sciences, reasoning extraction) via `stop_reason: "refusal"` on an HTTP 200. Configure server-side (`fallbacks` param, beta) or client-side fallback to `claude-opus-4-8`; refused-before-output requests aren't billed.
- **Effort** (`output_config: {effort: ...}`) is the primary intelligence/latency/cost control: `low | medium | high (default) | xhigh | max`.

## Core principles

### 1. State the goal and intent, not step-by-step instructions

Older models did best with exhaustive procedures; over-prescriptive prompts **cap Fable 5's quality**. Say what you're actually trying to achieve and let it connect the dots. Re-audit existing prompts and skills when migrating — instructions written for prior models often degrade output. Give the reason, not only the request:

> I'm working on [the larger task] for [who it's for]. They need [what the output enables]. With that in mind: [request].

### 2. Pick effort deliberately

Default to `high`; use `xhigh` for the most capability-sensitive work, `medium`/`low` for routine tasks. Lower effort on Fable 5 still often exceeds `xhigh` on prior models. Reduce effort if tasks complete but take longer than necessary. Start at the top of your difficulty range — testing Fable 5 only on simple workloads undersells it.

### 3. Expect longer turns; prevent overplanning

Single responses can run minutes at higher effort; autonomous runs can take hours. Adjust client timeouts, streaming, and progress UX before migrating. To keep it from overplanning on ambiguous tasks:

> When you have enough information to act, act. Do not re-derive facts already established in the conversation, re-litigate a decision the user has already made, or narrate options you will not pursue in user-facing messages. If you are weighing a choice, give a recommendation, not an exhaustive survey.

To prevent unrequested tidying/refactoring at high effort:

> Don't add features, refactor, or introduce abstractions beyond what the task requires. Do the simplest thing that works well. Only validate at system boundaries (user input, external APIs).

### 4. Brief instructions steer strongly

Instruction-following is strong enough that one short instruction replaces enumerating every behavior. Example brevity instruction:

> Lead with the outcome. Your first sentence after finishing should answer "what happened" or "what did you find." Supporting detail comes after. Keep output short by being selective about what you include, not by compressing into fragments, abbreviations, or arrow chains.

Checkpoint behavior in long workflows:

> Pause for the user only when the work genuinely requires them: a destructive or irreversible action, a real scope change, or input that only they can provide.

### 5. Ground progress claims on long runs

This nearly eliminated fabricated status reports in Anthropic's testing:

> Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. If tests fail, say so with the output; if a step was skipped, say that.

### 6. State the boundaries

Fable 5 can occasionally take unrequested actions (drafting an email, creating backup branches). Constrain explicitly:

> When the user is describing a problem or thinking out loud rather than requesting a change, the deliverable is your assessment. Report your findings and stop. Before running a command that changes system state, check that the evidence actually supports that specific action.

### 7. Use parallel subagents and fresh-context verifiers

Fable 5 dispatches and manages parallel subagents far more dependably than prior models. Prefer async communication over blocking; long-lived subagents keep cache warm and avoid bottlenecking on the slowest one.

> Delegate independent subtasks to subagents and keep working while they run. Intervene if a subagent goes off track or is missing relevant context.

For self-verification on long runs, separate fresh-context verifier subagents outperform self-critique: *"Establish a method for checking your own work at an interval of [X] as you build. Run this every [X interval], verifying your work with subagents against the specification."*

### 8. Give it a memory system

Fable 5 excels when it can record lessons across runs — a Markdown file is enough:

> Store one lesson per file with a one-line summary at the top. Record corrections and confirmed approaches alike, including why they mattered. Don't save what the repo or chat history already records; update an existing note rather than creating a duplicate; delete notes that turn out to be wrong.

### 9. Handle the rare failure modes

- **Early stopping:** deep in long sessions it may state intent ("I'll now run X") without the tool call, or ask permission it doesn't need. For autonomous pipelines: *"You are operating autonomously… For reversible actions that follow from the original request, proceed without asking. Before ending your turn, check your last paragraph — if it is a plan, a question, or a promise about undone work, do that work now."*
- **Context-budget anxiety:** avoid surfacing remaining-token countdowns; if you must, add: *"You have ample context remaining. Do not stop, summarize, or suggest a new session on account of context limits."*

### 10. Readable final summaries in agentic sessions

After many tool calls, output can drift into dense shorthand. Instruct: working shorthand is fine between tool calls, but the final summary is for a reader who saw none of it — outcome first, complete sentences, no arrow chains or invented labels, re-introduce any vocabulary built up while working.

### 11. Create a `send_to_user` tool for long async agents

A client-side tool whose input is rendered verbatim in the UI lets the agent surface deliverables/progress mid-turn (tool inputs are never summarized). The tool alone isn't enough — pair it with: *"Between tool calls, when you have content the user must read verbatim, call send_to_user. Use it only for user-facing content, not narration."*

## Context engineering (July 2026)

From Anthropic's context-engineering rules for Claude 5-generation models and the Fable 5 field guide (both in Sources):

- **Rules → judgment.** Anthropic removed over 80% of Claude Code's system prompt for Opus 5/Fable 5 with no measurable eval loss. Replace prohibition lists with intent plus context ("match the surrounding code's comment density" beats "never write comments").
- **Repetition → single authoritative source.** State each instruction once, in the one place that owns it — tool usage belongs in tool descriptions, not also in the system prompt.
- **Upfront loading → progressive disclosure.** Keep entry-point files lean; split detail into skills and reference files loaded on demand.
- **Examples → interface design.** Expressive tool and parameter design (enums, typed fields) beats usage examples; keep an example only when it encodes a real requirement.
- **CLAUDE.md stays lightweight:** a brief repo description plus non-obvious gotchas — not every known practice, and not a memory repository (auto-memory handles that).
- **Specs → rich references.** Prefer code (test suites, reference implementations), HTML artifacts, and rubrics over prose descriptions — source code over screenshots.
- **Instruction-sensitivity balance:** too specific and Fable 5 follows instructions even when a pivot would be better; too vague and it defaults to generic industry practice. Close the gap by surfacing unknowns: blind-spot passes on unfamiliar domains, one-question-at-a-time interviews prioritizing architecture-changing answers, implementation plans that lead with the decisions most likely to be tweaked, and a running deviations log during execution.

## Pitfalls

- **Never instruct Fable 5 to echo/transcribe its internal reasoning as response text** — this triggers the `reasoning_extraction` refusal classifier and elevates fallbacks. Read structured `thinking` blocks (with `display: "summarized"`) instead. Audit skills/prompts for "show your thinking" language when migrating.
- Don't use it for offensive cybersecurity or bio/life-sciences work — classifier refusals; benign work in those domains may also trigger, so wire up fallback.
- Pass thinking blocks back unchanged in multi-turn conversations on the same model.
- Aggressive instruction language tuned for older models ("CRITICAL: YOU MUST…") over-triggers — dial it back.

## Sources

- [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) (official, primary source)
- [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5) (API changes, refusals/fallback)
- [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) (specs)
- [The new rules of context engineering for Claude 5 generation models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) (Jul 24, 2026)
- [A field guide to Claude Fable 5: Finding your unknowns](https://claude.com/blog/a-field-guide-to-claude-fable-finding-your-unknowns) (Jul 6, 2026)
