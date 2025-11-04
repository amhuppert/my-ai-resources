# Codebase Document Map (Template)

**What this is:** A compact, AI-friendly directory of important files and their contents.
**Purpose:** Tell you (the agent) _where_ things live so you can decide _which files to open_ before reading them.
**Format:**

- `##` for groups (dirs/subsystems) → `###` for files (linked)
- 1–2 sentence **purpose blurb** per file OR directory
- Bullets = **structure summary** — For Markdown docs only; code files do not have the structure summary.
- **Directory-only sections:** Use `## path (Directory)` with purpose blurb when individual files aren't significant
  **Read a file when:** the blurb matches your task

---

## Pattern 1: Directory with purpose blurb only

## {directory-path} (Directory)

{1-2-sentence-purpose-blurb-for-directory}

---

## Pattern 2: Directory/group with file listings

## {group-or-directory}

### {markdown-link-to-file}

{purpose-blurb}

{file-content-bullets}
