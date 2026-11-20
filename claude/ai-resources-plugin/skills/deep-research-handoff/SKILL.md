---
name: deep-research-handoff
description: "Write a self-contained research prompt for ChatGPT Deep Research from the user's request and relevant local context. Does not run the research."
disable-model-invocation: true
---

# Deep research handoff

Produce one ready-to-paste prompt that ChatGPT Deep Research can run without access to this conversation or workspace. Preserve the user's question, transfer only the context that changes the answer, and define a verifiable deliverable. Follow the `writing-for-frontier-agents` skill when drafting the prompt.

Inspect relevant local files when needed, and skip local exploration if the conversation already gives you everything required. Do not research the topic yourself, call research APIs, upload files, run project code, install packages, or write helper scripts. Leave repository files untouched unless the user explicitly asks you to save the prompt as Markdown. Turn uncertain external claims into questions for the researcher to check.

## Establish the brief

Pull from the request and conversation: the central question, intended audience, how the result will be used, scope, exclusions, hard constraints, preferences, and what a good answer must establish.

Keep the requested kind of work intact: exploration, explanation, comparison, or a decision. Do not turn open exploration into a forced recommendation. For decisions, spell out the evaluation criteria, include the status quo when relevant, leave room for evidence against the user's favored option, and avoid invented numerical weights.

Ask one short round of questions only if a missing answer would materially change the prompt and cannot be inferred from local context. Ask about the brief itself, not for answers to the research questions. For smaller gaps, state an assumption or ask the researcher to cover the alternatives. If the user asked for no questions or is unavailable, preserve major unknowns and flag which conclusions hinge on them.

Honor any date cutoff the user gives. Otherwise, ask for facts current as of the execution date and ask the report to state that date. For historical questions, separate what held at the cutoff from later evidence.

## Transfer only the context that matters

ChatGPT sees nothing from this session and cannot read local files. Include every local fact, constraint, or decision that affects the research, and cut everything else; irrelevant background dilutes focus.

## Draft the research prompt

Address the researcher directly in plain language. Define outcomes, constraints, and evidence standards while leaving search mechanics to the researcher. Skip hidden-reasoning prompts, fictional expert panels, arbitrary tool-call counts, and source quotas. Use an example only when a requirement would otherwise be ambiguous.

Include the sections below as needed, merging or dropping sections to fit the assignment and replacing every placeholder:

### Objective and context

State the core question, audience, intended use, and success criteria. Supply the selected local context, clearly separating hard requirements, preferences, assumptions, and supplied claims that need independent verification. Include scope, exclusions, target dates, and any attachments the user plans to include.

### Questions to investigate

Write a short, prioritized set of answerable questions covering material unknowns, relevant alternatives, limitations, and evidence that could overturn a provisional conclusion. Leave room for useful in-scope discoveries.

### Evidence requirements

Adapt these to the topic:

- Read primary or authoritative sources in full rather than relying on search snippets. Corroborate consequential claims independently, and label secondary summaries as attributed interpretation.
- Check time-sensitive facts against the requested date. Distinguish publication, event, and effective dates plus product versions when they change the answer. Older foundational sources remain valid where still accurate.
- Actively look for credible counterevidence. Explain disagreements via definitions, dates, populations, methods, or incentives; keep incompatible estimates separate and distinguish strong from weak evidence.
- Place citations next to substantive claims and consequential table cells, with usable titles and URLs (or attachment names with page/section numbers) plus a compact source list. Cite only material actually read.
- Separate sourced facts, calculations, inference, and recommendations. Show calculation inputs, units, assumptions, and reproducible steps. State uncertainty plainly without false precision; absent evidence is not proof of absence.
- Report inaccessible sources, missing attachments, and coverage gaps. Never claim access, execution, or verification that did not happen.

Add domain rules only where they change the answer: version compatibility and reproducible validation for technical work; study quality and population fit for science; pricing basis and vendor-claim verification for product comparisons; jurisdiction, legal status, and effective dates for legal topics. For policy or political topics, ask for neutral factual comparisons rather than endorsements. Flag high-stakes areas that need qualified professional review.

### Deliverable and execution

Unless another format was requested, ask for a Markdown report containing a direct answer or synthesis, findings organized around the questions, limitations, and sources, sized to the topic. Use comparison tables when they make tradeoffs easier to inspect.

For decisions, ask for a supported recommendation, tradeoffs, and conditions that would flip it. For exploration, ask for a map of approaches and open questions without forcing a winner.

Tell Deep Research to build and adapt its plan within scope through its normal plan-review flow, ask focused questions only when ambiguity materially changes the work (otherwise state assumptions and continue), and finish with the complete deliverable rather than a plan or reading list.

## Return the handoff

Wrap the finished prompt in one fenced Markdown block using an outer fence longer than any fence inside it. Keep any brief setup notes outside the fence, or omit commentary if the user asked for only the prompt.

Before returning, check that the prompt:

- Works completely standalone without unseen chat history or local files.
- Preserves the goal, constraints, dates, and major unknowns.
- Separates supplied facts, assumptions, and open research questions.
- Contains no secrets, fabricated file access, leftover placeholders, or contradictory rules.
- States the evidence standard and finished deliverable clearly, with no fluff.

Deliver the handoff and stop; do not start the research.
