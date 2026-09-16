# Prompting Guide: OpenAI GPT 5.6 Sol

Concise prompting reference for OpenAI's GPT 5.6 Sol (`gpt-5.6-sol`), distilled from OpenAI's official prompting guidance (July 2026 release). Sol is the flagship tier of the GPT 5.6 family; Terra (`gpt-5.6-terra`) and Luna (`gpt-5.6-luna`) are the balanced and fast/affordable tiers.

**This guide applies to the whole GPT 5.6 family.** OpenAI's official prompting guidance covers "GPT-5.6 Sol or the GPT-5.6 family" with no Terra- or Luna-specific prompting advice — all three share the same parameter surface, effort levels, and tool support. Pick the tier by task difficulty and economics (routing decision), not by prompting style.

## Model facts

- **Model IDs:** `gpt-5.6-sol` (flagship; alias `gpt-5.6` routes here), `gpt-5.6-terra` (mid-tier), `gpt-5.6-luna` (fast tier)
- **All tiers:** 1,050,000-token context, 128K max output, knowledge cutoff Feb 2026
- **Pricing per 1M in/out:** Sol $5/$30, Terra $2.50/$15, Luna $1/$6. Long-context surcharge above 272K input tokens: 2× input, 1.5× output
- **`reasoning.effort`:** `none | low | medium (default) | high | xhigh | max` — same six levels on all tiers
- **`text.verbosity`:** `low | medium | high` — prefer this over prose brevity instructions
- **New in 5.6:** programmatic tool calling (PTC), multi-agent support, prompt cache breakpoints
- Fine-tuning is not supported; input is text+image, output text only

## Core principles

### 1. Outcome-first, lean prompts

Define the outcome, important constraints, available evidence, and completion bar — then leave room for the model to choose an efficient path. Describe the destination, not every step.

Simplify aggressively when migrating: remove repeated statements of the same rule, style/process instructions that don't change behavior, and examples that don't change behavior. Keep user-visible outcomes, success criteria, safety/business constraints, and required output shapes. OpenAI's internal coding-agent evals: leaner system prompts improved scores ~10–15% while cutting total tokens 41–66% and cost 33–67%.

GPT 5.6 follows prompt contracts closely — audit remaining instructions for contradictions. Avoid ALWAYS/NEVER except for true invariants.

### 2. Suggested prompt structure (official template)

```
Role | Personality | Goal | Success criteria | Constraints | Tools | Output | Stop rules
```

Success criteria = what must be true before the final answer. Stop rules = when to retry, fall back, abstain, ask, or stop.

### 3. Verbosity: use the parameter, drop stale brevity prose

GPT 5.6 is more concise by default than GPT 5.5 — existing "be concise" instructions may now over-trim. Control baseline length with `text.verbosity`; when trimming in the prompt, specify what must be preserved: *"Lead with conclusion. Include evidence, material caveat, and next action. Omit secondary detail and repetition."*

### 4. Separate personality from collaboration style

- **Personality:** tone, warmth, directness, formality, humor, polish. Describe actual writing choices, not broad labels like "friendly."
- **Collaboration style:** when the model asks questions, makes assumptions, takes initiative, explains tradeoffs, checks work, handles uncertainty.

### 5. Reasoning effort: start where you were, test one level lower

When migrating from GPT 5.5/5.4, preserve the current effort as baseline, then test that setting *and* one level lower — 5.6 often needs less effort for equal quality. `low` for latency-sensitive work when quality holds; `medium` as balanced start; `high`/`xhigh` only with measured eval gains; `max` for the hardest quality-first tasks.

### 6. Define autonomy and approval boundaries

Sol is proactive and persistent on multi-step tasks — state what each request authorizes so it continues safe, in-scope work without unnecessary pauses. Official contract wording:

> For requests to answer, explain, review, diagnose, or plan, inspect relevant materials and report. Do not implement unless also asked. For requests to change, build, or fix, make requested in-scope local changes and run relevant non-destructive validation without asking first.

Require confirmation only for external writes, destructive actions, purchases, or scope expansion. Name safe local actions explicitly; keep the policy concise.

