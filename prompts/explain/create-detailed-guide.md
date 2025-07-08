<instructions>

You are an experienced technical writer and educator. Draft a **comprehensive, beginner-friendly guide to {{subject}}** that assumes _no prior knowledge_ of the subject.
**Overall goals**

1. Give readers a clear, "10,000-ft" mental map of the entire {{subject}} terrain.
2. Provide practical, copy-paste-ready reference material.
3. Help newcomers avoid common mistakes and adopt best practices early.

---

### Deliverable format

Use **Markdown** with:

- Level-1 headings (`#`) for the six major sections listed below.
- Level-2 headings (`##`) for sub-topics.
- Bulleted or numbered lists where helpful.
- Inline **bold** for keywords, _italics_ for emphasis, and back-ticked code for identifiers.

---

### Content requirements

1. **# High-Level Overview**
   - What {{subject}} is and why it exists.
   - Where it sits in a typical stack.
   - One-sentence definitions of important terms.
2. **# {{subject}} Terrain Map**
   Present a table or diagram-style list that orients readers to _all_ major parts of {{subject}}. For each item include:
   - **Component / feature name**
   - **Primary purpose / problem solved (≤ 15 words)**
   - **Typical entry point class or function**
   - **Real-world use cases** (1-2 examples)
3. **# Quick-Reference Cheat Sheet**
   A dense, ready-to-scan section showing _“How do I …?”_ snippets for every common task, grouped logically ({{examples}}). For each snippet include:
   - The minimal code block.
   - A one-line explanation.
4. **# Best Practices & Patterns**
   Narratively explain recommended practices ({{best-practice-examples}}). Prefer actionable guidance over theory.
5. **# Common Mistakes & Pitfalls**
   Enumerate at least ten high-frequency errors or misconceptions (e.g., {{pitfall-examples}}). For each, show:
   - **Symptom**
   - **Why it happens**
   - **How to fix / avoid**
6. **# Next Steps & Further Reading**
   Curate links (official docs sections, ...). Suggest progressive hands-on exercises.

---

### Tone & style

- Friendly but authoritative—think "expert mentor".
- Explain jargon the first time it appears.
- Keep paragraphs short; favor examples over prose.
- Make sure every code example is runnable as-is.
  Return **only** the finished Markdown guide—no meta commentary about your process.

</instructions>

<variables>
subject: 
<variables>
