---
name: nano-banana-prompt
description: >-
  This skill should be used when the user asks to "generate an image prompt",
  "create a Nano Banana prompt", "write a prompt for Nano Banana 2",
  "optimize an image generation prompt", "Nano Banana", "NB2 prompt",
  "image prompt for Gemini", or wants to create a high-quality prompt
  optimized for Google's Nano Banana 2 image generation model.
argument-hint: "<image description or concept>"
allowed-tools: Read, AskUserQuestion
---

# Nano Banana 2 Prompt Generator

Generate optimized prompts for Google's Nano Banana 2 (Gemini 3.1 Flash Image) model. Transform user concepts into detailed, well-structured prompts that leverage NB2's strengths: natural language understanding, thinking mode, text rendering, character consistency, and image search grounding.

<user-request>
$ARGUMENTS
</user-request>

## Step 1: Understand the User's Intent

Extract from the user's request:

- **Subject**: The primary subject(s) of the image
- **Style**: Desired visual style (photograph, illustration, painting, 3D render, etc.)
- **Mood/Atmosphere**: Emotional tone or feeling
- **Use case**: What the image is for (social media, print, product mockup, etc.)
- **Special requirements**: Text rendering, character consistency, specific aspect ratio, etc.

If the request is too vague to produce a quality prompt (e.g., just "a cat"), use AskUserQuestion to clarify intent. Ask about style preference, mood, and intended use — but only ask what's genuinely ambiguous. A request like "a cyberpunk cityscape at night" has enough to work with.

## Step 2: Compose the Prompt

Read `references/prompting-guide.md` for style vocabulary, composition terms, lighting terms, and prompt formula templates. Then construct the prompt following these core principles:

### Prompt Structure

Build prompts using **natural language sentences**, not comma-separated keyword tags. NB2 is a reasoning model — brief it like a creative director, not a search engine.

Assemble these elements in order:

1. **Style/Medium** — Lead with the visual format: "A cinematic photograph of...", "A watercolor illustration of...", "A minimalist vector graphic of..."
2. **Subject** — Describe who/what with specific physical details (age, clothing, material, color, texture)
3. **Action** — What is happening in the scene
4. **Setting/Environment** — Where the scene takes place, with atmospheric details
5. **Composition** — Camera angle, framing, depth of field (see reference guide for terms)
6. **Lighting** — Light source, quality, color temperature
7. **Mood/Atmosphere** — Emotional tone reinforcement

### Critical Rules

- **Describe what to include**, never what to exclude ("empty street" not "no cars")
- **Use specific descriptors** over generic ones ("navy blue tweed blazer" not "nice jacket")
- **Include materiality** when relevant ("brushed steel", "crumpled linen", "weathered oak")
- **Wrap text in quotes** when the image should contain readable text (e.g., a sign reading "Open 24 Hours")
- **Specify typography** for text elements ("bold sans-serif", "hand-lettered script", "neon cursive")

### Thinking Mode Recommendation

Append a thinking mode recommendation based on prompt complexity:

| Complexity | Thinking Mode | When to Use |
|---|---|---|
| Simple | Minimal (default) | Single subject, clear style, no text |
| Moderate | High | Multi-element scenes, text rendering, specific composition |
| Complex | Dynamic | Infographics, multi-character consistency, data visualization |

## Step 3: Output the Result

Present the output in this format:

~~~markdown
## Nano Banana 2 Prompt

**Prompt:**
> [The full optimized prompt text]

**Recommended Settings:**
- **Thinking mode:** [Minimal / High / Dynamic]
- **Aspect ratio:** [ratio, e.g., 16:9, 1:1, 9:16]
- **Resolution:** [1K / 2K / 4K based on use case]

**Tips:**
- [1-3 specific tips for iterating on this particular prompt]
~~~

### Output Guidelines

- Produce exactly **one prompt** unless the user asks for variations
- Keep prompts to **2-5 sentences** — detailed but not bloated
- If the user's concept would benefit from image search grounding (real landmarks, known products, public figures), note this capability
- If the concept involves multiple images with consistent characters, note that NB2 supports up to 5-person consistency with reference images

## Additional Resources

### Reference Files

- **`references/prompting-guide.md`** — Comprehensive Nano Banana 2 prompting reference including style vocabulary, composition terms, lighting terms, text rendering patterns, editing workflows, and example prompt formulas
