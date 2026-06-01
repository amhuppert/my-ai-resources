# macOS (OS Layer)

Reserved-by-the-system bindings, the surface where the user can customize them, and the combos macOS grabs so aggressively that no app below can reach them. Always load this when running an analysis.

Covers macOS 13 Ventura through current. Where Apple changed defaults across versions, both are noted.

## Modifier Conventions

- Cmd: `⌘` / `Cmd` / sometimes called Super or Meta in cross-platform docs.
- Opt: `⌥` / `Option` / `Alt`.
- Ctrl: `⌃` / `Control`.
- Shift: `⇧` / `Shift`.
- Fn: function/globe key. Modern Macs route many shortcuts through Fn (dictation, emoji, etc.).

A note on `Cmd` vs `Ctrl`: macOS apps overwhelmingly use `Cmd` as the primary modifier (vs. `Ctrl` on Linux/Windows). `Ctrl+<letter>` on macOS is mostly reserved by the OS for Emacs-style text editing in any Cocoa text field.

## Reserved Default Bindings

Anything here will fire system action before any app sees it. Some are rebindable in System Settings → Keyboard → Keyboard Shortcuts; some aren't.

### Spotlight / Search

| Action | Combo | Rebindable? |
|---|---|---|
| Show Spotlight | `Cmd+Space` | Yes (Keyboard Shortcuts → Spotlight) |
| Show Finder search | `Cmd+Opt+Space` | Yes |

### App Switching / Mission Control

| Action | Combo | Rebindable? |
|---|---|---|
| App Switcher | `Cmd+Tab` (forward), `Cmd+Shift+Tab` (back) | No (immovable) |
| Cycle windows of front app | `Cmd+\`` (backtick) | No (immovable) |
| Mission Control | `Ctrl+Up` (or F3) | Yes (Mission Control panel) |
| Application windows | `Ctrl+Down` | Yes |
| Move left a space | `Ctrl+Left` | Yes |
| Move right a space | `Ctrl+Right` | Yes |
| Switch to space N | `Ctrl+<N>` | Yes (off by default) |
| Show Desktop | `F11` / `Fn+H` (newer) | Yes |
| Show Launchpad | `F4` / no default combo on newer Macs | Yes |

### Screenshot / Screen Recording

| Action | Combo | Rebindable? |
|---|---|---|
| Capture entire screen | `Cmd+Shift+3` | Yes (Screenshots panel) |
| Capture selection | `Cmd+Shift+4` | Yes |
| Screenshot UI | `Cmd+Shift+5` | Yes |
| Capture Touch Bar | `Cmd+Shift+6` | Yes |
| Copy selection to clipboard | add `Ctrl` to above | Yes |

### Notification / Control Center / Quick Note

| Action | Combo | Rebindable? |
|---|---|---|
| Notification Center | `Fn+N` (or `Fn+Q` historically) | Yes |
| Control Center | `Fn+C` | Yes |
| Quick Note | `Fn+Q` (newer macOS) | Yes |
| Emoji & Symbols picker | `Fn+E` or `Ctrl+Cmd+Space` | Yes |
| Start/stop Dictation | `Fn+Fn` (double-tap) by default | Yes |

### Accessibility (VoiceOver, Zoom, etc.)

| Action | Combo | Rebindable? |
|---|---|---|
| Toggle VoiceOver | `Cmd+F5` or `Fn+Cmd+F5` | Yes (Accessibility Shortcuts panel) |
| VoiceOver modifier ("VO") | `Ctrl+Opt` (default) | Yes (in VoiceOver Utility) |
| Show Accessibility Shortcuts | `Opt+Cmd+F5` | Yes |
| Toggle Zoom | `Opt+Cmd+8` | Yes |
| Zoom in / out | `Opt+Cmd+=` / `Opt+Cmd+-` | Yes |
| Invert colors | `Ctrl+Opt+Cmd+8` | Yes |

VoiceOver, if enabled, captures `Ctrl+Opt+<anything>`. Even if the user doesn't run VoiceOver, accidentally-enabled VoiceOver is a common "my binding doesn't work" report — flag this if the user proposes `Ctrl+Opt+<letter>`.

### Session / Lock / Power

| Action | Combo | Rebindable? |
|---|---|---|
| Lock screen | `Ctrl+Cmd+Q` | No (immovable) |
| Sleep | `Opt+Cmd+Eject` / `Opt+Cmd+Power` | No |
| Logout dialog | `Shift+Cmd+Q` | No |
| Logout immediately | `Shift+Opt+Cmd+Q` | No |
| Force Quit dialog | `Opt+Cmd+Esc` | No (immovable) |
| Quit app | `Cmd+Q` | No (immovable at OS level) |
| Hide app | `Cmd+H` | No (immovable) |
| Hide others | `Opt+Cmd+H` | No |

### System Cocoa Text Editing (any text field)

These fire in every Cocoa text input — including focused web inputs in Chrome. They cannot be globally disabled.

