# Conflict Model

The mental model behind layer precedence, override mechanics, and severity assignment. Load when you need to reason about *why* a binding is being swallowed or whether a higher-priority layer can be disabled.

## Key Travel Path (macOS)

A physical keypress travels through this pipeline. Each station can consume the event or pass it through.

```
Key  →  HID stack
     →  macOS event tap (system + accessibility services)
     →  Active window's app (Cocoa key equivalents / responder chain)
     →  App's text/edit handlers (Cocoa key bindings)
     →  Inside a terminal app: TTY/PTY → shell → child program (tmux → Claude Code)
```

The first station to "claim" the event ends the journey. This is why **OS-level grabs are unrecoverable from inside an app**: by the time WezTerm could see `Cmd+Space`, Spotlight already consumed it.

## Layer Precedence (macOS)

Higher = closer to the keypress, sees the event first.

1. **macOS reserved** — global event taps installed by the system or core services (WindowServer, Spotlight, Mission Control, Accessibility shortcuts, screenshot tools, dictation).
2. **macOS user-configured shortcuts** — System Settings → Keyboard → Keyboard Shortcuts. Includes app-launch shortcuts assigned via Services menu, plus Mission Control / Spotlight / Screenshot rebinds. These sit at the same priority as reserved.
3. **Terminal emulator** (WezTerm, in Alex's setup) — for keystrokes destined for a program *inside* a terminal, the emulator interprets them first against its key table. Only what survives is encoded as a TTY sequence and forwarded.
4. **Terminal multiplexer** (tmux) — receives the TTY-encoded sequence. Consumes prefix-table commands; passes everything else to the focused pane's program.
5. **Focused app default** — Cocoa app's built-in key equivalents (`Cmd+S`, `Cmd+W`, etc.) and responder-chain shortcuts. For TUIs (Claude Code), the app's own keystroke handler.
6. **Focused app override** — config files that replace or add to layer 5 (`wezterm.lua`, Zed `keymap.json`, `~/.claude/keybindings.json`, etc.). Logically the same precedence as default but evaluated later — overrides win over defaults within the app.

## Override Mechanics by Layer

| Layer | Can the user disable a binding on this layer? | How |
|---|---|---|
| 1. macOS reserved (Spotlight, app switcher, Mission Control, screenshot, accessibility) | Yes for *most* — System Settings → Keyboard → Keyboard Shortcuts → uncheck or rebind. A handful are immovable. | "Immovables" include `Cmd+Tab` (App Switcher core), `Cmd+Q` (system quit), some Accessibility shortcuts. Spotlight (`Cmd+Space`) is rebindable. Mission Control / Spaces are rebindable. |
| 2. macOS user shortcuts | Yes, by definition (the user set them). | Same panel; uncheck the row. |
| 3. WezTerm | Yes — `keys = { ... }` in `wezterm.lua`. To free a default, bind it to `action = wezterm.action.DisableDefaultAssignment` or rebind to something inert. | See `app-wezterm.md`. |
| 4. tmux | Yes — `unbind` / `bind` in `tmux.conf`. To stop tmux from consuming the prefix-chained combo, `unbind <key>` after `unbind-key`. | See `app-tmux.md`. |
| 5. App default | Almost always, via the app's own keymap config. | Per-app reference. |
| 6. App override | Already user-controlled. | Edit the file. |

## What Counts as "Swallowed"

A key event is **swallowed** when the layer that consumed it does not forward it to lower layers. Consequences:

- A binding on a lower layer never fires.
- The user sees "the binding doesn't work" with no error.
- The fix is always at the swallowing layer, not at the binding's layer.

Detecting swallow direction:

- If the combo triggers a *visible system action* (Spotlight opens, app switcher appears) — layer 1 or 2.
- If the combo triggers *nothing visible* but the focused-app binding doesn't fire — likely layer 3 or 4 consuming silently (WezTerm's `DisableDefaultAssignment` is silent; tmux can also consume into nothing if rebound).
- If the focused app's *default* action fires instead of the user's override — layer 5 wins because the override didn't load (wrong context, wrong syntax) rather than swallow.

## Severity Assignment Rules

Apply these in order; the first matching row sets the severity for the *combo as a whole*:

1. **Hit on layer 1 AND the binding is one of the immovables** → **BLOCKING**.
2. **Hit on layer 1 or 2 AND focused app is below it in the stack** → **OVERRIDE-REQUIRED** (user can rebind layer 1/2 in System Settings, then proceed).
3. **Hit on layer 3 (terminal) when focused app is in-terminal (tmux/Claude Code)** → **OVERRIDE-REQUIRED** (rebind in `wezterm.lua`).
4. **Hit on layer 4 (tmux) when focused app is in-tmux** → **OVERRIDE-REQUIRED** (rebind in `tmux.conf`).
5. **Hit on focused app default only (layer 5)** → **SOFT**.
6. **Hit on a layer outside the named focus context but in the broader stack** (e.g., tmux conflict when focused app is Zed) → **LATENT** — warn but don't block.
7. **No hits** → none (verdict SAFE).

Worst severity across all hits wins the verdict:

- Any BLOCKING → verdict **UNSAFE**.
- No BLOCKING, any OVERRIDE-REQUIRED → verdict **USABLE-WITH-OVERRIDE**.
- Only SOFT and/or LATENT → verdict **SAFE** (with notes).

## Modifier Encoding Notes

When comparing a proposed combo to an app's binding table, normalize first:

- macOS `Cmd` ≡ `cmd` ≡ `super` ≡ `meta` (some apps spell it differently).
- `Opt` ≡ `Alt` ≡ `Option`.
- WezTerm uses `CMD|SHIFT` style; Zed uses kebab-case `cmd-shift-p`; tmux uses uppercase `C-`/`M-` prefixes with the leader concept.
- Case in the letter is irrelevant for modifier combos; `Cmd+P` ≡ `Cmd+p`. **But** `Cmd+Shift+P` ≠ `Cmd+P` — Shift is part of the combo.
- Sequences (chords) are different: Zed's `cmd-k cmd-t` is two events; only the first event needs precedence-stack analysis, but the second event must also be checked for terminal-layer interception when in scope.

## Why "Latent" Matters

Bindings live longer than the moment they're chosen. A combo that's safe today against `Zed + Chrome` may become unreachable when the same user wants to use it inside Claude Code tomorrow. Surfacing latent conflicts in the verdict — even one-liners — saves a future rebind. Don't drop them.