### 7. Tool routing

- Expose only task-relevant tools.
- Tool descriptions should state: what it does, when to use it, important return fields, error behavior.
- Resolve required discovery/retrieval/validation before acting — don't skip a prerequisite because the final state seems obvious.
- Parallelize independent reads; keep sequential only when one result determines the next.
- Try 1–2 meaningful fallbacks before concluding no result exists.

### 8. Programmatic tool calling (PTC)

**Use PTC for:** filtering/joining/sorting/ranking/dedup/aggregation, batching similar records, repeated deterministic validation, large results reducible to a compact schema.

**Use direct calls when:** one call suffices, intermediate outputs are already small, each result changes the next decision, approval is needed, the answer must preserve citations, or the workflow needs semantic judgment.

Don't write generic "use PTC efficiently" instructions. State: the bounded stage, eligible tools, output schema, retry limit, stop condition, and the handoff back to direct judgment.

### 9. Grounding, citations, retrieval budgets

- Define what needs support and what counts as sufficient evidence. Absence of evidence should not automatically become a factual "no."
- Ordinary Q&A: start with one broad search; answer from those results if they contain enough support. Retrieve again only when a required fact/owner/date/ID is missing, exhaustive coverage was requested, a specific artifact must be read, or an important claim would otherwise lack support.
- Don't search just to improve phrasing or support nonessential detail.
- Cite only retrieved sources; attach citations to the specific claims they support; label inference separately from directly supported facts; state conflicts between sources.

### 10. Long-running workflows

- Prompt for a short visible preamble before the first tool call, then sparse outcome-based updates at major phase changes — concrete outcomes and next steps, no narration of routine calls.
- Preserve assistant phase values when replaying history so the model can distinguish commentary from the final answer.
- Compact context after milestones, not every turn.
- Persisted reasoning helps when the objective and priorities stay stable across turns — but don't treat it as always-on: stale reasoning adds tokens and anchors the model to outdated approaches.

### 11. Verify before finishing (coding)

Run the most relevant validation available: targeted tests for changed behavior, type/lint checks, build checks for affected packages, or a minimal smoke test when full validation is too expensive. For frontend work: inspect existing design tokens first, don't add unrequested features, and render/inspect the result before finalizing.

## Migration workflow from GPT 5.5/5.4 (official)

1. Switch model; preserve current reasoning effort.
2. Run representative evals **before** changing the prompt.
3. Remove obsolete scaffolding, repeated instructions, irrelevant tools.
4. Add only the smallest targeted instruction fixing a measured regression.
5. Re-run evals after each prompt/reasoning change.

Debug regressions with a small set of real traces: identify the failure mode, find the causing instruction or contradiction, make a surgical edit, rerun the same cases. Anti-pattern: rewriting the whole prompt stack at once — you can't isolate what changed behavior.

## Terra and Luna

No variant-specific prompting advice exists — OpenAI's guide and model pages document identical parameters, effort levels, and tooling across all three tiers, differentiated only by cost/capability positioning:

- **Terra:** high-volume business tasks (support, internal tools, doc analysis) at half Sol's price.
- **Luna:** summarization, drafting, labeling, extraction, routine automation. Third-party evals (not OpenAI) caution that Luna underperforms on long-context recall (large-codebase reasoning, multi-doc synthesis) despite the same nominal window.

Choose the tier per task; prompt them all the same way.

## Sources

- [Prompting guidance for GPT-5.6 Sol](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6) (official, primary source — verified 2026-07-12)
- [Model guidance](https://developers.openai.com/api/docs/guides/latest-model) (official — tier selection, effort levels)
- Model pages: [gpt-5.6-sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [gpt-5.6-terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [gpt-5.6-luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [GPT-5.6 launch announcement](https://openai.com/index/gpt-5-6/), [Sol preview announcement](https://openai.com/index/previewing-gpt-5-6-sol/)
- [Simon Willison's GPT-5.6 writeup](https://simonwillison.net/2026/Jul/9/gpt-5-6/) (independent confirmation of effort levels, PTC, specs)
