# Nano Banana 2 prompting reference

Vocabulary, technical specs, and prompt templates for Google's Nano Banana 2 (`gemini-3.1-flash-image-preview`, built on Gemini 3.1 Flash).

## Model capabilities

- **Image search grounding:** pulls real-world visual references via Google Search for known landmarks, products, and public subjects.
- **Thinking mode:** `Minimal` (fastest, ~4 to 6s at 1K; simple subjects), `High` (stronger text legibility, spatial layout, multi-element composition), `Dynamic` (model chooses; good for infographics and multi-character work).
- **Text rendering:** ~92% accuracy (improves noticeably with `High` thinking mode).
- **Character consistency:** maintains identity for up to 5 people across a series when given reference images.
- **Extended sizes:** 14 aspect ratios (including ultra-wide `1:8` and `8:1`) and 4 resolution tiers (`0.5K` to `4K`).

## Prompt templates

**Standard scene:**
> A cinematic wide shot of a futuristic sports car speeding through a rainy Tokyo street at night. Neon signs reflect off wet pavement and the car's metallic chassis. Shot from a low angle with shallow depth of field. Dramatic rim lighting with teal and magenta highlights and a moody, electric atmosphere.

**Text rendering:**
> A vintage travel poster of the Eiffel Tower at sunset. Bold art deco sans-serif text at the top reading "PARIS", with "City of Light" in clean script below. Warm golden tones, soft clouds, subtle retro print grain.

**Multi-image character consistency:**
Specify `[Style] of [character with exact physical details and attire] [action] in [setting]. Keep facial features, clothing, and identity identical to the reference image.`

**Conversational image edit:**
Specify the exact edit and lock everything else:
> Remove the tourists from the background and fill the space with matching cobblestone texture. Keep the architecture and lighting identical while scattering autumn leaves along the curb.

**Infographic / product / storyboard:**
State format, exact quoted title text and font style, layout structure (columns, flow, color palette), surface/materials, and framing explicitly.

## Visual vocabulary

### Mediums and modifiers

- **Photo:** photograph, cinematic still, editorial portrait, studio product shot
- **Illustration / paint:** digital painting, watercolor, oil, gouache, pencil sketch, charcoal, ink wash, anime/cel-shaded
- **Graphic / print:** flat vector graphic, minimalist line art, screen print, risograph, letterpress, paper cut-out collage
- **3D / digital:** photorealistic CGI, isometric 3D render, low-poly, pixel art
- **Tone modifiers:** vintage, retro, futuristic, cyberpunk, minimalist, brutalist, editorial, raw, whimsical, surreal

### Camera angles, framing, and focus

| Axis | Useful terms |
| --- | --- |
| Angle | eye-level (neutral), low angle (imposing), high angle (vulnerable), bird's-eye / overhead, Dutch angle (unease), worm's-eye, elevated drone view |
| Framing | extreme close-up (texture/eyes), close-up (head and shoulders), medium close-up (chest up), medium shot (waist up), medium wide (knees up), wide/full shot, establishing shot |
| Focus | shallow depth of field (bokeh background), deep focus, rack focus, tilt-shift miniature |
| Layout | rule of thirds, center-framed, symmetrical, leading lines, negative space, foreground framing |

### Lighting

- **Quality:** soft diffused (overcast, softbox), hard direct (midday sun, spotlight), ambient, volumetric (god rays, fog)
- **Direction:** front lit, backlit / contre-jour (silhouette), side lit, rim lighting (edge highlight), top lit, under lit
- **Color / time:** golden hour (warm amber), blue hour (twilight blue), neon (specify exact hues), candlelight, moonlight
- **Setups:** Rembrandt lighting (classic portrait triangle), chiaroscuro (high contrast), high key (bright, airy), low key (dark shadows), cinematic color-graded

### Materials and textures

Concrete materials keep outputs grounded:

- **Metals:** brushed steel, polished chrome, oxidized copper, hammered brass, matte black anodized aluminum
- **Fabrics:** crumpled linen, raw silk, worn denim, soft velvet, chunky knit wool
- **Wood & stone:** weathered oak, polished walnut, charred cedar, wet concrete, mossy stone, peeling paint
- **Glass & food:** frosted glass, cracked glass, glistening glaze, seared crust, powdered sugar

## Aspect ratios and resolutions

| Ratios | Common use |
| --- | --- |
| `1:1` | Social posts, avatars, thumbnails |
| `3:2`, `2:3` | Standard photography and prints |
| `4:3`, `3:4` | Slides, tablets |
| `4:5`, `5:4` | Portrait social posts, posters |
| `16:9`, `9:16` | Widescreen video, thumbnails, vertical stories |
| `21:9` | Cinematic widescreen, banners |
| `1:4`, `4:1`, `1:8`, `8:1` | Tall or ultra-wide banners (`1:8` and `8:1` are NB2-specific) |

| Tier | Resolution | Best for | Approx. cost |
| --- | --- | --- | --- |
| `0.5K` | 512px | Previews, rapid drafts | ~$0.045 |
| `1K` | 1024px | Web and social | ~$0.067 |
| `2K` | 2048px | High-res web, print drafts | ~$0.101 |
| `4K` | 4096px | Print, final production assets | ~$0.151 |

## Pitfalls and iteration habits

- **Keyword soup** ("dog, park, 4k, realistic") produces generic images; write complete sentences.
- **Negative phrasing** ("room with no furniture") often adds the banned object; describe what belongs there ("an empty room").
- **Over-prompting** dilutes intent; 2 to 5 sharp sentences beat 10 bloated ones.
- **Missing framing or materiality** forces bland defaults; name the shot type and surfaces.
- **Iterating:** start at `1K` + `Minimal` thinking, refine conversationally instead of regenerating from scratch, then bump to `High` thinking and higher resolution for the final pass.
