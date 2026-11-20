---
name: configure-editor-schema
description: Wire an existing JSON Schema into VS Code, Cursor, or Zed settings
  for matching JSON or YAML files.
---

# Configure editor schema

Wire an existing JSON Schema to one or more file-match globs in VS Code, Cursor, or Zed for JSON or YAML files. Authoring the schema itself is out of scope; the schema must already exist on disk or at an HTTPS URL.

## 1. Resolve inputs

Extract five values from the invocation:

- **Schema source:** local file path (absolute or project-relative) or HTTPS URL. Treat vague descriptions like "the schema for X" as missing.
- **File type:** `json` or `yaml`.
- **File-match glob(s):** one or more patterns such as `**/myconfig.json` or `.foo/*.yaml`.
- **Editor(s):** any combination of VS Code, Cursor, and Zed.
- **Scope:** `user` (default) or `project`.

Ask only for inputs that are missing or ambiguous, using one compact round of questions. If all required inputs are already present, proceed without asking for extra confirmation.

## 2. Locate settings files

Read [`references/editor-settings.md`](references/editor-settings.md) for OS-specific settings paths, exact JSON/YAML schema shapes, and prerequisites. Only macOS and Linux are supported; multi-root workspaces are out of scope (treat the current working directory as the project root).

Detect the OS from environment context or `uname`. On Linux, use `$XDG_CONFIG_HOME` when set, falling back to `~/.config`. If a target settings file or its parent directory does not exist, create the parent directory and initialize the file with `{}`.

## 3. Check for conflicts and edit safely

For each target settings file:

1. Read the file and locate its schema section (see [`references/editor-settings.md`](references/editor-settings.md)).
2. Check for conflicts using exact string equality on globs or schema keys (do not attempt set-overlap math; if unsure, ask):
   - **JSON arrays** (`json.schemas` or Zed's `json.schemas`): conflict if an existing entry's `fileMatch` shares a glob with the new entry.
   - **YAML maps** (`yaml.schemas` or Zed's `yaml.schemas`): conflict if the same schema key already maps to an overlapping glob, or a different schema key maps to the same glob.
   - When a conflict exists, ask whether to overwrite, skip that editor, or abort.
3. Apply the smallest targeted text edit that inserts the new entry while preserving existing JSONC comments, trailing commas, and indentation. Never overwrite an existing settings file wholesale or round-trip it through `JSON.parse`/`JSON.stringify`.
4. For user-level Zed config, prefer absolute paths or `~/` over `./`, because `./` resolves relative to a project worktree.
5. Re-read the edited file to confirm balanced braces, intact comments, and the new entry in place.

## 4. Report results

Done when every requested editor's settings file has been updated (or explicitly skipped on conflict) and re-read for valid JSONC. Report:

- Each configured editor, its settings file path, and what was added (plus any created directories/files or skipped editors).
- If YAML was configured for VS Code or Cursor, note that the **Red Hat YAML extension** (`redhat.vscode-yaml`) is required for `yaml.schemas` to work (this skill does not probe installed extensions).
