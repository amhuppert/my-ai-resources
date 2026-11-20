---
name: cheat-sheet
description: "Create a 1 to 2 page cheat sheet or quick reference for a tool, language, or framework (Markdown or PDF)."
argument-hint: "<topic> [--pdf] [--output <path>]"
allowed-tools: Read, Write, WebSearch, WebFetch, Agent, AskUserQuestion, Bash(which:*), Bash(xelatex:*), Bash(lualatex:*), Bash(pdflatex:*)
disable-model-invocation: true
---

# Cheat sheet creator

Write a compact 1 to 2 page quick reference covering the commands, syntax, and patterns users look up repeatedly for a given topic. Density beats completeness: cut rare flags, installation steps, history, and internals.

## Inputs

Extract from the user's invocation:

- **Topic** (required)
- **Format:** Markdown by default, or PDF if `--pdf` or PDF output is requested
- **Output path:** custom path if `--output` is given; otherwise the current working directory

Ask one focused question only if the topic is too broad to pick a useful scope (for example, "Git" could target daily commands, rebasing/history repair, or config). If the scope is clear enough to choose a sensible default, proceed.

## Research and selection

Verify commands, flags, and syntax against current official documentation rather than relying on memory, especially for fast-moving tools. Read 2 or 3 authoritative primary pages when web access is available.

Before writing, decide what stays out:

- Keep the top 5 to 10 everyday operations, critical syntax patterns, and genuine gotchas.
- Group into 4 to 8 sections ordered from most frequent to least frequent.
- Drop installation guides, background prose, internal mechanics, duplicate ways to do the same thing, and bottom-20% flags.

## Formatting and output

Read [`references/formatting-guide.md`](references/formatting-guide.md) for section layouts, entry examples, length targets (roughly 60 to 120 lines), and LaTeX settings for PDF output.

- **Markdown (default):** save to `<topic>-cheat-sheet.md` (kebab-case) at the output path, and report the saved path.
- **PDF (`--pdf`):** write `<topic>-cheat-sheet.tex` using the compact LaTeX layout settings in [`references/formatting-guide.md`](references/formatting-guide.md), then compile it with an installed TeX engine (`xelatex`, `lualatex`, or `pdflatex`). If no TeX engine is installed, save the `.tex` file, tell the user which compiler is missing, and show the exact compile command.

Done when every command or syntax entry is verified against primary docs (or flagged if unverifiable), the document fits 1 to 2 printed pages without filler, and the saved output path is reported.
