# Google Chrome (Focused App, macOS)

Chrome's built-in shortcuts are stable and well-documented. Two important constraints:

1. Chrome's **built-in** shortcuts cannot be rebound by the user without a third-party extension.
2. Extensions can claim their own combos through `chrome://extensions/shortcuts` — these are not script-readable and must be confirmed with the user.

## Overview

Layer-5 focused app. Runs on macOS as a Cocoa app, so it inherits the system Cocoa text-editing layer in focused web inputs. Inside Chrome, page-side keyboard handlers (web apps, embedded `<iframe>`s) can also consume keystrokes before Chrome's built-in shortcut fires — but only for keys Chrome doesn't reserve.

## Modifier Conventions

Standard macOS modifiers. Chrome documentation uses `⌘`, `⌥`, `⌃`, `⇧`.

## Default Bindings on macOS

### Tabs / Windows

| Action | Combo |
|---|---|
| New tab | `Cmd+T` |
| Close tab | `Cmd+W` |
| Reopen closed tab | `Cmd+Shift+T` |
| New window | `Cmd+N` |
| New incognito window | `Cmd+Shift+N` |
| Close window | `Cmd+Shift+W` |
| Quit Chrome | `Cmd+Q` |
| Next tab | `Cmd+Opt+Right` or `Ctrl+Tab` |
| Previous tab | `Cmd+Opt+Left` or `Ctrl+Shift+Tab` |
| Select tab N (1–8) | `Cmd+1` … `Cmd+8` |
| Select last tab | `Cmd+9` |
| Move tab to new window | (no default) |
| Pin tab | (no default) |

### Navigation

| Action | Combo |
|---|---|
| Back | `Cmd+[` or `Cmd+Left` |
| Forward | `Cmd+]` or `Cmd+Right` |
| Reload | `Cmd+R` |
| Hard reload (ignore cache) | `Cmd+Shift+R` |
| Stop loading | `Esc` |
| Go to address bar | `Cmd+L` |
| Search the web from address bar | `Cmd+L`, then type |
| Home page | `Cmd+Shift+H` |

### Search / Find

| Action | Combo |
|---|---|
| Find in page | `Cmd+F` |
| Find next | `Cmd+G` |
| Find previous | `Cmd+Shift+G` |
| Use selection for find | `Cmd+E` |

### Bookmarks / History / Downloads

| Action | Combo |
|---|---|
| Bookmark page | `Cmd+D` |
| Bookmark all tabs | `Cmd+Shift+D` |
| Toggle bookmarks bar | `Cmd+Shift+B` |
| Bookmark manager | `Cmd+Opt+B` |
| History | `Cmd+Y` |
| Downloads | `Cmd+Shift+J` |
| Clear browsing data | `Cmd+Shift+Delete` |

### Developer Tools

| Action | Combo |
|---|---|
| Toggle DevTools | `Cmd+Opt+I` |
| Open DevTools Console | `Cmd+Opt+J` |
| Inspect element | `Cmd+Opt+C` |
| View source | `Cmd+Opt+U` |

### Zoom / Display

| Action | Combo |
|---|---|
| Zoom in | `Cmd+=` (or `Cmd+Plus`) |
| Zoom out | `Cmd+-` |
| Reset zoom | `Cmd+0` |
| Full screen | `Cmd+Ctrl+F` |
| Toggle bookmarks bar | `Cmd+Shift+B` |

### Misc

| Action | Combo |
|---|---|
| Print | `Cmd+P` |
| Save page | `Cmd+S` |
| Settings | `Cmd+,` |
| Email page link | `Cmd+Shift+I` |
| Show/hide reading list | (no default) |

## Customization Files

Chrome **does not** support rebinding built-in shortcuts through any user-visible config file. Two indirect surfaces exist:

1. **Extension shortcuts** — managed at `chrome://extensions/shortcuts`. Each extension can claim global or in-Chrome shortcuts. **Not script-readable.** Must be confirmed with the user when relevant.
2. **Third-party rebinding extensions** (e.g., Shortkeys, Vimium) — these install a content script that intercepts keystrokes on web pages. They can rebind page-level interactions but not Chrome's own menu items.

If the user reports a binding "isn't working in Chrome" and the combo doesn't match a built-in, suspect an extension. Ask: "Do you have Vimium, Shortkeys, or any other shortcut extension installed?"

## Override Mechanics

- **Built-in shortcuts**: not overridable.
- **Extension shortcuts**: user opens `chrome://extensions/shortcuts`, clicks the pencil next to the extension, and assigns a combo. Some extensions support "Global" scope (works even when Chrome isn't focused — equivalent to a layer-1 grab from the rest of the system's perspective).
- **Page content**: web apps can call `event.preventDefault()` to consume a keystroke before Chrome's default reacts — but only for keys Chrome doesn't reserve. Reserved keys (`Cmd+T`, `Cmd+W`, `Cmd+Q`, `Cmd+L`, etc.) fire Chrome's action regardless.

## Known Swallow Traps

- **`Cmd+W`** — closes the tab. No web app or extension can prevent it.
- **`Cmd+Q`** — quits Chrome. Same.
- **`Cmd+T`, `Cmd+N`, `Cmd+L`** — Chrome reserves; web pages cannot intercept.
- **`Cmd+R`, `Cmd+Shift+R`** — Chrome reload; reserved.
- **Single-key shortcuts on Google web properties** (Gmail's `j`, `k`, `e`, etc.) — these are page-level, only fire when focus is in the page (not in an input), and depend on user account settings.
- **`Cmd+,`** — Chrome Settings. Reserved.

## Discovery Commands / UI Paths

- `chrome://extensions/shortcuts` — extension-claimed shortcuts. Ask the user to open this and list any shortcuts they've set.
- `chrome://settings/` → search "keyboard" — surfaces a small set of accessibility-related options; not a key-rebinding panel.
- Chrome's full shortcut reference: <https://support.google.com/chrome/answer/157179>.

## Known Unknowns

- Whether the user has shortcut-rebinding extensions like Vimium installed (changes the analysis dramatically — Vimium claims most single-letter keys when focus is on the page).
- Whether they're using Chrome profiles with different extension sets — extension shortcuts are per-profile.
