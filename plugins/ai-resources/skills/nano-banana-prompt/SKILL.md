---
name: nano-banana-prompt
description: Write an image-generation prompt and settings recommendation for
  Google's Nano Banana 2 (Gemini 3.1 Flash Image) model.
---

# Nano Banana 2 prompt generator

Turn a user's concept into one ready-to-use prompt for Google's Nano Banana 2 (`gemini-3.1-flash-image-preview`), paired with recommended thinking mode, aspect ratio, and resolution.

## 1. Extract intent

Pull subject, visual medium/style, mood, intended use (web, print, social, mockup), and special requirements (in-image text, character consistency across shots, specific aspect ratio, image editing) from the invocation.

Ask brief clarifying questions only when the concept is too thin to make sensible defaults (for example, just "a cat"). A concrete brief like "a cyberpunk street at night" is enough to proceed.

## 2. Draft the prompt

Read [`references/prompting-guide.md`](references/prompting-guide.md) when you need style/camera/lighting vocabulary, aspect-ratio or resolution tables, thinking-mode tradeoffs, or templates for text rendering, multi-image character consistency, and conversational editing.

Write full natural-language sentences rather than comma-separated keyword tags. NB2 is a reasoning model; brief it like a creative director. Keep the prompt to 2 to 5 focused sentences covering these elements in order:

1. **Medium and style:** lead with the visual format ("A cinematic photograph of...", "A watercolor illustration of...").
2. **Subject:** concrete physical traits, clothing, color, and materials ("navy tweed blazer", "brushed steel", "weathered oak") rather than generic labels.
3. **Action:** what is happening in the frame.
4. **Setting:** environment and atmospheric detail.
5. **Composition:** camera angle, shot framing, depth of field.
6. **Lighting:** source, quality, direction, and color temperature.
7. **Mood:** overall tone.

Key rules:

- Describe what is present, never what is absent ("an empty street", not "no cars").
- Put exact in-image text in double quotes and name its typography (e.g., `a neon sign reading "Open 24 Hours" in cursive script`).
- Match thinking mode to complexity: `Minimal` for simple single-subject shots, `High` for multi-element scenes or readable text, `Dynamic` for infographics, data visuals, or multi-character consistency.

## 3. Return the result

Produce one prompt unless the user asks for variations:

```markdown
## Nano Banana 2 Prompt

**Prompt:**
> [2 to 5 natural-language sentences]

**Recommended Settings:**
- Thinking mode: [Minimal / High / Dynamic]
- Aspect ratio: [e.g., 16:9, 1:1, 9:16]
- Resolution: [0.5K / 1K / 2K / 4K]

**Tips:**
- [1 to 3 targeted iteration notes for this prompt]
```

Mention NB2's image search grounding when the concept features real landmarks, products, or public figures, and note its 5-person reference-image consistency when the user needs recurring characters across multiple shots.
