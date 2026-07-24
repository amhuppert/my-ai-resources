# Zed (Focused App, macOS)

Zed is a GUI editor with a layered, context-scoped keymap. Bindings can be scoped to specific UI contexts (`Editor`, `Workspace`, `Terminal`, etc.) and Zed supports two-stroke chords via its `cmd-k <X>` pattern.

## Overview

Zed sits at layer 5/6. Customizations live in JSON files and ship with the app's defaults as the lowest layer. The user config and an optional per-project config override defaults in load order.

The keymap is **context-scoped**: the same combo can mean different things in `Editor` vs. `Terminal` vs. `Workspace`. When analyzing a Zed binding, the context matters as much as the combo.

## Modifier Conventions

In Zed `keymap.json`, modifiers are spelled lowercase and hyphenated:

- `cmd` — Cmd
- `ctrl` — Ctrl
- `alt` — Opt
- `shift` — Shift
- Combined: `'cmd-shift-p'`, `'ctrl-alt-/'`
- Chords: two events separated by space: `'cmd-k cmd-s'`
- Key names: literal characters (`p`), or named keys (`escape`, `enter`, `space`, `tab`, `up`, `down`, `left`, `right`, `f1`–`f12`, `backspace`, `delete`).

## Default Bindings on macOS

This is a curated list of high-traffic defaults. Zed ships hundreds; for completeness, refer to the in-app keymap viewer (`Cmd+K Cmd+S` opens it).

### Command / Navigation

| Action | Combo |
|---|---|
| Command palette | `Cmd+Shift+P` |
| File finder | `Cmd+P` |
| Project search | `Cmd+Shift+F` |
| Buffer search | `Cmd+F` |
| Replace in buffer | `Cmd+Opt+F` |
| Symbol in buffer | `Cmd+Shift+O` |
| Symbol in project | `Cmd+T` |
| Go to line | `Ctrl+G` |
| Open recent | `Cmd+Opt+O` |

### Editing

| Action | Combo |
|---|---|
| Toggle line comment | `Cmd+/` |
| Toggle block comment | `Cmd+Opt+/` |
| Add cursor below / above | `Cmd+Opt+Down` / `Cmd+Opt+Up` |
| Select next occurrence | `Cmd+D` |
| Select all occurrences | `Cmd+Shift+L` |
| Move line up / down | `Ctrl+Cmd+Up` / `Ctrl+Cmd+Down` |
| Duplicate line up / down | `Cmd+Shift+Up` / `Cmd+Shift+Down` (varies) |
| Delete line | `Cmd+Shift+K` |
| Newline below | `Cmd+Enter` |
| Newline above | `Cmd+Shift+Enter` |
| Format file | `Cmd+Shift+I` (if assigned) |
| Format selection | (no default; rebind) |

### LSP / Code Intelligence

| Action | Combo |
|---|---|
| Go to definition | `F12` or `Cmd+click` |
| Go to type definition | `Cmd+F12` |
| Go to references | `Shift+F12` |
| Rename | `F2` |
| Code action | `Cmd+.` |
| Hover | `Cmd+K Cmd+I` (chord) |

### Panels / Docks

| Action | Combo |
|---|---|
| Toggle left dock (project panel) | `Cmd+B` |
| Toggle right dock | `Cmd+R` |
| Toggle bottom dock (terminal) | `Ctrl+\`` (backtick) or `Cmd+J` |
| Toggle terminal | `Ctrl+\`` |
| New terminal | `Ctrl+Shift+\`` |
| Reveal in project panel | `Cmd+Shift+E` |

### Workspace

