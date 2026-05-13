# Editor Schema Settings Reference

Complete reference for wiring JSON Schemas into VS Code, Cursor, and Zed for JSON and YAML files.

## Settings File Paths

### User Scope (default)

| Editor  | macOS                                                        | Linux (XDG)                                  |
| ------- | ------------------------------------------------------------ | -------------------------------------------- |
| VS Code | `~/Library/Application Support/Code/User/settings.json`      | `~/.config/Code/User/settings.json`          |
| Cursor  | `~/Library/Application Support/Cursor/User/settings.json`    | `~/.config/Cursor/User/settings.json`        |
| Zed     | `~/.config/zed/settings.json`                                | `~/.config/zed/settings.json`                |

On Linux, honor `$XDG_CONFIG_HOME` when set (e.g., `$XDG_CONFIG_HOME/Code/User/settings.json`).

Windows is not supported.

### Project Scope

| Editor  | Path                                              | Notes                                                                  |
| ------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| VS Code | `.vscode/settings.json`                           | Standard.                                                              |
| Cursor  | `.cursor/settings.json`                           | Preferred for newer Cursor versions.                                   |
| Cursor  | `.vscode/settings.json` (legacy fallback)         | Inherited via fork compatibility; use only when `.cursor/` is unsupported. |
| Zed     | `.zed/settings.json`                              | Standard.                                                              |

## Settings Shapes

All shapes below show only the schema-relevant slice. They must be merged into existing settings — **never** replace the whole file.

### VS Code / Cursor — JSON

```jsonc
{
  "json.schemas": [
    {
      "fileMatch": ["<glob>", "<another-glob>"],
      "url": "<absolute-path | workspace-relative-path | https-url>"
    }
  ]
}
```

- `json.schemas` is a **top-level array**. Append new entries; don't rebuild it.
- `fileMatch` supports `*` wildcards and `!`-prefixed exclusions. At least one pattern must match and the last matching pattern must not be an exclusion.
- `url` accepts:
  - HTTPS URLs (e.g., `https://json.schemastore.org/...`)
  - Workspace-relative paths starting with `./` (project scope)
  - Absolute paths (user scope)

### VS Code / Cursor — YAML

Requires the **Red Hat YAML extension** (`redhat.vscode-yaml`). Without it, `yaml.schemas` is inert. The skill documents this prerequisite but does not probe for the extension.

```jsonc
{
  "yaml.schemas": {
    "<schema-source>": "<glob>",
    "<other-schema-source>": ["<glob1>", "<glob2>"]
  }
}
```

- `yaml.schemas` is a **map** from schema source → glob (string) or globs (array).
- Schema source accepts:
  - HTTPS URLs
  - Absolute file paths
  - Workspace-relative paths (resolved relative to the YAML file's workspace root)
  - Reserved keyword `kubernetes` (built-in Kubernetes schema)

### Zed — JSON

```jsonc
{
  "lsp": {
    "json-language-server": {
      "settings": {
        "json": {
          "schemas": [
            {
              "fileMatch": ["<glob>"],
              "url": "<absolute-path | ./worktree-relative | ~/home-relative | https-url>"
            }
          ]
        }
      }
    }
  }
}
```

Path resolution in Zed:

- `./` — relative to the worktree (project) root. **Avoid in user-scope settings**; it resolves unpredictably outside a project.
- `~/` — expands to the home directory. Preferred for user-scope local schemas.
- Absolute paths and HTTPS URLs — work in both scopes.

### Zed — YAML

```jsonc
{
  "lsp": {
    "yaml-language-server": {
      "settings": {
        "yaml": {
          "schemas": {
            "<schema-source>": ["<glob>"],
            "<other-schema-source>": "<glob>"
          }
        }
      }
    }
  }
}
```

Same value rules as VS Code/Cursor YAML (string or array of strings). Same Zed path resolution as Zed JSON.

To disable the bundled SchemaStore in Zed:

```jsonc
{
  "lsp": {
    "yaml-language-server": {
      "settings": {
        "yaml": {
          "schemaStore": { "enable": false }
        }
      }
    }
  }
}
```

## JSONC Handling

All three editors permit comments and trailing commas in their settings files. When editing:

- Use the `Edit` tool, not `Write`, to preserve existing comments and formatting.
- Do not strip comments to round-trip via `JSON.parse`/`JSON.stringify` — that destroys user-visible documentation.
- Indentation: match the file's existing indentation. Default to two spaces if creating a new file.
- After editing, re-read once to confirm braces balance and the new entry is present.

## Merge Decision Table

| Existing state of the relevant slice                | Action                                                          |
| --------------------------------------------------- | --------------------------------------------------------------- |
| File does not exist                                 | `mkdir -p` parent, then `Write` minimal `{}` shape with the entry. |
| File is `{}` (empty object)                         | Insert the full nested structure plus the new entry.            |
| Parent keys exist but schemas section is missing    | Add the schemas section under existing parents.                 |
| Schemas section exists, no conflict                 | Append the new entry (array) or new key (map).                  |
| Schemas section exists, conflicting glob/source     | `AskUserQuestion` per conflict (overwrite / skip / abort).      |

## Quick Examples

### Example 1 — VS Code user-scope, JSON schema for `**/myconfig.json` from an HTTPS URL

File: `~/.config/Code/User/settings.json` (Linux)

```jsonc
{
  "json.schemas": [
    {
      "fileMatch": ["**/myconfig.json"],
      "url": "https://example.com/myconfig.schema.json"
    }
  ]
}
```

### Example 2 — Cursor project-scope, YAML schema from a local file

File: `.cursor/settings.json`

```jsonc
{
  "yaml.schemas": {
    "./schemas/build.schema.json": ["build/*.yaml"]
  }
}
```

Reminder: requires `redhat.vscode-yaml` extension.

### Example 3 — Zed user-scope, JSON schema from `~/.config/schemas/foo.json`

File: `~/.config/zed/settings.json`

```jsonc
{
  "lsp": {
    "json-language-server": {
      "settings": {
        "json": {
          "schemas": [
            {
              "fileMatch": ["**/foo.config.json"],
              "url": "~/.config/schemas/foo.json"
            }
          ]
        }
      }
    }
  }
}
```

### Example 4 — Zed project-scope, YAML schema for `k8s/**/*.yaml`

File: `.zed/settings.json`

```jsonc
{
  "lsp": {
    "yaml-language-server": {
      "settings": {
        "yaml": {
          "schemas": {
            "./schemas/k8s.json": "k8s/**/*.yaml"
          }
        }
      }
    }
  }
}
```

## Prerequisites Summary

| Editor + Type    | Prerequisite                                                  |
| ---------------- | ------------------------------------------------------------- |
| VS Code JSON     | None — built in.                                              |
| VS Code YAML     | **Red Hat YAML extension** (`redhat.vscode-yaml`).            |
| Cursor JSON      | None — built in (forked from VS Code).                        |
| Cursor YAML      | **Red Hat YAML extension** (`redhat.vscode-yaml`).            |
| Zed JSON         | None — `json-language-server` ships with Zed.                 |
| Zed YAML         | None — `yaml-language-server` ships with Zed.                 |

Surface the YAML extension prerequisite to the user when configuring VS Code or Cursor for YAML.
