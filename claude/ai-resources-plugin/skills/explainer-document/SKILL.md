---
name: explainer-document
description: >-
  This skill should be used when the user asks to "write an explainer",
  "create a learning document", "explain X for beginners", "write a guide
  about", "create a document explaining", or wants a concise educational
  document that teaches a topic to someone unfamiliar with it.
---

# Explainer Document

Create concise, beginner-friendly educational documents that teach a topic through logical progression. The audience is someone who does not already understand the subject.

## Process

### 1. Define Scope

Before writing, establish:

- **Topic boundaries** — what is and isn't covered
- **Target audience** — what prerequisite knowledge can be assumed
- **Depth** — how deep to go (overview vs. working knowledge)

If any of these are ambiguous, ask before proceeding.

### 2. Identify Core Concepts

List every concept the reader needs to understand. Then determine the dependency order: which concepts require understanding other concepts first.

Example dependency chain:
> "Permission" depends on "API" → "Role" depends on "Permission" → "Client Grant" depends on both "Application" and "API"

This dependency order determines the document's section order.

### 3. Research and Verify

For technical topics, verify claims against official documentation. Use web search and official docs — do not rely solely on training data. If something cannot be verified, say so explicitly rather than stating it as fact.

### 4. Write the Document

Follow the structure and style guidelines below.

### 5. Review

After writing, check:

- Can each section be understood using only the sections before it?
- Are there terms used before they're defined?
- Is anything included that a beginner doesn't need yet?
- Is anything essential missing?

## Document Structure

### Opening

Start with the most fundamental concepts — the building blocks everything else depends on. Define key entities and their relationships before discussing behaviors or mechanics.

### Progression

Each section builds on the previous. The reader should never encounter an unexplained term. Structure from:

1. **What things are** (entities, definitions)
2. **How things relate** (relationships, interactions)
3. **How things behave** (mechanics, rules, edge cases)
4. **Nuances and caveats** (non-obvious behavior, common misconceptions)

### Section Design

- Each section covers one concept or closely related group
- Keep sections short — a reader should be able to scan the heading and get the gist
- Use descriptive headings that communicate content (not generic labels like "Details" or "More Information")

## Style Guidelines

### Voice and Tone

- Declarative and direct — state how things work, not how they might work
- No hedging or filler ("It should be noted that...", "It's worth mentioning...")
- Confident but honest — if something is uncertain or context-dependent, say so plainly

### Formatting for Scannability

- **Bold key terms** on first introduction
- Use **tables** for comparisons, multi-dimensional relationships, and quick-reference summaries
- Use **bulleted lists** for sets of items or properties
- Use **numbered lists** only for sequential steps or ranked items
- Use headings liberally — they are the primary navigation tool for scanners

### Conciseness

- Cover the essentials without being exhaustive
- Every sentence should teach something — remove sentences that only connect or transition
- Prefer a concrete example over an abstract explanation when both would take similar space
- Do not repeat information across sections; reference earlier sections if needed

### Defining Terms

- Define terms where they first appear, inline with the explanation
- Do not create a separate glossary — definitions should be encountered in context
- Use the format: **Term** — definition. (Bold term, em dash, explanation.)

Example:
> **Application** — an OAuth 2.0 client that *requests* tokens. Identified by a `client_id` and `client_secret`.

### Tables

Use tables when comparing across multiple dimensions. Tables are especially effective for:

- Showing how behavior differs across contexts or configurations
- Summarizing "if X then Y" relationships
- Quick-reference summaries of a section's key points

### Critical Distinctions

When the topic has a commonly confused or non-obvious behavior, call it out with a clearly labeled subsection (e.g., "Critical: These Are Mutually Exclusive"). Do not bury important caveats in the middle of a paragraph.

## Anti-Patterns

- **Wall of text** — if a section has more than ~6 lines of prose without a heading, list, or table, break it up
- **Jargon without definition** — every domain term must be defined before or at the point of use
- **Backwards dependencies** — never reference a concept that hasn't been introduced yet
- **Exhaustive coverage** — this is a learning document, not a reference manual; cover what's needed to understand the topic, not every edge case
- **Condescending tone** — the reader is a beginner to *this topic*, not to thinking; avoid phrases like "simply", "just", "of course"
