# WezTerm (Terminal Emulator Layer)

WezTerm sits at layer 3 in the stack. When the focused app is anything running inside WezTerm (tmux, Claude Code, shell, vim, etc.), WezTerm sees the keystroke first and may consume it before it reaches the TTY.

## Overview

Cross-platform GPU-accelerated terminal. Configured in Lua. On macOS, WezTerm tends to map its core commands to `Cmd+<...>` mirroring Mac conventions, but also ships many `Ctrl+Shift+<letter>` bindings from its cross-platform default set.

WezTerm has a concept of **leader** (configurable, like tmux's prefix) but it isn't set by default. Most defaults are direct chords with modifiers.

## Modifier Conventions

In `wezterm.lua`:

- `CMD` = `Cmd`
- `OPT` = `Opt` / Alt
- `CTRL` = `Ctrl`
- `SHIFT` = `Shift`
- `SUPER` = same as `CMD` on macOS
- Combined: `'CMD|SHIFT'` (pipe-separated).
- Key name: literal character like `'p'` or named like `'LeftArrow'`, `'F1'`, `'Tab'`.

Binding entries look like:

```lua
{ key = 'p', mods = 'CMD|SHIFT', action = wezterm.action.ActivateCommandPalette },
```

## Default Bindings on macOS

WezTerm's defaults on macOS lean on `Cmd` and `Cmd+Shift` to match macOS conventions, with some `Ctrl+Shift` carryover from cross-platform defaults. Confirm against the user's `wezterm.lua` and the WezTerm version installed — defaults shift between versions.

### Clipboard / Selection

| Action | Combo |
|---|---|
| Copy selection | `Cmd+C` |
| Paste | `Cmd+V` |
| Clear scrollback | `Cmd+K` |

### Tabs

| Action | Combo |
|---|---|
| New tab | `Cmd+T` |
| Close tab | `Cmd+W` |
| Activate tab N | `Cmd+1` … `Cmd+9` |
| Next tab | `Cmd+Shift+]` (or `Ctrl+Tab`) |
| Previous tab | `Cmd+Shift+[` (or `Ctrl+Shift+Tab`) |
| Show tab navigator | `Cmd+Shift+T` |

### Windows / Panes

| Action | Combo |
|---|---|
| New window | `Cmd+N` |
| Show launcher | `Cmd+Shift+L` |
| Toggle full screen | `Cmd+Enter` (default may differ — verify) |
| Adjust font size | `Cmd+=`, `Cmd+-`, `Cmd+0` |

### Search / Misc

| Action | Combo |
|---|---|
| Search scrollback | `Cmd+F` |
| Command palette | `Cmd+Shift+P` (in recent versions) |
| Show debug overlay | `Ctrl+Shift+L` |
| Quick select | `Ctrl+Shift+Space` |
| Copy mode | `Ctrl+Shift+X` |

Authoritative source for the precise version: WezTerm docs ("Default Key Assignments") and the version output of `wezterm --version`. If precise correctness matters for a binding, verify against the docs for the user's installed version.

## Customization Files

Load order (later overrides earlier in WezTerm's resolution):

| Layer | Path | Format |
|---|---|---|
| User (primary) | `~/.wezterm.lua` | Lua |
| User (XDG) | `~/.config/wezterm/wezterm.lua` | Lua |
| Modular | any `*.lua` `require()`d by the above | Lua |

WezTerm reads the first one it finds in path-order. Check both even if `~/.wezterm.lua` exists, because a single user may have moved configs around.

### Finding bindings

Grep patterns to find binding-related code:

```
config.keys
keys =
key =
mods =
leader =
DisableDefaultAssignment
SendKey
```

The bindings table is typically:

```lua
config.keys = {
  { key = 'p', mods = 'CMD|SHIFT', action = ... },
  ...
}
```

When the file `require`s modules, follow those `require` paths and re-grep.

### Detecting "default disabled" vs "default replaced"

- **Replaced**: `{ key = 'p', mods = 'CMD|SHIFT', action = wezterm.action.<X> }` — combo still triggers something, just not the default action.
- **Disabled**: `{ key = 'p', mods = 'CMD|SHIFT', action = wezterm.action.DisableDefaultAssignment }` — combo passes through to the lower layer (TTY → tmux → app).
- **Untouched**: combo doesn't appear in `config.keys` at all → default applies.

### Leader

Default: not set. If the user has set one, grep for:

```lua
config.leader = { key = 'a', mods = 'CTRL', timeout_milliseconds = 1000 }
```

When a leader is configured, additional bindings can require leader to be pressed first — they appear with `mods = 'LEADER'` or `'LEADER|CTRL'` etc. Treat any leader-prefixed binding as not conflicting with non-leader bindings of the same key.

## Override Mechanics

To free a combo so that what's inside WezTerm (tmux, Claude Code, shell, vim) can receive it, bind it to `DisableDefaultAssignment`:

```lua
{ key = 'p', mods = 'CMD|SHIFT', action = wezterm.action.DisableDefaultAssignment },
```

Alternatively, bind it to `SendKey { key = 'p', mods = 'CMD|SHIFT' }` to forward the encoded sequence explicitly. `SendKey` is needed only when WezTerm's default would be to consume the key and you want a specific sequence sent to the TTY.

## Known Swallow Traps

Combos WezTerm grabs by default that often surprise users wanting them inside an in-terminal program:

- **`Cmd+T`** — new WezTerm tab. Will never reach tmux/Claude Code unless `DisableDefaultAssignment`'d.
- **`Cmd+W`** — close WezTerm tab. Same.
- **`Cmd+1..9`** — switch WezTerm tab. Same.
- **`Cmd+K`** — clear scrollback. Important: if user wants `Cmd+K` chords in Zed and Zed is open inside WezTerm somehow, no. (Not relevant for Zed which is its own GUI app — but worth noting.)
- **`Cmd+F`** — WezTerm search overlay. A vim user inside WezTerm pressing `Cmd+F` gets WezTerm's overlay, not vim's search.
- **`Ctrl+Shift+<letter>`** — many bindings in this region. If the user wants `Ctrl+Shift+P` (for instance) inside a TUI, WezTerm may eat it.

## Discovery Commands

- `wezterm show-keys` — dumps the effective key bindings, including overrides, for the running config. Run this if precise truth is needed; ask the user to run and paste output, or run via the user's shell if available.
- `wezterm --config-file <path> show-keys` — verify a specific config file's effective bindings.

## Known Unknowns

- Default key bindings change non-trivially between WezTerm releases. The tables above reflect typical defaults but not a single fixed version. Always read the user's config first; for defaults, prefer `wezterm show-keys` output to the table above.
