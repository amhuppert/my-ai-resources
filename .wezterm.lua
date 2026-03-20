local wezterm = require("wezterm")
local act = wezterm.action
local mux = wezterm.mux
local config = wezterm.config_builder()

-- ── Maximize on startup ─────────────────────────────────────────────
wezterm.on("gui-startup", function()
  local _, _, window = mux.spawn_window({})
  window:gui_window():maximize()
end)

-- ── GPU / Performance ───────────────────────────────────────────────
config.front_end = "OpenGL"
config.max_fps = 120
config.scrollback_lines = 10000

-- ── Font ────────────────────────────────────────────────────────────
config.font = wezterm.font_with_fallback({
  "JetBrains Mono",
  "Noto Color Emoji",
})
config.font_size = 13.0
config.line_height = 1.2

-- ── Color scheme ────────────────────────────────────────────────────
config.color_scheme = "Catppuccin Mocha"

-- ── Window ──────────────────────────────────────────────────────────
config.window_decorations = "RESIZE"
config.window_padding = {
  left = "0.5cell",
  right = "0.5cell",
  top = "0.5cell",
  bottom = "0.5cell",
}
config.window_close_confirmation = "AlwaysPrompt"
config.adjust_window_size_when_changing_font_size = false

-- ── Inactive pane dimming ───────────────────────────────────────────
config.inactive_pane_hsb = {
  saturation = 0.8,
  brightness = 0.7,
}

-- ── Tab bar ─────────────────────────────────────────────────────────
config.use_fancy_tab_bar = false
config.hide_tab_bar_if_only_one_tab = true
config.tab_max_width = 30

-- ── Cursor ──────────────────────────────────────────────────────────
config.default_cursor_style = "BlinkingBar"
config.cursor_blink_rate = 500

-- ── Misc ────────────────────────────────────────────────────────────
config.audible_bell = "Disabled"
config.use_dead_keys = false

-- ── Leader key (tmux-style prefix: Ctrl+a) ──────────────────────────
config.leader = { key = "Space", mods = "CTRL", timeout_milliseconds = 1000 }

-- ── Status bar: leader indicator + workspace + clock ────────────────
wezterm.on("update-right-status", function(window)
  local leader = window:leader_is_active() and " LEADER " or ""
  local workspace = window:active_workspace()
  window:set_right_status(wezterm.format({
    { Text = leader .. " " .. workspace .. " " .. wezterm.strftime("%H:%M") .. " " },
  }))
end)

-- ── Keybindings ─────────────────────────────────────────────────────
config.keys = {
  -- Rename tab
  {
    key = "E",
    mods = "CTRL|SHIFT",
    action = act.PromptInputLine({
      description = "Rename tab",
      action = wezterm.action_callback(function(window, _, line)
        if line then
          window:active_tab():set_title(line)
        end
      end),
    }),
  },

  -- Splits (Leader + - / \)
  { key = "-",  mods = "LEADER", action = act.SplitVertical({ domain = "CurrentPaneDomain" }) },
  { key = "\\", mods = "LEADER", action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }) },

  -- Pane navigation (Leader + vim keys)
  { key = "h", mods = "LEADER", action = act.ActivatePaneDirection("Left") },
  { key = "j", mods = "LEADER", action = act.ActivatePaneDirection("Down") },
  { key = "k", mods = "LEADER", action = act.ActivatePaneDirection("Up") },
  { key = "l", mods = "LEADER", action = act.ActivatePaneDirection("Right") },

  -- Pane resize (Leader + Shift + vim keys)
  { key = "H", mods = "LEADER|SHIFT", action = act.AdjustPaneSize({ "Left", 5 }) },
  { key = "J", mods = "LEADER|SHIFT", action = act.AdjustPaneSize({ "Down", 5 }) },
  { key = "K", mods = "LEADER|SHIFT", action = act.AdjustPaneSize({ "Up", 5 }) },
  { key = "L", mods = "LEADER|SHIFT", action = act.AdjustPaneSize({ "Right", 5 }) },

  -- Pane management
  { key = "m",     mods = "LEADER", action = act.TogglePaneZoomState },
  { key = "x",     mods = "LEADER", action = act.CloseCurrentPane({ confirm = true }) },
  { key = "0",     mods = "LEADER", action = act.PaneSelect({ mode = "SwapWithActive" }) },
  { key = "Space", mods = "LEADER", action = act.RotatePanes("Clockwise") },

  -- Copy mode (vim-style text selection)
  { key = "Enter", mods = "LEADER", action = act.ActivateCopyMode },

  -- Workspace switcher
  { key = "s", mods = "LEADER", action = act.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" }) },

  -- Explicit readline pass-throughs (protect against future WezTerm defaults)
  { key = "a", mods = "CTRL", action = act.SendKey({ key = "a", mods = "CTRL" }) }, -- beginning of line
  { key = "e", mods = "CTRL", action = act.SendKey({ key = "e", mods = "CTRL" }) }, -- end of line
  { key = "b", mods = "CTRL", action = act.SendKey({ key = "b", mods = "CTRL" }) }, -- back one char
  { key = "f", mods = "CTRL", action = act.SendKey({ key = "f", mods = "CTRL" }) }, -- forward one char
  { key = "d", mods = "CTRL", action = act.SendKey({ key = "d", mods = "CTRL" }) }, -- delete char / EOF
  { key = "k", mods = "CTRL", action = act.SendKey({ key = "k", mods = "CTRL" }) }, -- kill to end of line
  { key = "u", mods = "CTRL", action = act.SendKey({ key = "u", mods = "CTRL" }) }, -- kill to beginning of line
  { key = "w", mods = "CTRL", action = act.SendKey({ key = "w", mods = "CTRL" }) }, -- delete word backward
  { key = "y", mods = "CTRL", action = act.SendKey({ key = "y", mods = "CTRL" }) }, -- yank (paste killed text)
  { key = "r", mods = "CTRL", action = act.SendKey({ key = "r", mods = "CTRL" }) }, -- reverse history search
  { key = "l", mods = "CTRL", action = act.SendKey({ key = "l", mods = "CTRL" }) }, -- clear screen
  { key = "t", mods = "CTRL", action = act.SendKey({ key = "t", mods = "CTRL" }) }, -- transpose chars
  { key = "p", mods = "CTRL", action = act.SendKey({ key = "p", mods = "CTRL" }) }, -- previous history
  { key = "n", mods = "CTRL", action = act.SendKey({ key = "n", mods = "CTRL" }) }, -- next history
  { key = "b", mods = "ALT",  action = act.SendKey({ key = "b", mods = "ALT" }) },  -- back one word
  { key = "f", mods = "ALT",  action = act.SendKey({ key = "f", mods = "ALT" }) },  -- forward one word
  { key = "d", mods = "ALT",  action = act.SendKey({ key = "d", mods = "ALT" }) },  -- delete word forward
  { key = "Enter", mods = "ALT", action = act.SendKey({ key = "Enter", mods = "ALT" }) }, -- insert newline

  -- Clear scrollback + screen
  { key = "k", mods = "CTRL|ALT", action = act.Multiple({
    act.ClearScrollback("ScrollbackAndViewport"),
    act.SendKey({ key = "L", mods = "CTRL" }),
  })},

  -- Reload .bashrc
  { key = "r", mods = "CTRL|SHIFT", action = act.SendString("source ~/.bashrc\n") },
}

return config
