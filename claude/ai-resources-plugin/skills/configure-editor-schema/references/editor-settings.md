# Editor schema settings reference

Settings paths, JSON shapes, examples, and prerequisites for VS Code, Cursor, and Zed on macOS and Linux (Windows is not supported).

## Settings file paths

### User scope (default)

| Editor | macOS | Linux (XDG) |
| --- | --- | --- |
| VS Code | `~/Library/Application Support/Code/User/settings.json` | `~/.config/Code/User/settings.json` |
| Cursor | `~/Library/Application Support/Cursor/User/settings.json` | `~/.config/Cursor/User/settings.json` |
| Zed | `~/.config/zed/settings.json` | `~/.config/zed/settings.json` |

On Linux, prefer `$XDG_CONFIG_HOME` when set (for example `$XDG_CONFIG_HOME/Code/User/settings.json`).

### Project scope

| Editor | Path | Notes |
| --- | --- | --- |
| VS Code | `.vscode/settings.json` | Standard |
| Cursor | `.cursor/settings.json` | Preferred on current Cursor |
| Cursor (legacy) | `.vscode/settings.json` | Fallback only if `.cursor/` is unsupported |
| Zed | `.zed/settings.json` | Standard |

## Settings shapes

Each block shows only the schema slice to merge into existing JSONC settings. Match the file's existing indentation, or default to two spaces for a new file.

### VS Code and Cursor: JSON

```jsonc
{
  "json.schemas": [
    {
      "fileMatch": ["<glob>", "<another-glob>"],
      "url": "<absolute-path | ./workspace-relative | https-url>"
    }
  ]
}
```

- `json.schemas` is a top-level array. Append new objects to it.
- `fileMatch` supports `*` wildcards and `!`-prefixed exclusions. At least one pattern must match, and the last matching pattern cannot be an exclusion.
- `url` accepts HTTPS URLs, `./` workspace-relative paths (project scope), or absolute paths (user scope).

### VS Code and Cursor: YAML

Requires the **Red Hat YAML extension** (`redhat.vscode-yaml`); without it, `yaml.schemas` does nothing.

```jsonc
{
  "yaml.schemas": {
    "<schema-source>": "<glob>",
    "<other-schema-source>": ["<glob1>", "<glob2>"]
  }
}
```

`yaml.schemas` maps each schema source (HTTPS URL, absolute path, workspace-relative path, or the reserved `kubernetes` keyword) to a glob string or array of globs.

### Zed: JSON

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

In Zed, `./` resolves relative to the worktree root (avoid it in user-scope config), `~/` expands to the home directory (preferred for user-scope local schemas), and absolute paths or HTTPS URLs work in either scope.

### Zed: YAML

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

Uses the same map value rules as VS Code/Cursor YAML and the same path resolution rules as Zed JSON. To turn off Zed's bundled SchemaStore, add `"schemaStore": { "enable": false }` inside `settings.yaml`.

## Merge cases

| Existing file state | Action |
| --- | --- |
| File missing | Create parent directory, write `{}` with the full nested entry |
| File is `{}` | Insert the full nested structure and entry |
| Parent keys exist, schemas key missing | Add the schemas key under the existing parent |
| Schemas key exists, no conflict | Append to the array (JSON) or add a key (YAML) |
| Schemas key exists, conflicting entry | Ask the user to overwrite, skip the editor, or abort |

## Prerequisites

| Editor and file type | Prerequisite |
| --- | --- |
| VS Code / Cursor JSON | Built in |
| VS Code / Cursor YAML | Red Hat YAML extension (`redhat.vscode-yaml`) |
| Zed JSON / YAML | Built in (`json-language-server` / `yaml-language-server`) |

## Worked examples

VS Code user-scope JSON (`~/.config/Code/User/settings.json`):

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

Cursor project-scope YAML (`.cursor/settings.json`, requires `redhat.vscode-yaml`):

```jsonc
{
  "yaml.schemas": {
    "./schemas/build.schema.json": ["build/*.yaml"]
  }
}
```

Zed user-scope JSON (`~/.config/zed/settings.json`):

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

Zed project-scope YAML (`.zed/settings.json`):

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
