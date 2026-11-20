# Cheat sheet formatting guide

Layout templates, entry rules, and LaTeX settings for 1 to 2 page quick references.

## Section templates

### Command-based topics (CLI tools, Git, Docker)

Use tables for commands so flags and effects scan cleanly:

```markdown
# [Topic] Cheat Sheet

[One-sentence summary of what the tool does.]

## [Most common category]

| Command | Description |
| --- | --- |
| `command` | What it does |
| `command --flag` | What the flag does |
```

### Concept-based topics (languages, frameworks, APIs)

Use bold terms with short definitions and tight syntax blocks:

````markdown
# [Topic] Cheat Sheet

[One-sentence summary.]

## [Core concept]

- **term:** brief one-line definition
- **term:** brief one-line definition

### Syntax

```language
example code
```
````

Combine tables and short lists per section when a topic mixes CLI usage and concepts.

## Entry rules

Keep each entry to one line and pack the high-value flags or patterns inline.

- **Commands:** Good: `| \`git log --oneline -10\` | Show last 10 commits, one line each |`. Bad: a two-sentence paragraph explaining what `git log` is and listing flags in prose.
- **Concepts:** Good: `- **closure:** function that captures variables from its enclosing scope`. Bad: a multi-sentence textbook definition.
- **Code snippets:** Show only the pattern, not surrounding boilerplate. Add a short comment or expected output only when non-obvious:

  ```bash
  # Rebase last 3 commits onto main
  git rebase --onto main HEAD~3
  ```

## Length, order, and cuts

Target 1 to 2 printed pages (about 60 to 120 lines), 4 to 8 sections, and 3 to 8 entries per section. Eight well-chosen items beat twenty mediocre ones. If a draft runs long, cut the least frequent items first.

Order sections from highest daily frequency downward:

1. Most common operations (what users run 80% of the time)
2. Frequent config snippets (only if looked up often)
3. Intermediate operations
4. High-value shortcuts and flag combos
5. Genuine gotchas (skip if none are truly tricky)

Exclude installation steps, tool history, internal mechanics, duplicate ways to achieve the same result, rare flags, and version quirks unless ignoring them breaks common usage.

## LaTeX settings for PDF output

Use a compact two-column layout at 9pt or 10pt so dense entries fit 1 to 2 pages cleanly:

```latex
\documentclass[a4paper, 9pt]{scrartcl}
\usepackage[a4paper, margin=1.5cm]{geometry}
\usepackage{multicol}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{listings}

\setlength{\columnsep}{1cm}
\setlist{nosep, leftmargin=*}
\titlespacing*{\section}{0pt}{1ex}{0.5ex}
\titlespacing*{\subsection}{0pt}{0.75ex}{0.25ex}

\lstset{
  basicstyle=\small\ttfamily,
  breaklines=true,
  frame=single,
  framesep=2pt,
  aboveskip=0.5ex,
  belowskip=0.5ex,
}
```

Wrap the body in `\begin{multicols}{2} ... \end{multicols}` when most entries are short.
