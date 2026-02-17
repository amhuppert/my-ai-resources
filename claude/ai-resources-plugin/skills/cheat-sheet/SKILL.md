---
name: cheat-sheet
description: This skill should be used when the user asks to "create a cheat sheet", "make a cheat sheet", "generate a cheat sheet", "quick reference for", "cheat sheet for", or wants a concise, printable reference document for a specific tool, technology, language, or framework. Produces a 1-2 page reference focusing on the most commonly used commands, features, and patterns.
argument-hint: "<topic> [--pdf] [--output <path>]"
allowed-tools: Read, Write, WebSearch, WebFetch, Task, AskUserQuestion, Skill
---

# Cheat Sheet Creator

Create concise, high-quality cheat sheets for any tool, technology, language, framework, or concept. Output a practical 1-2 page reference document focusing on the most commonly used commands, features, and key information users look up repeatedly.

<topic>
$ARGUMENTS
</topic>

## Step 1: Parse the Request

Extract from the arguments:

- **Topic**: The subject of the cheat sheet (required)
- **Format**: Markdown file (default) or PDF (if `--pdf` flag or user requests PDF)
- **Output path**: Custom save location (if `--output` specified), otherwise save to the current working directory

If the topic is ambiguous or too broad, use AskUserQuestion to clarify scope. For example, "Git" could mean basic commands, advanced workflows, or configuration — ask which aspect to focus on.

## Step 2: Research the Topic

Conduct focused research to identify the most practical, commonly-referenced information.

1. **Search for official documentation**: Quick-start guides, command references, API summaries
2. **Search for existing cheat sheets**: Find what others consider essential for this topic
3. **Search for common usage patterns**: Tutorials, Stack Overflow answers, blog posts showing frequent use cases
4. **Fetch key pages**: Read 2-3 authoritative sources in full using WebFetch for precise syntax, flags, and options

Prioritize sources that reveal the most commonly used features, typical workflows, and critical gotchas.

## Step 3: Plan the Cheat Sheet

Before writing, distill the research into a concrete plan:

1. Select the 5-10 most commonly used commands/features to include
2. Identify critical syntax patterns users frequently reference
3. Group entries into 4-8 logical sections, ordered from most to least common
4. Decide what to **exclude** — avoid comprehensive coverage; focus on high-value items only

## Step 4: Write the Cheat Sheet

Follow the formatting guidelines in `references/formatting-guide.md` for structure templates, entry formatting rules, length targets, content priorities, and exclusion rules.

Key principles:

- Start with a one-sentence description of the topic
- Organize into clear sections with headers, most important first
- Target 1-2 printed pages — prefer density over completeness
- One line per entry — actionable, brief, code-formatted where appropriate

## Step 5: Save the Output

### Markdown Output (Default)

Save the cheat sheet as a markdown file:

- Filename: `<topic>-cheat-sheet.md` (kebab-case)
- Location: Current working directory, or custom path if `--output` specified
- Report the saved file path to the user

### PDF Output (When Requested)

When the user requests PDF output (via `--pdf` flag or explicit request):

1. Use the `latex` skill to create the cheat sheet as a `.tex` file
2. Apply the cheat-sheet-specific LaTeX adjustments from `references/formatting-guide.md` (compact margins, small font, two-column layout, reduced spacing)
3. Compile to PDF using the latex skill's compilation workflow
4. Report the saved PDF path to the user

## Additional Resources

### Reference Files

- **`references/formatting-guide.md`** — Detailed formatting rules, section templates, and examples of well-structured cheat sheet entries