| Action | Combo |
|---|---|
| Beginning / end of line | `Cmd+Left` / `Cmd+Right` |
| Top / bottom of document | `Cmd+Up` / `Cmd+Down` |
| Word jump left/right | `Opt+Left` / `Opt+Right` |
| Delete word left | `Opt+Delete` |
| Delete to beginning of line | `Cmd+Delete` |
| Emacs-style: beginning/end of line | `Ctrl+A` / `Ctrl+E` |
| Emacs-style: next/previous line | `Ctrl+N` / `Ctrl+P` |
| Emacs-style: forward/back char | `Ctrl+F` / `Ctrl+B` |
| Emacs-style: delete char forward | `Ctrl+D` |
| Emacs-style: kill to end of line | `Ctrl+K` |
| Emacs-style: transpose chars | `Ctrl+T` |

**Implication for `Ctrl+<letter>` bindings**: anything in `A E N P F B D K T H W Y O L V` is intercepted by Cocoa text-editing when a text field has focus. Apps that use `Ctrl+<letter>` for their own functions (Zed in vim mode, Chrome's `Ctrl+Tab`) work because the focused widget isn't a Cocoa text field, or the app overrides at a higher precedence. For new bindings, assume `Ctrl+<letter>` is taken at the OS layer.

## Standard App Menu Conventions (Inherited Defaults)

Most macOS apps inherit a standard menu structure via AppKit; these defaults appear unless the app explicitly removes them.

| Menu | Standard combos |
|---|---|
| Application | `Cmd+,` (Settings), `Cmd+H` (Hide), `Cmd+Opt+H` (Hide Others), `Cmd+Q` (Quit) |
| File | `Cmd+N` (New), `Cmd+O` (Open), `Cmd+S` (Save), `Cmd+Shift+S` (Save As), `Cmd+W` (Close), `Cmd+P` (Print) |
| Edit | `Cmd+Z` (Undo), `Cmd+Shift+Z` (Redo), `Cmd+X/C/V/A` (Cut/Copy/Paste/Select All), `Cmd+F` (Find), `Cmd+G` (Find Next) |
| Window | `Cmd+M` (Minimize), `Cmd+Opt+M` (Minimize All) |

Most apps in Alex's stack inherit these. Treat any combo here as taken-by-default in any GUI app unless verified otherwise.

## Customization Files

macOS keyboard shortcuts are not stored in a human-readable text file in a meaningful way. The relevant defaults plist is at:

```
~/Library/Preferences/com.apple.symbolichotkeys.plist
```

This file is binary and uses numeric symbolic hotkey IDs. It's not practical to parse non-interactively.

**Operationally**: ask the user "have you customized System Settings → Keyboard → Keyboard Shortcuts?" If yes, walk specific categories.

App-level keyboard shortcuts via **System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts** are stored per-app under `NSUserKeyEquivalents` in the app's preferences. These rebind menu items system-wide for that app (e.g., remap `Cmd+,` to something else in a specific app). Mostly user-facing — ask if relevant.

## Cocoa System Key Bindings (DefaultKeyBinding.dict)

A user can install a `~/Library/KeyBindings/DefaultKeyBinding.dict` to globally override Cocoa text-editing behavior in every Cocoa text field. Rare but powerful. If the user mentions custom text-editing combos, ask whether this file exists.

## Known Swallow Traps

- **`Cmd+Tab` / `Cmd+Shift+Tab`** — App Switcher. Cannot be disabled by normal users.
- **`Cmd+H`** — Hides the app. Cannot be reliably overridden by the app itself.
- **`Cmd+Space`** — Spotlight. Rebindable, but doing so breaks a reflex for Mac users.
- **`Cmd+Opt+Esc`** — Force Quit. Immovable.
- **`Ctrl+Opt+<anything>`** — VoiceOver modifier if VoiceOver is on. Even if off, the user may have accidentally toggled it.
- **`Fn+<letter>`** — Fn-based system functions on newer Macs (dictation, emoji, Quick Note).
- **`Opt+<letter>`** — special character entry. Rebinding breaks character input for that letter.

## Override Mechanics

To free a macOS-layer binding:

1. **System Settings → Keyboard → Keyboard Shortcuts** → find the category → uncheck the row, or click the combo and assign a new one (or no combo).
2. Some bindings (`Cmd+Tab`, `Cmd+H`, `Cmd+Q`, `Cmd+Opt+Esc`, `Ctrl+Cmd+Q`) don't appear in this panel at all — they're not rebindable through normal means.
3. Third-party tools (Karabiner-Elements, BetterTouchTool, Hammerspoon) can remap at the HID/event-tap layer. **Alex's setup currently does not run these** — confirm before assuming they're available.

## Discovery (Asking the User)

When you need to check macOS user customizations, ask in this order:

1. "Have you changed any system shortcuts in System Settings → Keyboard → Keyboard Shortcuts?" (yes/no)
2. If yes: "Anything in [the category relevant to the proposed combo's modifiers]?"
3. "Do you have any `Cmd+letter` overrides for specific app menus set up under App Shortcuts?"
4. "Do you run any HID-layer tools — Karabiner, BetterTouchTool, Hammerspoon?"

## Known Unknowns

- Exact reservation status of newer Fn-key bindings varies by macOS version and Mac hardware (Touch Bar vs. function row vs. globe key). When the proposed combo involves Fn, ask the user's macOS version and Mac model if it matters.
