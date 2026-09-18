---
name: deep-research-handoff
description: Create a self-contained prompt for ChatGPT Deep Research. Use when asked to prepare a research prompt, brief, or handoff from Codex to ChatGPT using the request and relevant local context. Does not conduct research or implement findings.
disable-model-invocation: true
---

# Deep research handoff

Write one ready-to-paste research assignment that ChatGPT Deep Research can complete without access to this conversation or workspace. The prompt should preserve the user's question, supply the context that affects the answer, and define a useful, verifiable deliverable. Use the writing-for-frontier-agents skill to write the prompt for ChatGPT.

Inspect relevant local context with available tools when needed. If you already have enough context to write the prompt, do not perform redundant local exploration. Do not investigate the topic, launch research, call research APIs, upload files, run project code, install dependencies, or create helper scripts. Leave project files unchanged except to save the completed prompt as Markdown when requested; preserve unrelated content. Turn uncertain external claims into questions for the researcher to verify.

## Establish the brief

Use the request and conversation to identify the central question, audience, intended use, and what the answer must establish. Capture the scope, exclusions, hard requirements, preferences, and success criteria.

Preserve the kind of work requested: exploration, explanation, comparison, or a decision. Exploration should not become a recommendation exercise. For decisions, make evaluation criteria explicit, include the status quo when relevant, and leave room for evidence against the user's favored option. Do not invent numerical weights.

Ask one compact round of clarification when missing information would materially change the assignment and cannot be inferred from authorized local context. Ask about the brief, not for answers to the research questions. For other gaps, state an assumption or ask the researcher to examine the alternatives. If the user requests no questions or input is unavailable, preserve consequential unknowns and identify which conclusions depend on them.

Use the user's specified date. Otherwise, request information current as of the research execution date and ask the report to state it. For historical work, distinguish facts true at the cutoff from evidence published later.

## Transfer needed context

ChatGPT will have none of the context from the current conversation and cannot read local files.
It will only have the context that you give it in the prompt. Include any context needed to fulfill the request, but be selective. Irrelevant information provided in the prompt will hurt performance.

## Write the research assignment

Address the researcher directly in plain language. Define outcomes and constraints, leaving routine search choices to the researcher. Avoid hidden-reasoning requests, invented expert panels, arbitrary tool-call counts, and source quotas. Use examples only to clarify a nonobvious requirement.

The sections below describe what the prompt needs. Merge or omit sections to fit the task, and replace all drafting placeholders.

### Objective and context

State the question, audience, intended use, and success criteria. Supply the context gathered above, separating hard requirements from preferences, assumptions, and supplied facts that need independent verification. Include scope, exclusions, dates, and expected attachments.

### Questions to investigate

Write a short, prioritized set of answerable questions. Include material unknowns, relevant alternatives, limitations, and evidence that could change the conclusion. Allow useful discoveries within scope.

### Evidence requirements

Adapt these requirements to the assignment:

- Read relevant source material using available tools; search snippets alone are insufficient. Prefer primary or authoritative evidence for consequential claims, with independent corroboration where useful. Use secondary summaries as leads or attributed interpretation.
- Verify time-sensitive facts against the requested date. Distinguish publication, event, and effective dates and product versions where they affect the answer. Foundational sources can remain useful despite their age.
- Seek credible counterevidence. Explain disagreements through differences in definitions, dates, populations, methods, or incentives. Keep incompatible estimates separate and represent differences in evidence strength.
- Cite substantive factual claims near the claims, including consequential table entries. Give usable titles and URLs, or attachment names with page or section references, plus a compact source list. Cite only material actually inspected; never invent citations.
- Separate sourced findings, calculations, inference, and recommendations. Show calculation inputs, units, assumptions, and a reproducible method. Describe uncertainty without false precision; missing evidence does not prove absence.
- Report inaccessible sources or attachments and material coverage gaps. Use permitted alternatives and identify what remains unverified. Claim access, execution, tests, or verification only when they occurred.

Add domain requirements only where they affect the answer. Technical work may need version compatibility and reproducible validation; science, study quality and population fit; product comparisons, pricing basis and verification of vendor claims; legal research, jurisdiction, legal status, and effective dates. For political or policy research, request neutral factual comparisons rather than endorsements or rankings. High-stakes findings should identify where qualified professional review is needed.

### Deliverable and execution

Unless the user requests another format, ask for a Markdown report with a direct answer or synthesis, findings organized around the questions, limitations, and sources. Match depth and length to the task. Use comparison tables when they make the answer easier to assess.

For decisions, request a supported recommendation, tradeoffs, and conditions that would change it where appropriate. For exploration, request a map of approaches and open questions. Do not force a winner.

Ask Deep Research to develop and adapt its plan within scope, using its normal plan-review flow. Allow focused clarifications when an ambiguity would materially change the result; otherwise proceed with stated assumptions. Define completion as the requested research deliverable, not a plan or reading list.

## Return the handoff

Return the completed prompt in one fenced Markdown block, using an outer fence long enough to contain any embedded fences. Keep explanations and setup notes outside it. If the user requests only the prompt, omit commentary.

Before returning, verify that the prompt:

- Stands alone without unseen conversation history or local files.
- Preserves the objective, constraints, dates, and consequential uncertainty.
- Distinguishes supplied facts, assumptions, and questions for research.
- Contains no secrets, fabricated access, drafting placeholders, or conflicting instructions.
- Defines the evidence and completed deliverable needed to review and reuse the result.

Cut repetition and instructions that add no value to this assignment. Deliver the handoff and stop; do not begin the research.
