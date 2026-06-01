---
name: hotkey-helper
description: Use when picking or vetting a keyboard shortcut on macOS. Triggers include "what hotkey should I use for X", "is `<combo>` available", "does this shortcut conflict", "recommend a keybinding for…", "check `<combo>` against my setup", "pick a hotkey for…", or any mention of choosing/binding/changing a shortcut in WezTerm, tmux, Zed, Chrome, Claude Code, or macOS. Determines whether a proposed combo collides with OS-reserved bindings, app defaults, or the user's customizations, and recommends ergonomic alternatives when needed.
---

# Hotkey Helper (macOS)

Pick keyboard shortcuts that won't be swallowed by macOS, the terminal stack, or the focused app — and vet proposed combos before the user binds them. v1 covers macOS only.

This file is the spine. Per-layer knowledge (system bindings, app defaults, config file locations) lives in `references/` and loads on demand.

## When to Use This Skill

- The user proposes a specific combo and asks whether it's safe.
- The user describes an action ("a hotkey to toggle the project panel") and asks for a recommendation.
- The user wants to know why an existing binding "isn't working" (usually a higher-precedence layer is swallowing it).
- The user is editing `wezterm.lua`, Zed `keymap.json`, `tmux.conf`, `~/.claude/keybindings.json`, or macOS keyboard settings and wants conflict analysis.

Do **not** use this skill for:
- Configuring the binding file itself (use the `keybindings-help` skill for `~/.claude/keybindings.json` syntax).
- General typing ergonomics unrelated to conflicts.

## Required Context

Before analysis, confirm three things. Ask only what's missing.

1. **OS** — macOS (v1 only; refuse Linux/Windows requests and say v1 is macOS-only).
2. **Software stack** — every app that will be focused *or running in the background* when the hotkey fires. The default minimum stack for Alex is **WezTerm + tmux + Claude Code + Zed + Chrome**, but always re-confirm rather than assume. Background apps matter because some grab globally (rare on Alex's setup since he runs no Raycast/Karabiner/BTT — confirm this hasn't changed).
3. **Goal** — `check` (vet a specific combo) or `recommend` (propose combos for an action).

If the user has not stated the **focused** app (the one whose binding they actually want to install), ask. The focused app determines which customization files to read.

## Conflict Layer Stack (macOS)

Ordered by who sees the keystroke first. Earlier layers can swallow it before later ones react.

| Layer | What it covers | Reference |
|---|---|---|
| 1. macOS reserved | Spotlight, Mission Control, app switcher, screenshot, accessibility, system text-editing | `references/os-macos.md` |
| 2. macOS user shortcuts | System Settings → Keyboard → Shortcuts overrides; Services menu bindings | `references/os-macos.md` |
| 3. Terminal app | WezTerm bindings (only matters when focused app is in-terminal: tmux/Claude Code) | `references/app-wezterm.md` |
| 4. Terminal multiplexer | tmux prefix + table (only when focused app runs inside tmux) | `references/app-tmux.md` |
| 5. Focused app default | Chrome, Zed, Claude Code, etc. | `references/app-<name>.md` |
| 6. Focused app user/project override | `wezterm.lua`, `~/.config/zed/keymap.json`, `<project>/.zed/keymap.json`, `~/.claude/keybindings.json`, etc. | Per-app reference |

When the focused app is inside a terminal (Claude Code, tmux itself), layers 3 and 4 sit *above* the app — WezTerm and tmux each get the keystroke first and may consume it. That's why a "great" Claude Code binding can be unreachable in practice.

## Severity Levels

Apply one per layer hit when analyzing a combo.

- **BLOCKING** — Layer 1 (macOS reserved) hit that can't be disabled in normal config (e.g., `Cmd+Tab`). Recommendation: pick a different combo.
- **OVERRIDE-REQUIRED** — Hit on a layer above the focused app. Usable only after disabling that higher-layer binding (name the exact file/setting). Common case: a Zed binding shadowed by macOS user shortcut.
- **SOFT** — Hit on the focused app's own default. Acceptable when the user intentionally replaces it.
- **LATENT** — Hit on a layer the user didn't list as in-scope but commonly runs (e.g., tmux when focused app is Claude Code in WezTerm). Report as a warning, not a blocker.

## Workflow

### Check mode (user proposes a specific combo)