| Action | Combo |
|---|---|
| New file | `Cmd+N` |
| Open | `Cmd+O` |
| Save | `Cmd+S` |
| Save as | `Cmd+Shift+S` |
| Close pane | `Cmd+W` |
| Reopen closed item | `Cmd+Shift+T` |
| Split right | `Cmd+\` (backslash) |
| Split down | (no default; rebind) |
| Switch pane left/right | `Cmd+K Cmd+Left/Right` (chord) |
| Settings | `Cmd+,` |
| Open keymap | `Cmd+K Cmd+S` |

### Chord prefix

Zed leans on `Cmd+K` as a chord prefix. The full `Cmd+K <something>` space is intentionally available for user-defined chords.

For exact defaults of the user's installed version, use the in-app keymap editor (`Cmd+K Cmd+S`) or the docs at <https://zed.dev/docs/key-bindings>.

## Customization Files

Load order (later overrides earlier):

| Layer | Path | Format |
|---|---|---|
| User | `~/.config/zed/keymap.json` | JSON array of context blocks |
| Project | `<repo>/.zed/keymap.json` | JSON array of context blocks |

User settings (not keymap) live at `~/.config/zed/settings.json` and project `<repo>/.zed/settings.json` — bindings can reference Zed actions whose behavior depends on settings, but bindings themselves live in `keymap.json`.

### Format

```json
[
  {
    "context": "Editor",
    "bindings": {
      "cmd-shift-p": "command_palette::Toggle",
      "cmd-k cmd-s": "zed::OpenKeymap"
    }
  },
  {
    "context": "Workspace",
    "bindings": {
      "cmd-w": "pane::CloseActiveItem"
    }
  }
]
```

### Common contexts

- `Workspace` — anywhere in the workspace.
- `Editor` — a text editor pane is focused.
- `Editor && vim_mode == normal` — Zed's vim-mode normal mode.
- `Terminal` — terminal panel focused.
- `EmptyPane` — empty pane.

Zed evaluates contexts from most specific to least specific; a binding in `Editor` overrides the same binding in `Workspace`.

### Finding bindings

In `keymap.json`, grep for the combo (after lowercasing and hyphen-normalizing):

- Search for `"<combo>"` — fast match.
- Examine the surrounding `"context"` to confirm where it fires.

For each user override hit, note the action it maps to and the context.

### Detecting "default disabled" vs "default replaced"

- **Replaced**: combo appears with a string value (an action name) → fires that action instead of default.
- **Disabled** (in the same context): combo mapped to `null` →

  ```json
  { "bindings": { "cmd-p": null } }
  ```

  This removes the binding in that context, letting it fall through to a less-specific context's binding (or do nothing).

- **Untouched**: combo doesn't appear anywhere in `keymap.json` → default applies.

## Override Mechanics

To free or change a Zed default:

- **Disable** in a context: bind to `null` as above.
- **Replace**: bind to a different action.
- **Rebind to chord**: `"cmd-k cmd-p": "pane::OpenFile"`.

Defaults can be inspected by opening `Cmd+K Cmd+S` (keymap editor) or via the action menu (`Cmd+Shift+P` → "open default keymap").

## Known Swallow Traps

- **`Cmd+P`** — file finder. Vim users expecting `Cmd+P` to do nothing in normal mode will still get the Zed action because the binding is in `Workspace` context, not Editor-specific.
- **`Cmd+T`** — symbol in project. Web-browser muscle memory for "new tab" doesn't apply.
- **`Ctrl+G`** — go to line. Common Emacs cancel reflex (`Ctrl+G`) will trigger this.
- **`Cmd+\`` (backslash)** — split right. Easy to fat-finger.
- **Vim-mode interactions** — if the user is in vim mode, modal contexts apply and many "default" bindings only fire in specific modes.

## Discovery Commands / UI Paths

- `Cmd+K Cmd+S` — opens the keymap editor.
- `Cmd+Shift+P` → "zed: open default keymap" — read-only view of all defaults.
- `Cmd+Shift+P` → "zed: open keymap" — opens the user keymap.json for editing.

## Known Unknowns

- Default keymap shifts between Zed versions; the table above is illustrative. For binding decisions where exact defaults matter, ask the user to run the "open default keymap" command and paste relevant excerpts.
- Vim-mode customization (`vim` mode enabled in settings) substantially changes which bindings fire in which mode; ask whether vim mode is enabled.
