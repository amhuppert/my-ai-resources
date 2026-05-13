---
name: configure-editor-schema
description: Wire an existing JSON Schema into VS Code, Cursor, and/or Zed so it provides validation and IntelliSense for matching JSON or YAML files.
argument-hint: "[<schema-path-or-url>] [--type json|yaml] [--match <glob>] [--editor vscode|cursor|zed] [--scope user|project]"
allowed-tools: Read, Edit, Write, Glob, AskUserQuestion, Bash(ls:*), Bash(mkdir:*)
disable-model-invocation: true
---

# Editor Schema Configurator

Associate an existing JSON Schema with a file-match glob in one or more editors (VS Code, Cursor, Zed) for both JSON and YAML files. Authoring the schema itself is **out of scope** — the schema must already exist on disk or be reachable at an HTTPS URL.

<arguments>
$ARGUMENTS
</arguments>

## Step 1: Parse Inputs

Extract these inputs from `$ARGUMENTS`. Anything missing is collected via `AskUserQuestion` in Step 2.

- **Schema source**: a local file path (absolute or project-relative) OR an HTTPS URL.
- **File type**: `json` or `yaml` — which file type the schema validates.
- **File-match glob(s)**: one or more glob patterns matching the config files that should use this schema (e.g., `**/myconfig.json`, `.foo/*.yaml`).
- **Editor(s)**: any combination of VS Code, Cursor, Zed.
- **Scope**: `user` (default) or `project`.

If the schema source is ambiguous (e.g., the user said "the schema for X" without giving a path), treat it as missing.

## Step 2: Collect Missing Inputs

Use `AskUserQuestion` to fill gaps. One question per missing input. Suggested prompts:

- **Schema source**: "Where is the schema? Provide an absolute path, a project-relative path, or an HTTPS URL."
- **File type**: "Is this schema for JSON files or YAML files?" (options: `json`, `yaml`)
- **Glob(s)**: "Which files should this schema apply to? Provide one or more glob patterns."
- **Editors**: "Which editors should I configure?" (options: `VS Code`, `Cursor`, `Zed`, plus combinations — allow multi-select)
- **Scope**: "User-level (applies across all your projects) or project-level (committed to this repo)?" Default: user.

Confirm the resolved inputs back to the user in one short summary before writing anything.

## Step 3: Resolve Settings File Paths

For each chosen editor and scope, determine the absolute path of the settings file. Consult `references/editor-settings.md` for the per-OS path table and project-level conventions.

Use `uname` or known environment context to detect the OS. On Linux, prefer `$XDG_CONFIG_HOME` when set, falling back to `~/.config`.

If a settings file or its parent directory does not exist, create them:

- `mkdir -p <parent-dir>`
- `Write` an empty `{}` if the file is missing.

## Step 4: Read Existing Settings and Detect Conflicts

For each target settings file:

1. Read the file with the `Read` tool.
2. Locate the relevant schemas section based on editor + file type. See `references/editor-settings.md` for the exact shape per editor.
3. Detect conflicts:
   - **VS Code/Cursor JSON** (`json.schemas` array): conflict = an existing entry whose `fileMatch` overlaps with the new glob.
   - **VS Code/Cursor YAML** (`yaml.schemas` map): conflict = an existing key (schema source) already bound to an overlapping glob, OR a different schema source bound to the same glob.
   - **Zed JSON / Zed YAML**: same logic, but nested under `lsp.{json|yaml}-language-server.settings.{json|yaml}.schemas`.

"Overlap" means the new glob equals or is a string-identical match of an existing one. Don't try to compute true set-overlap — when in doubt, surface the candidate to the user.

If conflicts exist, use `AskUserQuestion` per conflicting entry: "Overwrite the existing mapping `<existing>` with `<new>`?" Options: `overwrite`, `skip this editor`, `abort`.

## Step 5: Apply Additive Edits

For each settings file:

1. Use the `Edit` tool to make the smallest possible surgical change. **Never** rewrite the whole file with `Write` when settings already exist.
2. Preserve JSONC content — comments, trailing commas, formatting. All three editors permit JSONC in their settings files.
3. Insert into existing structure when the parent keys exist; otherwise create the nested keys.
4. Use the exact shape documented in `references/editor-settings.md`.

Two common patterns:

- **Empty file (`{}`)**: extend `{}` to include the full required nested structure.
- **Existing schemas section**: append to the array (VS Code/Cursor JSON, Zed JSON) or add a new key (VS Code/Cursor YAML, Zed YAML).

After editing, re-read the file once to confirm the change parses as valid JSONC (look for matching braces and the new entry being present).

## Step 6: Report Results

Return a short summary:

- For each editor configured: the settings file path and a one-line description of what was added.
- If YAML was configured for VS Code or Cursor, surface the prerequisite: **the Red Hat YAML extension (`redhat.vscode-yaml`) must be installed**, otherwise `yaml.schemas` does nothing. The skill does not probe for it.
- If a file or directory was created, mention that.
- If the user chose to skip an editor due to a conflict, mention that too.

## Edge Cases

- **HTTPS schema URL with YAML**: works in all three editors.
- **Zed paths**: `./` resolves to the worktree root, `~/` to the home directory. For user-level Zed config, prefer absolute paths or `~/` over `./` — `./` may resolve unpredictably.
- **Multi-root workspaces**: out of scope. Treat the current working directory as the single workspace root for project-scope edits.
- **OS support**: Linux and macOS only. Windows is not supported.

## Additional Resources

- **`references/editor-settings.md`** — Per-OS settings paths, exact settings shapes for every editor+file-type combination, JSONC notes, and the Red Hat YAML extension prerequisite.
