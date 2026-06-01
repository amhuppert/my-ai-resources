# Claude Code (Focused App, TUI)

Claude Code runs as a TUI inside a terminal. For Alex this typically means: physical key → WezTerm → tmux → Claude Code. Every layer above can swallow a keystroke. The bindable surface inside Claude Code is therefore narrow and constrained to keystrokes that survive the upstream layers as identifiable TTY sequences.

## Overview

Layer-5 focused app, but unlike Zed or Chrome it runs in a terminal pane. The "what you can bind" set is the intersection of:

- What Claude Code's keystroke handler recognizes.
- What the terminal emulator and multiplexer above it forward unmolested.

If the user is binding inside Claude Code, the analysis must include WezTerm and tmux (when present) as layers above. See `app-wezterm.md` and `app-tmux.md`.

## Modifier Conventions

In `~/.claude/keybindings.json` (load `keybindings-help` skill for syntax details):

- Standard modifier names appear as documented in that skill. This reference focuses on conflict surface, not syntax.

For interactive TUI defaults, Claude Code recognizes a small set of control keys and meta-keyed combos.

## Default Bindings

Authoritative bindings depend on the running version. Roughly:

### Input control

| Action | Combo |
|---|---|
| Submit input | `Enter` |
| Multiline input | `Shift+Enter` (when the terminal sends it; not all terminals do) or `\` then `Enter` |
| Cancel input / interrupt | `Esc` |
| Interrupt response in progress | `Esc` |
| New line within multi-line input | `Ctrl+J` (in some configurations) |
| Clear screen | `Ctrl+L` |
| Standard readline-style: beginning/end of line | `Ctrl+A` / `Ctrl+E` |
| Standard readline-style: kill line / word | `Ctrl+U` / `Ctrl+W` |
| History back / forward | `Up` / `Down` |
| Reverse search | `Ctrl+R` |
| EOF / exit | `Ctrl+D` |
| SIGINT | `Ctrl+C` |

### Mode switching

| Action | Combo |
|---|---|
| Cycle modes (e.g., plan / auto-accept / manual) | `Tab` (varies by version) |
| Shift-Tab cycle | `Shift+Tab` (varies) |

### Help / Commands

| Action | Combo |
|---|---|
| Slash commands | `/<name>` typed |
| Help | `/help` |

This table is a sketch — Claude Code's binding surface changes between versions. For precise truth, use the `keybindings-help` skill or inspect `~/.claude/keybindings.json`.

## Customization Files

| Layer | Path | Format |
|---|---|---|
| User | `~/.claude/keybindings.json` | JSON |

The `keybindings-help` skill in this plugin is the canonical reference for the file's schema, supported keys, and chord syntax. **Load `keybindings-help` (not this file) when the user is editing `~/.claude/keybindings.json`** — this file's job is to inform conflict analysis, not teach the config syntax.

## Override Mechanics

Claude Code bindings can only fire if the keystroke reaches Claude Code. That means:

1. **WezTerm must not consume it.** Many `Cmd+<...>` combos are claimed by WezTerm defaults (`Cmd+T`, `Cmd+W`, `Cmd+K`, `Cmd+F`, etc.). For Claude Code to receive `Cmd+<X>`, WezTerm must either pass it through (`SendKey` or no default binding) or be told to disable the default.
2. **tmux must not consume it.** Root-table tmux bindings (`bind -n …`) intercept before Claude Code.
3. **Standard terminal control keys are off-limits.** `Ctrl+C` (SIGINT), `Ctrl+Z` (SIGTSTP), `Ctrl+D` (EOF), `Ctrl+S` / `Ctrl+Q` (flow control — XON/XOFF, often disabled but still risky) cannot be repurposed without breaking core shell behavior.
4. **What the terminal can even transmit.** Many "modifier + letter" combinations cannot be expressed as unique TTY escape sequences. `Ctrl+<letter>` maps to a single byte (so `Ctrl+I` ≡ `Tab`, `Ctrl+M` ≡ `Enter`, `Ctrl+[` ≡ `Esc`). `Cmd+<letter>` has no native terminal sequence — terminals either eat the combo, send a vendor-specific escape, or pass it through with a custom encoding (WezTerm's `SendKey` can be configured for this).

## Known Swallow Traps

- **`Ctrl+I` is `Tab`** — and vice versa. You cannot bind them differently at the TUI level; the terminal sends the same byte.
- **`Ctrl+M` is `Enter`**. Same issue.
- **`Ctrl+[` is `Esc`**. Same issue. Also, in vim, `Esc` is a critical mode switch — rebinding inside Claude Code is fine, but be aware of nested-vim-inside-Claude-Code-inside-WezTerm chains.
- **`Cmd+<X>`** — likely intercepted by WezTerm. Confirm `wezterm show-keys` output before promising the combo can reach Claude Code.
- **`Alt+<X>` / `Opt+<X>`** — WezTerm and shell handling of Opt vary. WezTerm on macOS has settings for `send_composed_key_when_left_alt_is_pressed` and similar — when `true`, Opt+letter sends the macOS special character (`Opt+E` → `´`) instead of `Alt+E`. Confirm config.
- **`Esc`-prefixed combos** (Meta-style) — work in many terminals because Opt or Alt sends `Esc <letter>` as a two-byte sequence. But if the user's WezTerm config translates Opt to a special character, the Meta encoding breaks.
- **`Shift+Enter`** — not transmitted as a distinct key in most terminals by default. WezTerm can be configured (`send_key`) to send a distinct sequence (e.g., CSI-u encoding), and Claude Code can recognize it. Confirm both ends.

## Conflict Analysis Special Notes

When the focused app is Claude Code:

1. Always include WezTerm + tmux in the layer stack.
2. Treat any `Cmd+<X>` proposal as **OVERRIDE-REQUIRED at minimum** unless the user has already disabled the relevant WezTerm default.
3. Treat `Ctrl+<letter>` proposals carefully — the byte-level collisions above are not negotiable.
4. Treat `Opt+<letter>` as suspect — verify WezTerm's Opt handling.
5. Bindings that survive only when launched in a specific shell or under a specific terminal config are not portable — flag this for the user.

## Discovery Commands

- The `keybindings-help` skill is the authoritative reference for what Claude Code supports. Defer to it for binding syntax and version-specific behavior.
- For terminal-level conflicts: `wezterm show-keys` and `tmux list-keys -T root` give ground truth for the layers above.

## Known Unknowns

- Claude Code's exact default keybindings change between releases. The table above is illustrative; for precise current defaults, defer to `keybindings-help`.
- Whether `Shift+Enter` is reachable depends on the user's terminal config — confirm before recommending it.
- CSI-u encoding support (which expands the reachable combo space dramatically by letting terminals send distinct sequences for `Ctrl+Shift+<letter>`, `Shift+Enter`, etc.) varies by terminal and config. WezTerm supports it via `enable_csi_u_key_encoding`; not assumed on by default.
