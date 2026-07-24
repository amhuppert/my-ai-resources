# Decision Protocol

Step-by-step for both modes. Load when running an actual analysis — this file is the operational checklist; `SKILL.md` is the high-level spine.

## Check Mode

Input: a specific combo + (ideally) focused app + stack.

### Step 1 — Context gate

Ask the user only for what's missing:

- OS (must be macOS for v1 — otherwise stop and say so).
- Focused app for this binding.
- Other apps in the broader stack (for latent-conflict detection).
- Have they customized System Settings → Keyboard → Keyboard Shortcuts? Y/N is enough; details only if Y.

Default stack to confirm with Alex: WezTerm + tmux + Claude Code + Zed + Chrome. Don't assume — ask.

### Step 2 — Build the layer list

From SKILL.md's layer stack, pick the layers relevant to the focused app:

- **Always**: macOS reserved + macOS user shortcuts.
- **If focused app is in-terminal** (Claude Code, tmux, anything CLI): + WezTerm + tmux.
- **If focused app is tmux**: + WezTerm (tmux itself runs under WezTerm).
- **If focused app is WezTerm itself** (binding lives in `wezterm.lua`): just WezTerm + macOS layers.
- **Focused app default + override**: always.

Skip layers that aren't in the user's stack, but record them as "out of scope" for the output.

### Step 3 — Load references

For each layer with a `references/app-*.md`, load it now. Always load `references/os-macos.md`.

### Step 4 — Read live config

For every layer that supports user/project overrides, read the actual config file:

| Layer | Read | Notes |
|---|---|---|
| macOS user | (ask user) | Not script-readable in a sane form. |
| WezTerm | `~/.wezterm.lua` → `~/.config/wezterm/wezterm.lua` → any `*.lua` they `require()` | Use Glob then Read; grep for `keys =`, `key =`, `mods =`, `leader =`. |
| tmux | `~/.tmux.conf` → `~/.config/tmux/tmux.conf` | Grep for `bind`, `bind-key`, `unbind`, `set -g prefix`. |
| Zed user | `~/.config/zed/keymap.json` | JSON array of context objects. |
| Zed project | `<repo-root>/.zed/keymap.json` | Only if there's a project root in scope. |
| Claude Code | `~/.claude/keybindings.json` | May not exist. |
| Chrome | not file-readable; extension shortcuts at `chrome://extensions/shortcuts` (must ask) | |

If a file doesn't exist, record "no override file found" — that's different from "no conflict."

### Step 5 — Score each layer

For each in-scope layer, mark:

- **Hit / no hit** against the proposed combo (after modifier normalization — see `conflict-model.md`).
- If hit, **what action** the binding triggers (so the verdict can name it).
- **Source**: "default" or `<file>:<line>` for overrides.
- **Severity** per the rules in `conflict-model.md`.

### Step 6 — Verdict

Apply worst-severity-wins from `conflict-model.md`:

- Any BLOCKING → **UNSAFE**.
- Any OVERRIDE-REQUIRED (no BLOCKING) → **USABLE-WITH-OVERRIDE**.
- Only SOFT and/or LATENT → **SAFE** (with notes).
- No hits at all → **SAFE**.

### Step 7 — Render output

Use the format in `SKILL.md`. Mandatory elements:

- Every in-scope layer listed (even with `—` for no hit) so the user can see what was checked.
- For each hit, name the action being shadowed.
- Verdict on one line, reasoning on the next.
- A concrete next action ("bind it", "first rebind X in System Settings", "pick another").
- For non-SAFE verdicts: 2–3 alternatives, **each also analyzed** through the same layers (cheaper than re-running mode 2, just check the relevant layers).

If a layer was skipped due to missing user info (typically macOS user shortcuts), say so in the verdict line — don't paper over it.

## Recommend Mode

Input: a description of the action + focused app + stack.

### Step 1 — Context gate

Same as check mode plus extract a mnemonic from the action description (e.g., "toggle project panel" → P; "open file finder" → O/F; "send to AI" → A/I/Enter).

### Step 2 — Candidate generation

Generate 4–6 combos that respect the focused app's conventions. Pull from `references/safe-combos.md` for general ergonomic patterns and from the focused app's reference for its dominant modifier set.

Guidelines per focused app:

- **Zed**: prefer `cmd-k <letter>` chords (Zed's discoverable convention) and `cmd-alt-<letter>` for single-shot. Avoid plain `cmd-<letter>` unless intentionally replacing a default.
- **WezTerm**: `CMD|SHIFT|<letter>` is the dominant style on macOS. `CTRL|SHIFT|<letter>` works too but collides with tmux territory.
- **tmux**: prefix + single letter is the convention. The leader (default `C-b`) prefix already isolates from layer 5.
- **Claude Code**: very constrained — only what the TUI's keystroke handler intercepts is bindable, and the keystroke must first survive WezTerm + tmux. See `app-claude-code.md`.
- **Chrome**: built-in bindings aren't user-rebindable without an extension; recommend extension-installable combos in regions Chrome doesn't claim. See `app-chrome.md`.

### Step 3 — Vet each candidate

Run each candidate through check mode steps 2–6. Drop UNSAFE outright. Mark USABLE-WITH-OVERRIDE separately.

### Step 4 — Rank

Sort by, in priority:

1. SAFE > USABLE-WITH-OVERRIDE.
2. Fewer LATENT hits.
3. Closer mnemonic fit to the action.
4. Ergonomics per `references/safe-combos.md` (single-hand reach, no awkward stretches).

### Step 5 — Render

Top 2–3 candidates only. For each, show the layer analysis stack from check mode plus a one-line rationale ("safe across stack; P mnemonic; same row as Cmd").

## Questions to Ask the User (Standard Battery)

Don't ask all of these every time — only what's missing for the current request.

- "What OS — confirming macOS?"
- "Which app will own this binding (the focused app)?"
- "What else do you typically have running — WezTerm, tmux, Zed, Chrome, Claude Code, anything else?"
- "Have you customized System Settings → Keyboard → Keyboard Shortcuts? If yes, anything in the area of `<modifier set>` that might overlap?"
- "Is this binding meant to fire inside a terminal (under WezTerm/tmux/Claude Code) or in a GUI app?"
- For Zed: "Is this a global binding or project-specific (`~/.config/zed/keymap.json` vs `.zed/keymap.json`)?"

## Common Failure Modes to Catch

- **Forgot to check user override** → conclusion is wrong if the user already rebound the default.
- **Forgot terminal layers for an in-terminal target app** → output is reassuring but the binding will be eaten by WezTerm/tmux.
- **Treated `Cmd+Letter` as free** → almost certainly conflicts with an app menu in some app in the stack.
- **Treated `Cmd+Space` / `Cmd+Tab` as overridable without flagging the UX cost** — these are user-trained reflexes; mention the cost even when technically rebindable.
- **Suggested chord starting with a combo that itself conflicts** (e.g., a Zed chord starting with `cmd-k` when `cmd-k` is rebound to something else in user's keymap.json) — check the prefix of any chord against the same layer stack.
