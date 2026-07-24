# Safe-Combo Heuristics

Patterns for generating recommendation candidates that tend to be conflict-light and ergonomically reasonable on macOS. Load in recommend mode (or when offering alternatives in check mode).

These are starting points, not verdicts. Every candidate must still pass the layer-stack check in `decision-protocol.md`.

## The Modifier Real Estate (macOS)

| Modifier set | Convention claim | Free-ness |
|---|---|---|
| `Cmd+<letter>` | Strongly claimed by app menus (File/Edit/View/Window). | Usually taken. |
| `Cmd+Shift+<letter>` | App-specific extras (`Cmd+Shift+T`, `Cmd+Shift+P`). | ~Half taken in most apps. |
| `Cmd+Opt+<letter>` | Power-user / dev tools (`Cmd+Opt+I` in browsers, view modes in IDEs). | Mixed. |
| `Cmd+Ctrl+<letter>` | Sparsely used. | **Largely free**. Best modifier set for app-installed power user bindings. |
| `Cmd+Ctrl+Shift+<letter>` | Almost never claimed by app defaults. | Very free, but ergonomically expensive — four modifiers + a letter. |
| `Cmd+Opt+Shift+<letter>` | Some IDE refactors live here (e.g., move file). | Mostly free. Ergonomically expensive. |
| `Ctrl+<letter>` | macOS-system Emacs-style text editing (`Ctrl+A/E/N/P/F/B/D/K/H/W/Y/T`) — **applies in every text field system-wide via Cocoa key bindings**. | Many letters are taken at the OS text-editing layer. |
| `Ctrl+Shift+<letter>` | Heavily used by WezTerm defaults on macOS (matches Linux convention). | Watch out for terminal conflicts. |
| `Opt+<letter>` | Special character entry (`Opt+E` → ´, etc.). Rebinding any of these breaks character entry. | **Avoid for app bindings.** |
| `Fn+<letter>` | macOS function keys, dictation, emoji picker. | Avoid except for the dedicated `Fn` features. |

The strongest single recommendation: when binding inside a GUI app on macOS, **`Cmd+Ctrl+<letter>` is usually the lowest-conflict modifier set**.

## The Letter Real Estate (Cmd+letter App-Menu Defaults)

Single letters commonly claimed by `Cmd+<letter>` across most macOS apps. Treat as "default-claimed" unless you've verified the focused app doesn't use it.

| Letter | Common claim |
|---|---|
| A | Select All |
| C | Copy |
| F | Find |
| H | Hide app |
| M | Minimize |
| N | New (window/doc) |
| O | Open |
| P | Print |
| Q | Quit |
| R | Reload/Run |
| S | Save |
| T | New Tab |
| V | Paste |
| W | Close Window/Tab |
| X | Cut |
| Z | Undo |

Less universally claimed at `Cmd+<letter>` but app-specific:

- B, D, E, G, I, J, K, L, U, Y — varies a lot. Always check the focused app.

## Letters That Tend to Be Free Even at `Cmd+<letter>`

Across mainstream macOS apps, these are *more* often free at plain `Cmd+<letter>`:

