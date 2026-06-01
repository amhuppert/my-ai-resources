# Adding a Reference

How to extend the skill with a new app or OS layer. Load when the user names software the skill doesn't yet cover and wants ongoing support, or when you yourself notice a recurring gap during analysis.

## When to Add a Reference

Add one when **all** of these are true:

- The app holds bindings that would shadow or be shadowed by combos in scope.
- It has knowable defaults (documented or easily extractable).
- It has a config file format the model can parse without code execution.
- The user expects to use it more than once.

Don't add one for:

- One-off questions about an app the user won't bind keys in regularly.
- Apps whose bindings live entirely in a GUI (no config file) — the value is too low. Just note the app and ask the user about specific combos.

## Required Structure for an `app-<name>.md` Reference

Every reference file should have these sections, in this order:

```
# <App> (<focus context>)

## Overview
- One paragraph: what the app is, what role it plays in the layer stack
  (focused app? terminal layer? launcher?), and which OS variants this
  reference covers.

## Modifier Conventions
- How the app spells modifiers in its config and docs (e.g., `cmd-shift-p`
  for Zed; `CMD|SHIFT` for WezTerm; `C-b` for tmux).
- Any leader/prefix concept.
- Anything unusual about chord syntax.

## Default Bindings (macOS)
- A table of the high-traffic defaults — actions vs combo.
- Organize by category (navigation / editing / windowing / etc.) when the
  table is more than ~15 rows.
- Note any defaults that the app refuses to let users rebind.

## Customization Files
- Exact paths in load order (later overrides earlier).
- Format (JSON, Lua, plain text).
- How to find a binding for a given action: grep patterns, structural
  patterns the model should search for.
- How to detect that a default has been disabled vs. replaced vs. left alone.

## Override Mechanics
- Can defaults be disabled? With what syntax?
- Can the app's own bindings be reached when the OS or a higher terminal
  layer would normally swallow them?
- Any precedence quirks within the app (e.g., context-based overrides in
  Zed where a binding only fires in `Editor` context).

## Known Swallow Traps
- Combos this app grabs aggressively that bite users who try to use them
  for higher-stack bindings (e.g., WezTerm grabs `Cmd+T` for new tab —
  no Zed binding under it ever reaches Zed in a terminal context, but
  Zed isn't in a terminal so this doesn't matter; whereas if someone
  put `Cmd+T` for Claude Code, WezTerm swallows it).
- Cross-OS divergence worth knowing about even though v1 is macOS.

## Discovery Commands (optional)
- Commands or UI paths the user can run to dump current bindings
  authoritatively (e.g., Zed: `Cmd+K Cmd+S` opens keymap editor).
```

## Process for Adding

1. **Check the SKILL.md reference index** — verify the app isn't already covered under a different name.
2. **Verify defaults from an authoritative source** — official docs or a clean install of the app. Don't paraphrase from training data without verification — defaults change between versions.
3. **Identify the config-file paths** — run a quick install / `ls` against the user's home directory to confirm paths exist where you claim they do.
4. **Write the file** following the structure above. Aim for moderate length (~100–200 lines). Don't fabricate edge cases; leave a "Known unknowns" section if needed.
5. **Update `SKILL.md`'s "Reference Index" table** with the new entry and its trigger condition.
6. **Update `safe-combos.md`** if the new app changes the modifier-region recommendations (e.g., a new app that grabs `Cmd+Ctrl+<letter>` widely shrinks the safest region).
7. **Bump the plugin.json version** in `claude/ai-resources-plugin/.claude-plugin/plugin.json` (this is a hard rule for all plugin changes — see `claude/CLAUDE.md`).

## Template

```markdown
# <App> (macOS)

## Overview

<one paragraph>

## Modifier Conventions

- Cmd: <how spelled>
- Opt: <how spelled>
- Ctrl: <how spelled>
- Shift: <how spelled>
- Leader/prefix: <if applicable>
- Chord syntax: <e.g., space-separated for two-stroke chords>

## Default Bindings (macOS)

### <Category>

| Action | Combo |
|---|---|
| <action> | <combo> |

## Customization Files

| Layer | Path | Format |
|---|---|---|
| User | `~/...` | <JSON/Lua/etc.> |
| Project | `<repo>/.../` | <...> |

Load order: <which wins>.

### How to find a binding for action X

<grep pattern / structural search instructions>

### How to detect default disabled vs replaced

<concrete description>

## Override Mechanics

<text>

## Known Swallow Traps

- <combo>: <what gets eaten and when>

## Discovery Commands

- <command or UI path>: <what it shows>

## Known Unknowns

- <anything you couldn't verify; do not pretend to know>
```

## Reviewing an Existing Reference

When the user reports that the skill got something wrong about an app, update its reference file:

1. Identify which section was wrong (default table? config path? override mechanics?).
2. Verify the correction against authoritative sources.
3. Edit only the affected section. Don't rewrite the whole file.
4. If the correction reveals a class of error (e.g., the app shipped a major version that reorganized defaults), add a "Version notes" line at the top of the file naming the version covered.
5. Bump `plugin.json` version.