1. Confirm OS + stack + focused app.
2. Walk the layer stack top-down. For each layer in scope, load the matching `references/app-*.md` only if not already loaded.
3. For each app that supports user/project customizations, **read the live config file** before judging the layer (the default table is not authoritative if the user has overridden it):
   - WezTerm: `~/.wezterm.lua`, `~/.config/wezterm/wezterm.lua`, `~/.config/wezterm/*.lua`
   - Zed: `~/.config/zed/keymap.json` and (if there's a project) `<project>/.zed/keymap.json`
   - tmux: `~/.tmux.conf`, `~/.config/tmux/tmux.conf`
   - Claude Code: `~/.claude/keybindings.json`
   - macOS user shortcuts: cannot be read non-interactively; ask the user whether they've customized System Settings → Keyboard → Shortcuts.
4. Classify each hit. Pick the worst severity as the verdict.
5. Render the output in the format below.

### Recommend mode (user describes an action)

1. Confirm OS + stack + focused app + the action's natural mnemonic (e.g., "P" for "panel").
2. Generate 4–6 candidate combos that respect the focused app's modifier conventions (load `references/app-<name>.md` for the focused app — Zed leans on `cmd-k <chord>`, WezTerm on `CMD+SHIFT+<letter>`, etc.).
3. Run each candidate through the check workflow above (steps 2–4).
4. Rank by: (a) no BLOCKING or OVERRIDE-REQUIRED hits, (b) no LATENT hits, (c) closer mnemonic fit, (d) ergonomics per `references/safe-combos.md`.
5. Present the top 2–3 with the per-layer summary that justifies each.

## Output Format

**Check mode:**

```
Proposed: <combo>   (macOS, focus = <app>, stack = <list>)

─ Layer analysis ──────────────────────────────────────
  1. macOS reserved        : <hit or — | severity>
  2. macOS user shortcuts  : <hit or — | severity | asked-user? y/n>
  3. WezTerm               : <hit or — | severity | source: defaults / wezterm.lua line N>
  4. tmux                  : <hit or — | severity | source: defaults / tmux.conf line N>
  5. <focused app> default : <hit or — | severity>
  6. <focused app> override: <hit or — | severity | source: <path:line>>

─ Verdict ─────────────────────────────────────────────
  <SAFE | USABLE-WITH-OVERRIDE | UNSAFE>
  <one-sentence reasoning>

─ Action ──────────────────────────────────────────────
  <concrete next step: bind it / first rebind X in Y / pick another>

─ Alternatives (if not SAFE) ──────────────────────────
  - <combo>  — <one-line why>
  - <combo>  — <one-line why>
```

**Recommend mode:** same skeleton, but emit 2–3 ranked candidates with their layer analyses stacked.

## Non-Negotiables

1. **Never claim a combo is safe without naming the layers checked.** If a layer in the stack was skipped (e.g., user didn't confirm whether they've customized macOS shortcuts), say so explicitly in the verdict.
2. **Always read user/project config files when the focused app or terminal layer supports them.** Defaults are not authoritative once a customization exists. If a config file doesn't exist, say "no override file found" — don't silently treat that as "no conflict."
3. **Ask for OS, stack, and focused app if any is missing.** Don't guess. The default stack listed above is a starting point for *Alex*, not an assumption to apply to other users or sessions where context is unclear.
4. **Latent conflicts get reported, not hidden.** A binding that breaks when the user switches into tmux is worth a one-line warning even if not in the active focus.
5. **Flag unknown layers explicitly.** If the user names an app with no reference file, say so and proceed with reduced confidence — never fabricate defaults. See `references/adding-a-reference.md` for how to extend.
6. **Don't conflate "rebindable" with "free."** A SOFT hit on the focused app's own default is fine if intentional, but the output must make clear what default is being replaced.
7. **v1 is macOS-only.** If asked about Linux/Windows, say so and stop.

## Reference Index

Load on demand.

| Load this | When |
|---|---|
| [`references/conflict-model.md`](references/conflict-model.md) | Need to reason about override mechanics, layer precedence edge cases, or "can macOS-reserved X actually be disabled?" |
| [`references/decision-protocol.md`](references/decision-protocol.md) | Need the explicit step-by-step for check or recommend mode, including order of file reads and what to ask the user |
| [`references/safe-combos.md`](references/safe-combos.md) | Generating recommendations — covers ergonomic combos, modifier regions that tend to be free, mnemonic patterns |
| [`references/adding-a-reference.md`](references/adding-a-reference.md) | Extending the skill with a new app (e.g., Slack, Notion, VS Code) — template + the required sections |
| [`references/os-macos.md`](references/os-macos.md) | Any analysis (always load) — reserved bindings, accessibility traps, where user customizations live |
| [`references/app-wezterm.md`](references/app-wezterm.md) | Focused app is WezTerm or any app running inside WezTerm |
| [`references/app-tmux.md`](references/app-tmux.md) | Focused app is tmux or any app running inside tmux |
| [`references/app-chrome.md`](references/app-chrome.md) | Focused app is Chrome |
| [`references/app-zed.md`](references/app-zed.md) | Focused app is Zed |
| [`references/app-claude-code.md`](references/app-claude-code.md) | Focused app is Claude Code (the TUI in a terminal) |

## Anti-Patterns

- **Trusting the default table.** Always read user/project overrides for the focused app and for any terminal layer in the stack.
- **Ignoring the multiplexer.** A combo that's clean against Zed defaults is irrelevant if the binding will live in Claude Code running under tmux running under WezTerm — check tmux and WezTerm too.
- **Suggesting `Cmd+letter` and calling it free.** macOS app menu conventions claim most single-letter `Cmd+letter` combos. Output must name the convention being broken.
- **Confidently asserting macOS user shortcuts.** They aren't readable from disk in a sane format; ask the user.
- **Listing alternatives without checking them.** Every alternative offered must go through the same layer-stack check as the original proposal.
