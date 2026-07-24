# Nano Banana 2 Prompting Reference

Comprehensive reference for crafting optimized prompts for Google's Nano Banana 2 (model ID: `gemini-3.1-flash-image-preview`).

## Model Overview

Nano Banana 2 is built on Gemini 3.1 Flash. It achieves ~95% of Nano Banana Pro's image quality at 3-5x the speed. Key differentiators from Pro:

- **Image Search Grounding** — Retrieves real-world references via Google Search during generation, improving accuracy for landmarks, logos, and known subjects
- **Thinking Mode** — Three levels (Minimal, High, Dynamic) to tune speed-quality tradeoff
- **Extended aspect ratios** — 14 ratios including ultra-wide 1:8 and 8:1
- **0.5K resolution tier** — Budget-friendly option for thumbnails and previews
- **~92% text rendering accuracy** (Pro achieves ~94%)
- **Up to 5-person character consistency** across generated images

## Prompt Structure Formula

### Standard Generation

```
[Style/Medium] of [Subject with specific details] [Action] in [Setting/Environment].
[Composition and camera]. [Lighting]. [Mood/atmosphere].
```

**Example:**
> A cinematic wide shot of a futuristic sports car speeding through a rainy Tokyo street at night. Neon signs reflect off wet pavement and the car's metallic chassis. Shot from a low angle with shallow depth of field. Dramatic rim lighting with teal and magenta highlights. Moody, electric atmosphere.

### Text Rendering

```
[Style] of [Subject] with text reading "[Exact Text]" in [font style].
[Remaining composition details].
```

**Example:**
> A vintage-style travel poster for Paris featuring the Eiffel Tower at sunset. Bold text reading "PARIS" in art deco sans-serif at the top, with "City of Light" in elegant script below. Warm golden tones, soft clouds, retro grain texture.

### Character Consistency (Multi-Image)

```
[Style] of [Character with detailed physical description]. [Action/Pose].
[Setting]. Keep facial features exactly the same as [reference].
Maintain attire and identity consistent.
```

### Editing (Existing Image)

```
[Action verb] [specific element] and [resulting change].
Keep [what stays the same] the same while [what changes].
```

**Example:**
> Remove the tourists from the background and fill with matching cobblestone texture. Keep the architecture and lighting exactly the same while adding autumn leaves on the ground.

### Dimensional Translation (2D to 3D or vice versa)

```
Based on [input type], generate [output type] following [structural specification].
Style: [aesthetic]. Quality: [technical specs].
```

## Style Vocabulary

### Visual Mediums
- Photograph, cinematic still, editorial photograph, product photograph
- Illustration, digital painting, watercolor, oil painting, gouache
- Vector graphic, flat design, minimalist line art
- 3D render, isometric, low-poly, photorealistic CGI
- Pixel art, retro game art, sprite sheet
- Sketch, pencil drawing, charcoal, ink wash
- Collage, mixed media, paper cut-out
- Screen print, risograph, letterpress
- Anime, manga panel, cel-shaded

### Style Modifiers
- Photorealistic, hyperrealistic, stylized, abstract
- Vintage, retro, futuristic, cyberpunk, steampunk
- Minimalist, maximalist, brutalist
- Whimsical, dreamy, surreal, ethereal
- Gritty, raw, polished, refined
- Hand-drawn, hand-painted, hand-lettered

## Composition Terms

### Camera Angles
- **Eye-level** — Standard, natural perspective
- **Low angle** — Camera looks up, subject appears powerful/imposing
- **High angle** — Camera looks down, subject appears smaller/vulnerable
- **Bird's eye / aerial** — Directly overhead
- **Dutch angle** — Tilted camera for tension/unease
- **Worm's eye** — Extreme low angle from ground level
- **Drone perspective** — Elevated aerial with slight angle

### Framing / Shot Types
- **Extreme close-up (ECU)** — Detail of face, eyes, texture
- **Close-up** — Head and shoulders
- **Medium close-up** — Chest and above
- **Medium shot** — Waist up
- **Medium wide** — Knees up
- **Wide shot / full shot** — Entire body with environment
- **Extreme wide / establishing shot** — Environment dominates

### Depth and Focus
- **Shallow depth of field** — Subject sharp, background blurred (bokeh)
- **Deep focus** — Everything sharp front to back
- **Rack focus** — Suggests transition between focal planes
- **Tilt-shift** — Miniature effect with selective focus

### Layout
- **Rule of thirds** — Subject off-center at intersection points
- **Center-framed** — Subject dead center
- **Symmetrical** — Balanced left-right
- **Leading lines** — Lines guide the eye to subject
- **Negative space** — Empty area to create visual breathing room
- **Foreground framing** — Elements in front create a natural frame

## Lighting Terms

### Light Quality
- **Soft light** — Diffused, gentle shadows (overcast, softbox)
- **Hard light** — Sharp, defined shadows (direct sun, spotlight)
- **Ambient** — General environmental light, no dominant source
- **Volumetric** — Visible light rays through atmosphere (god rays, fog)

### Light Direction
- **Front lit** — Light source behind camera, even illumination
- **Backlit / contre-jour** — Light behind subject, silhouette effect
- **Side lit** — Dramatic shadows across one side
- **Rim lighting** — Light outlines subject edges from behind
- **Under lit** — Light from below, dramatic/eerie
- **Top lit** — Overhead, natural midday feel

