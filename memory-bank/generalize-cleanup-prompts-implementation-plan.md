# Generalize Cleanup Prompts Implementation Plan

## Overview

Replace the AI-instruction-specific cleanup prompts in `voice-to-text/src/services/cleanup.ts` with general-purpose prompts. The only file that needs code changes is `cleanup.ts` — the two prompt template constants are replaced. Existing tests pass without modification since none assert on the AI-specific text.

## Changes

**File:** `voice-to-text/src/services/cleanup.ts`

### 1. Replace `CLEANUP_PROMPT_TEMPLATE` (lines 50–65)

Replace the entire constant with:

```
const CLEANUP_PROMPT_TEMPLATE = `You are cleaning up and formatting voice-transcribed text.

{CONTEXT_SECTION}Transcribed Text:
<transcription>
{TRANSCRIPTION}
</transcription>

Instructions:
1. Identify and fix likely transcription errors and mistakes
2. Reword for clarity and improve sentence structure
3. Make substantial changes when they improve readability
4. Apply markdown formatting and structure
5. Organize into bulleted or numbered lists when appropriate
6. Break content into paragraphs for clarity
7. Preserve the speaker's original tone and voice
8. Preserve the original meaning exactly — do not lose any important details
9. Output ONLY the cleaned text, no explanations or preamble

{INSTRUCTIONS_SECTION}`;
```

### 2. Replace `FILE_MODE_CLEANUP_PROMPT_TEMPLATE` (lines 67–89)

Replace the entire constant with:

```
const FILE_MODE_CLEANUP_PROMPT_TEMPLATE = `You are cleaning up and formatting voice-transcribed text. The cleaned text will be appended to an existing document.

{CONTEXT_SECTION}Prior document content (continue from where this ends):
<prior-output>
{PRIOR_OUTPUT}
</prior-output>

Transcribed Text:
<transcription>
{TRANSCRIPTION}
</transcription>

Instructions:
1. Identify and fix likely transcription errors and mistakes
2. Reword for clarity and improve sentence structure
3. Make substantial changes when they improve readability
4. Apply markdown formatting and structure
5. Organize into bulleted or numbered lists when appropriate
6. Break content into paragraphs for clarity
7. Continue naturally from the prior document content
8. Maintain consistent terminology, style, and tone with the prior content
9. Preserve the speaker's original tone and voice
10. Preserve the original meaning exactly — do not lose any important details
11. Output ONLY the new text to append — do not repeat prior content
12. Output ONLY the cleaned text, no explanations or preamble

{INSTRUCTIONS_SECTION}`;
```

## Design Decisions

**Instruction ordering:** Instructions are ordered to progressively escalate aggressiveness (fix errors → reword → substantial changes) before formatting instructions (markdown, lists, paragraphs), followed by constraints (tone, meaning, output format). This calibrates the LLM to understand that aggressive improvements are welcome, bounded by meaning preservation.

**Role framing:** "cleaning up and formatting" captures both error correction and structural improvements without implying any specific use case.

**Tone preservation:** Instruction 7/9 ("Preserve the speaker's original tone and voice") ensures casual speech stays casual and formal stays formal — the cleanup improves structure and clarity without normalizing tone.

**Shared instruction set:** Instructions 1–6 are identical between clipboard and file mode. File mode adds continuity instructions (7–8) and adjusts the output constraint (instruction 11) for append-only behavior.

## Verification

Run existing tests — they should pass without modification:

```
cd voice-to-text && bun test src/services/cleanup.test.ts
```

No test assertions reference the AI-specific prompt text. The tests verify: model flag passing, stdout handling, fallback behavior, transcription tag structure, prior-output tag structure, and spawn options.