- `Cmd+;` (semicolon) — rarely claimed.
- `Cmd+'` (apostrophe) — rarely claimed.
- `Cmd+/` — often "toggle comment" in IDEs but usually free in non-IDE apps.
- `Cmd+\` — sparse use.
- `Cmd+=` / `Cmd+-` — zoom in/out conventionally; reasonably reliable to leave alone.

For most app bindings, prefer **letter mnemonics paired with `Cmd+Ctrl+` or `Cmd+Opt+Shift+`** over chasing a free `Cmd+<letter>`.

## Chord-Friendly Apps

Some apps make chords a first-class convention. Use them when the focused app supports them — chords expand the bindable space dramatically.

- **Zed**: `cmd-k <letter>` is the discoverable chord prefix. `cmd-k cmd-s` opens the keymap. The full second-letter space under `cmd-k` is broadly free.
- **VS Code-style**: same convention.
- **Tmux**: prefix + letter *is* the chord — by design.

Anti-pattern: chord under a *plain* modifier like `Cmd+<letter>` where the first event is already a common app action — the chord won't register because the first event fires the default.

## Ergonomics

Pick combos where the modifier hand and the letter hand share the load. On a US ANSI Mac keyboard:

- **Left-hand modifiers**: hold `Cmd+Ctrl` with left thumb + pinky. Pair with right-hand letters (`H J K L`, `Y U I O P`, `N M`).
- **Right-hand modifiers**: hold `Cmd+Opt` with right thumb + pinky (right `Cmd` + right `Opt`). Pair with left-hand letters (`Q W E R T`, `A S D F G`, `Z X C V`).
- **Avoid**: same-hand modifier + letter requiring contortion (e.g., left `Cmd+Ctrl+Q` is fine; left `Cmd+Ctrl+Shift+Z` is not).

Reach cost rough order, cheap to expensive:

1. Single modifier + home-row letter (`Cmd+J`).
2. Two modifiers + home-row letter (`Cmd+Ctrl+J`).
3. Two modifiers + top/bottom-row letter (`Cmd+Ctrl+Y`).
4. Three modifiers + any letter (`Cmd+Ctrl+Shift+J`).
5. Four modifiers + any letter (`Cmd+Ctrl+Shift+Opt+J` — "hyper") — only if mnemonic value is overwhelming.

## Mnemonic Patterns

Order of mnemonic strength:

1. **Initial of action** (`P` for "panel"). Strongest.
2. **Initial of object acted on** (`F` for "find file").
3. **Adjacent-letter near a related binding** (if `Cmd+P` is file open, `Cmd+Shift+P` for command palette riffs on it).
4. **Position on keyboard** (`Cmd+1..9` for "switch to N").
5. **Letter shape** (`/` for divide/comment).

When mnemonic conflicts with conflict-freedom, conflict-freedom wins. A binding the user has to constantly fight against the OS for is worse than a binding with a weak mnemonic they have to learn.

## Anti-Patterns to Avoid in Candidates

- **`Cmd+Q`** — kills the app. Even if rebound, fat-finger risk is too high.
- **`Cmd+W`** — closes the window/tab. Same fat-finger risk.
- **`Cmd+H`** — hides the app system-wide; cannot be rebound in many apps.
- **`Cmd+Tab`** — App Switcher. Rebinding is theoretically possible via third-party tools; not free.
- **`Cmd+Space`** — Spotlight. Rebindable in System Settings but a major reflex break.
- **`Opt+<letter>`** — breaks special-character input.
- **`Ctrl+C` / `Ctrl+D` / `Ctrl+Z`** in terminal contexts — SIGINT / EOF / SIGTSTP; never rebind.
- **`Esc`** in terminal contexts — meta-key prefix in vim, cancel in Claude Code; avoid as a chord prefix.

## Recommendation Defaults for Alex's Stack

Given the default stack is WezTerm + tmux + Claude Code + Zed + Chrome:

- For **Zed** bindings: lean on `cmd-k <letter>` chords first, then `Cmd+Ctrl+<letter>` single-shot.
- For **Chrome** bindings (must be via extension): `Cmd+Ctrl+<letter>` is the safest region; Chrome's own defaults don't dip into it.
- For **WezTerm** bindings: `CMD|SHIFT|<letter>` matching WezTerm's own conventions, then `CMD|CTRL|<letter>`. Avoid `CTRL|SHIFT|<letter>` because that's where many WezTerm defaults sit on Linux/Windows and conflicts cause cross-platform muscle-memory friction.
- For **tmux** bindings: prefix + letter is the only safe region. Avoid binding to the prefix-less modifier combos (tmux can do it but the precedence-stack cost is high).
- For **Claude Code** bindings: the bindable surface is tiny. See `app-claude-code.md` before suggesting anything.