### Light Color / Temperature
- **Golden hour** — Warm amber tones, long shadows (sunrise/sunset)
- **Blue hour** — Cool blue tones, twilight
- **Warm tones** — Amber, orange, yellow cast
- **Cool tones** — Blue, teal, violet cast
- **Neon** — Artificial colored light (specify colors)
- **Candlelight** — Warm, flickering, intimate
- **Moonlight** — Cool, silver-blue, dim

### Named Lighting Setups
- **Rembrandt lighting** — Triangle of light on cheek, classic portrait
- **Chiaroscuro** — High contrast light and dark, dramatic
- **High key** — Bright, minimal shadows, airy
- **Low key** — Dark, heavy shadows, moody
- **Cinematic lighting** — Dramatic, color-graded, filmic

## Material and Texture Descriptors

Use specific material terms to ground the image in physicality:

- **Metals**: Brushed steel, polished chrome, oxidized copper, hammered brass, matte black anodized
- **Fabrics**: Crumpled linen, raw silk, worn denim, soft velvet, chunky knit
- **Wood**: Weathered oak, polished walnut, raw pine, charred cedar
- **Glass**: Frosted, stained, cracked, iridescent
- **Surfaces**: Wet concrete, mossy stone, peeling paint, sun-bleached
- **Food**: Glistening glaze, seared crust, powdered sugar, crystallized honey

## Aspect Ratios

NB2 supports 14 aspect ratios:

| Ratio | Use Case |
|---|---|
| 1:1 | Social media posts, profile images, thumbnails |
| 3:2 / 2:3 | Standard photography, prints |
| 4:3 / 3:4 | Presentations, tablets, classic TV |
| 4:5 / 5:4 | Instagram portrait, posters |
| 16:9 / 9:16 | Widescreen / vertical video, YouTube thumbnails, Stories |
| 21:9 | Ultra-wide cinematic, banners |
| 1:4 / 4:1 | Extreme vertical/horizontal banners |
| 1:8 / 8:1 | Ultra-extreme banners (NB2 exclusive) |

## Resolution Tiers

| Tier | Pixels | Best For | Price |
|---|---|---|---|
| 0.5K | 512px | Thumbnails, previews, rapid iteration | ~$0.045 |
| 1K | 1024px | Web images, social media | ~$0.067 |
| 2K | 2048px | High-quality web, print drafts | ~$0.101 |
| 4K | 4096px | Print, large displays, production assets | ~$0.151 |

## Thinking Mode Guide

| Level | Speed | Best For |
|---|---|---|
| **Minimal** (default) | Fastest (4-6s at 1K) | Simple subjects, clear styles, quick iterations |
| **High** | Slower | Complex compositions, text rendering, multi-element scenes, spatial reasoning |
| **Dynamic** | Variable | Let the model decide — good for mixed-complexity workflows, infographics, data visualization |

High thinking mode significantly improves:
- Text rendering accuracy and legibility
- Multi-subject spatial arrangement
- Complex scene composition with many elements
- Adherence to detailed prompt specifications

## Prompt Formula Templates

### Product Photography
> A professional product photograph of [product] on [surface]. [Material details]. Studio lighting with [light setup]. [Background]. Shot with [lens/focal length feel]. Clean, commercial aesthetic.

### Portrait
> A [style] portrait of [subject description] in [setting]. [Pose/expression]. [Lighting setup]. [Composition]. [Mood] atmosphere.

### Landscape / Environment
> A [style] [time of day] scene of [location/environment]. [Weather/atmosphere]. [Foreground elements]. [Composition]. [Lighting]. Expansive, [mood] feel.

### Infographic / Data Visualization
> A [style] infographic showing [data/concept]. Title reading "[Title Text]" in [font]. [Layout: sections, columns, flow]. [Color palette]. Clean, legible, editorial quality.

### Social Media Post
> A [aspect ratio] [style] image for [platform] featuring [subject]. Text reading "[Copy]" in [font style]. [Brand colors/aesthetic]. Eye-catching, scroll-stopping composition.

### Storyboard Frame
> A [style] storyboard frame showing [character] [action] in [setting]. [Camera angle]. [Lighting]. [Emotion/mood]. 16:9 landscape format.

## Common Pitfalls

- **Keyword soup** — "dog, park, 4k, realistic, beautiful" produces generic results. Use full sentences instead.
- **Negative phrasing** — "A room with no furniture" confuses the model. Say "an empty room" instead.
- **Over-prompting** — Extremely long prompts can dilute intent. 2-5 well-crafted sentences outperform 10 vague ones.
- **Missing materiality** — Generic "armor" or "dress" produces generic results. Specify materials: "ornate elven plate armor, etched with silver leaf patterns."
- **Ignoring composition** — Without framing guidance, the model picks defaults. Specify camera angle and shot type.
- **Re-rolling instead of editing** — Make conversational edits to refine existing outputs rather than regenerating from scratch.

## Iteration Tips

1. **Start simple, add detail** — Begin with a 1-2 sentence prompt, then refine incrementally
2. **Edit conversationally** — After generation, describe what to change: "Make the sky more dramatic" or "Move the subject to the left third"
3. **Use thinking mode strategically** — Start with Minimal for quick drafts, switch to High for the final version
4. **Leverage image search grounding** — For real-world subjects (landmarks, products, known locations), the model retrieves references automatically
5. **Lock identity for series** — When generating multiple images of the same character, upload a reference and explicitly state "Keep facial features exactly the same"
