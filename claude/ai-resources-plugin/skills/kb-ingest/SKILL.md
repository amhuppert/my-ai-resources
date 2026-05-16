---
name: kb-ingest
description: Delegate knowledge-base ingestion to the `knowledge-base-ingester` sub-agent so the source document, primary/current trees, and ingest workflow stay out of the main conversation's context window. Run this when the user explicitly invokes `/ai-resources:kb-ingest`; do not auto-trigger from natural-language ingestion requests (those should use the `knowledge-base-ingest` skill directly).
disable-agent
disable-model-invocation: true
---

# kb-ingest

Run a knowledge-base ingestion in an isolated agent context.

This skill exists for one reason: ingesting a source document into a knowledge base loads a lot — the source itself, the primary/derived/current trees, the `knowledge-base-ingest` skill, and its references. When the parent agent runs it inline, that all lands in the main conversation's context window. This skill pushes the entire workflow into the `knowledge-base-ingester` sub-agent and brings back a compact report.

## When to invoke

Only when the user runs `/ai-resources:kb-ingest` (with or without arguments). Do not auto-trigger on phrases like "ingest this document" or "add to the knowledge base" — those should run the `knowledge-base-ingest` skill directly in the main conversation. This skill is the explicit, user-chosen path for the delegated workflow.

## What the skill does

1. Parse the user's invocation for ingest inputs.
2. Delegate the actual ingestion to the `knowledge-base-ingester` sub-agent via the Agent tool.
3. Surface the agent's compact report to the user.
4. Do not re-do the agent's work inline.

## Step 1: Parse inputs

From the user's `/ai-resources:kb-ingest` invocation, gather:

- **Source document path**: the file to ingest. Required.
- **Knowledge-base destination**: explicit path (e.g. `kb/api-redesign/`) if given; otherwise leave it to the agent's discovery rules.
- **Caller intent**: pure ingestion, or ingestion + extra analysis the user asked for.
- **Any extra instructions**: scope limits, "don't touch X", deadlines, etc.

If the user supplied a path that does not exist, or supplied nothing at all, ask them for the source path before delegating. Do not invent a path.

If the user gave instructions but no source path, ask which document they want ingested. Do not guess.

## Step 2: Delegate to the sub-agent

Invoke the `knowledge-base-ingester` sub-agent via the Agent tool with `subagent_type: "knowledge-base-ingester"`. The prompt to the agent must be self-contained (the agent does not see the parent conversation) and must include:

- The exact source document path.
- The knowledge-base destination if the user specified one, or a note that destination should be inferred per the skill's discovery rules.
- Any user-supplied scope limits or extra analysis requests.
- A reminder to follow the `knowledge-base-ingest` skill and return the report in the format defined by the agent.

Minimal prompt template:

```
Ingest the following source into a knowledge base, following the `knowledge-base-ingest` skill end-to-end. Return the compact report defined in your agent definition — do not paste source content.

Source: <absolute or repo-relative path>
Knowledge base: <explicit path, OR "infer per the skill's discovery rules">
Extra instructions: <anything the user said beyond "ingest this", or "none">
```

Run the agent in the foreground. The parent needs the report before it can respond to the user.

## Step 3: Surface the report

When the agent returns, relay its report to the user with minimal added commentary. The agent's report already names file paths, the impact summary, and validation steps performed — do not paraphrase it into something longer.

Two things to do on top of the report:

1. **Flag escalations.** If the agent returned an early-exit (ambiguous destination, unreadable source, etc.) instead of a full report, surface that clearly and ask the user the question the agent raised.
2. **Note unresolved limitations.** If the agent's "Limitations / Assumptions" section is non-empty, call those out so the user can decide whether to follow up.

## Step 4: Stop

Do not re-run the ingestion inline to "double-check." Do not re-read the primary documents the agent wrote. Do not summarize the source. The whole point of this skill is to keep that work out of the main context window — duplicating it in the parent defeats the purpose.

If the user follows up with edits, refinements, or a second source, invoke the sub-agent again rather than handling the work directly.

## Anti-patterns

- ❌ Reading the source document into parent context "to understand it" before delegating. The agent reads the source; the parent should not.
- ❌ Reading the agent-written primary/current files after the agent finishes "to verify". The agent's report is the verification. If you don't trust it, the agent definition is the thing to fix, not this skill.
- ❌ Auto-triggering on natural-language ingest requests. Use the `knowledge-base-ingest` skill directly in those cases. This skill is the explicit delegated path.
- ❌ Repeating the agent's full report verbatim with your own paraphrase appended. Relay it; don't pad it.
