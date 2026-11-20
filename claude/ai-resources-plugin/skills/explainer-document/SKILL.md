---
name: explainer-document
description: "Write a concise beginner-friendly explainer that teaches an unfamiliar topic in dependency order."
disable-model-invocation: true
---

# Explainer document

Teach a topic from scratch to someone who does not know it yet. Every section should make sense using only what appeared earlier in the document.

## 1. Establish scope and dependency order

Identify three boundaries from the request: what is in and out of scope, what background the reader already has, and the target depth (conceptual overview vs. working knowledge). Ask only if an unstated boundary would materially change the document and cannot be inferred.

List the core concepts the reader needs and sort them by dependency so no concept relies on one explained later. For example:

> `Permission` depends on `API` -> `Role` depends on `Permission` -> `Client Grant` depends on both `Application` and `API`

Use that dependency order as the document's section order: start with the foundational entities, then how they relate, then mechanics and rules, and finally edge cases or common misconceptions.

## 2. Verify technical claims

For technical subjects, check claims against official documentation or source code rather than trusting memory. If a detail cannot be verified, say so directly instead of presenting it as fact.

## 3. Write for clarity

- **Define terms inline on first use.** Skip separate glossaries; explain each term where the reader first meets it, bolding the term on first mention.
- **Keep voice direct and honest.** State how things work cleanly without filler ("It is worth noting that..."). When behavior depends on context or is uncertain, say so plainly. Never condescend ("simply", "just", "obviously", "of course"): the reader is new to this topic, not new to thinking.
- **Cut exhaustiveness and transitions.** This is a learning guide, not a reference manual. Cover what builds a solid mental model and skip rare edge cases. Prefer a concrete example over an abstract paragraph of similar length, and do not repeat explanations across sections (refer back instead).
- **Match structure to the material.** Use descriptive headings that convey the point (not "Details" or "More Information"), tables for multi-dimensional comparisons or if-X-then-Y rules, lists for peer items, and numbered lists for sequences. Break up dense stretches naturally, and call out commonly confused or mutually exclusive behaviors in a dedicated subsection so caveats never hide mid-paragraph.

## 4. Check before finishing

Review the draft against four questions:

1. Can every section be understood using only the sections before it?
2. Is any domain term used before it is defined?
3. Did you include edge cases or internals a beginner does not need yet?
4. Is any essential piece of the mental model missing?

Fix any gap before returning or saving the document.
