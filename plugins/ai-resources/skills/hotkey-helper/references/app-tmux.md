# tmux (Terminal Multiplexer Layer)

tmux sits at layer 4 in the stack. When the focused app runs inside a tmux session (which includes Claude Code in Alex's typical workflow), tmux receives the encoded keystroke from the terminal emulator and may consume it before passing it to the pane's program.

tmux's binding model is **prefix-based**: most commands require pressing a prefix key first, then the command key. This isolates tmux's territory from app-level bindings cleanly — but rebinds without prefix (or rebinds of the prefix itself) shadow lower layers.

## Overview

Layer-4 multiplexer. Receives whatever WezTerm forwarded through the TTY. Decides whether each keystroke matches a binding in its prefix table or a no-prefix root table; otherwise passes through to the focused pane's program.

## Modifier Conventions

In `tmux.conf`:

- `C-x` — Ctrl+x
- `M-x` — Meta/Alt+x
- `S-x` — Shift+x (rarely used)
- Prefix is referenced as `prefix` in `bind` commands; the prefix itself is set with `set -g prefix C-b` (default) or e.g. `set -g prefix C-a`.

Binding entries look like:

```
bind c new-window         # prefix + c
bind -n M-Right next-window   # no-prefix (root table) binding
```

`-n` means "no prefix needed" (root table). Without `-n`, the binding is in the prefix table (requires prefix first).

## Default Bindings

Prefix: `Ctrl+B` (rebindable; many users change to `Ctrl+A`).

After pressing prefix:

### Windows

| Action | Key (after prefix) |
|---|---|
| New window | `c` |
| Next window | `n` |
| Previous window | `p` |
| Select window N | `0`–`9` |
| Rename window | `,` |
| Kill window | `&` |
| Last window | `l` (lowercase L) |
| Choose window | `w` |

### Panes

| Action | Key (after prefix) |
|---|---|
| Split horizontal (top/bottom) | `"` (quote) |
| Split vertical (left/right) | `%` |
| Navigate panes | arrow keys |
| Cycle panes | `o` |
| Show pane numbers | `q` |
| Resize pane | `Ctrl+arrow` (held after prefix) |
| Kill pane | `x` |
| Zoom pane | `z` |
| Swap panes | `{` / `}` |

### Sessions

| Action | Key (after prefix) |
|---|---|
| Detach | `d` |
| Choose session | `s` |
| Rename session | `$` |
| Next / previous session | `(` / `)` |

### Modes / Misc

| Action | Key (after prefix) |
|---|---|
| Command prompt | `:` |
| Copy mode | `[` |
| Paste buffer | `]` |
| Help (list bindings) | `?` |
| Refresh client | `r` (often rebound to reload config) |

### Root table (no prefix)

By default, tmux ships with very few root-table bindings. Anything in the root table directly competes with the focused program inside the pane — be cautious.

## Customization Files

Load order:

| Layer | Path | Format |
|---|---|---|
| User | `~/.tmux.conf` | Plain text |
| User (XDG) | `~/.config/tmux/tmux.conf` | Plain text |
| Project | (rare; usually via `tmuxinator`/`tmuxp` profiles — separate tooling) | YAML/JSON |

tmux reads the first file it finds. Some users use a custom path with `tmux -f <path>` — check `~/.config/tmux/tmux.conf` and `~/.tmux.conf` and ask if neither exists.

### Finding bindings

Grep patterns:

```
^bind
^bind-key
^unbind
^unbind-key
^set -g prefix
set-option -g prefix
^set -g status-keys
^bind-key -T
^bind -T
```

`-T <table-name>` selects a key table other than the default prefix or root. `bind -T copy-mode-vi v send -X begin-selection` is a vim-style copy-mode binding, not a top-level binding.

### Detecting state

- **Prefix changed**: look for `set -g prefix C-a` or similar. If found, the table above shifts: every "prefix + X" combo uses the new prefix.
- **Default binding disabled**: `unbind <key>` removes it.
- **Default binding replaced**: `bind <key> <new-command>`.
- **Root-table binding added**: `bind -n <combo> <command>` — these are the dangerous ones for layer-precedence analysis because they consume a combo unconditionally.

## Override Mechanics

To prevent tmux from swallowing a combo, in `tmux.conf`:

```
unbind -n <combo>     # remove a root-table binding
unbind <key>          # remove a prefix-table binding
```

For combos that tmux doesn't bind by default, no action is needed — tmux passes them through to the pane's program. But if a TUI program inside tmux is expecting a combo that tmux *does* bind (rare for prefix-protected combos, common for root-table rebinds), `unbind -n` is the fix.

## Known Swallow Traps

- **Root-table bindings (`bind -n …`)** — anything bound here is consumed before the pane's program sees it. A user who has `bind -n M-h previous-window` will find `Alt+H` doesn't reach vim or Claude Code.
- **Custom prefix `C-a`** — interferes with Cocoa text-editing's `Ctrl+A` (beginning of line) in any text input inside the terminal pane. Not a default but extremely common.
- **Copy-mode `-T copy-mode` / `-T copy-mode-vi`** — bindings only apply when in copy mode; not a precedence issue but easy to misread when grepping.

## Discovery Commands

- `tmux list-keys` — lists every effective binding for the running tmux server. Authoritative.
- `tmux list-keys -T prefix` — just the prefix table.
- `tmux list-keys -T root` — just the root table (the precedence-relevant one for non-prefix conflicts).
- `tmux show-options -g prefix` — current prefix.

When precise truth matters, ask the user to run `tmux list-keys -T root` and paste output. The prefix-table contents are far less risky to assume from defaults.

## Known Unknowns

- Whether the user runs tmux at all in their current session. Many of Alex's flows pass through tmux, but not all; confirm before assuming.
- Plugins (TPM, tmux-resurrect, tmux-continuum, vim-tmux-navigator) often add bindings — sometimes root-table. If the user mentions plugins, treat `tmux list-keys` as the only authoritative source.
