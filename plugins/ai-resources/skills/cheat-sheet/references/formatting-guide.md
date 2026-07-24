# Cheat Sheet Formatting Guide

Detailed formatting rules and examples for producing high-quality cheat sheets.

## Section Templates

### Command-Based Topics (CLI tools, Git, Docker, etc.)

```markdown
# [Topic] Cheat Sheet

[One-sentence description of what the tool does.]

## [Most Common Category]

| Command | Description |
|---|---|
| `command` | What it does |
| `command --flag` | What the flag does |

## [Next Category]

...
```

Use tables for command references — compact and scannable.

### Concept-Based Topics (Languages, Frameworks, APIs)

```markdown
# [Topic] Cheat Sheet

[One-sentence description.]

## [Core Concept]

- **term** — Brief definition
- **term** — Brief definition

### Syntax

\```language
example code
\```

## [Next Concept]

...
```

Use bold terms with dash separators for concept definitions. Use code blocks for syntax examples.

### Mixed Topics

Combine tables for commands and bullet lists for concepts as appropriate per section.

## Entry Formatting Rules

### Command Entries

- Show the command in a code block or inline code
- Include the most important flags/options inline
- Keep the description to one line

**Good:**
```markdown
| `git log --oneline -10` | Show last 10 commits, one line each |
```

**Bad:**
```markdown
| `git log` | This command shows the commit history. You can use various flags like --oneline to show each commit on one line, or -10 to limit output. |
```

### Concept Entries

- Bold the term name
- Use an em-dash or colon separator
- One line per concept

**Good:**
```markdown
- **closure** — A function that captures variables from its enclosing scope
```

**Bad:**
```markdown
- Closure: A closure is a programming concept where a function retains access to variables from its parent scope even after the parent function has returned. This is commonly used in JavaScript and other languages.
```

### Code Examples

- Keep examples minimal — show the pattern, not a full program
- Annotate with brief inline comments only when non-obvious
- Show input and expected output when the output is non-obvious

**Good:**
```markdown
\```bash
# Rebase last 3 commits onto main
git rebase --onto main HEAD~3
\```
```

**Bad:**
```markdown
\```bash
# First, make sure you are on your feature branch
git checkout feature-branch
# Now, let's rebase. The --onto flag allows us to specify
# a new base for our commits. HEAD~3 means we want to
# take the last 3 commits and move them.
git rebase --onto main HEAD~3
# After rebasing, you may need to force push
git push --force-with-lease
\```
```

## Length and Density Guidelines

- Target 1-2 printed pages (roughly 60-120 lines of content)
- Prefer density over completeness — 8 well-chosen items beat 20 mediocre ones
- Each section: 3-8 entries
- Total sections: 4-8
- If content exceeds 2 pages, cut the least commonly used items

## Section Ordering

1. **Most common operations** — What users do 80% of the time
2. **Configuration/setup patterns** — Common config snippets (only if frequently referenced)
3. **Intermediate operations** — Next tier of useful commands/features
4. **Shortcuts and tips** — Time-saving tricks, common flag combos
5. **Gotchas / common mistakes** — Only include if genuinely tricky

Not all sections are needed. Adapt to the topic.

## What to Exclude

- Installation instructions (not a reference concern)
- History or background of the tool
- Detailed explanations of how things work internally
- Rarely-used commands or features (the bottom 20%)
- Multiple ways to do the same thing (pick the best one)
- Version-specific behavior (unless critical to avoid breakage)

## LaTeX-Specific Formatting (PDF Output)

When generating PDF output via LaTeX, apply these adjustments for print-friendly cheat sheets:

### Page Layout

```latex
\usepackage[a4paper, margin=1.5cm]{geometry}
\usepackage{multicol}
\setlength{\columnsep}{1cm}
```

### Compact Spacing

```latex
\usepackage{enumitem}
\setlist{nosep, leftmargin=*}
\usepackage{titlesec}
\titlespacing*{\section}{0pt}{1ex}{0.5ex}
\titlespacing*{\subsection}{0pt}{0.75ex}{0.25ex}
```

### Code Listings

```latex
\lstset{
  basicstyle=\small\ttfamily,
  breaklines=true,
  frame=single,
  framesep=2pt,
  aboveskip=0.5ex,
  belowskip=0.5ex,
}
```

### Font Size

Use 9pt or 10pt document font size:

```latex
\documentclass[a4paper, 9pt]{scrartcl}
```

### Two-Column Layout

Wrap the main content in a `multicols` environment when the cheat sheet has many short entries:

```latex
\begin{multicols}{2}
... content ...
\end{multicols}
```
