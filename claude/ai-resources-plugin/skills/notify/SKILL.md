---
name: notify
description: "Send native desktop notifications and audio or text-to-speech alerts with the notify CLI tool. Use when the user asks to be notified, alerted, pinged, or spoken to when a command finishes, a task completes, or input is needed."
---

# Notify the User (`notify`)

Use the `notify` CLI (`~/.local/bin/notify`, installed via `ai install --scope user`) to send a native desktop notification and an audio or spoken alert on macOS and Linux. Run `notify --help` when you need full flag or exit-code details.

## Choose the invocation mode

| Scenario | Form | Behavior |
| --- | --- | --- |
| Alert right now (multi-step task finished, milestone reached, or user input needed) | `notify [-m MESSAGE] [-a FILE]` | Sends a visual notification (`Notification`) and audio/speech alert immediately, then exits `0`. |
| Alert when a single foreground command finishes | `notify [-m MESSAGE] [-a FILE] -- COMMAND [ARG...]` | Runs `COMMAND` with inherited cwd, env, and stdio; relays `SIGHUP`, `SIGINT`, and `SIGTERM`; alerts on completion (`Command succeeded`, `Command failed`, or `Command terminated`); returns `COMMAND`'s exit status. |

Prefer **wrapped mode** when waiting on a single command so its outcome title and exit code are preserved automatically. Prefer **immediate mode** after multi-step agent work, file edits, or analysis where no single command represents the task outcome.

## Choose audio vs. speech (`-m` and `-a`)

`notify` attempts a native visual notification first, then selects **one** audio path:

1. **Custom audio (`-a FILE` / `--audio FILE`):** Plays `FILE` (resolved relative to the current working directory), taking precedence over both default chimes and text-to-speech. Falls back to speaking the notification body only if `FILE` cannot be played.
2. **Spoken message (`-m MESSAGE` / `--message MESSAGE`, without `-a`):** Sets the visual notification body to `MESSAGE` and **speaks `MESSAGE` aloud via text-to-speech** (`say` on macOS; `spd-say` or `espeak` on Linux), skipping the default MP3 chime.
3. **Default chime (neither `-m` nor `-a`):** Plays the first working file from `.claude/notification.mp3` (current directory only; parent directories are not searched) or `~/.config/notify/notification.mp3`. If neither exists or plays, speaks the derived body (`Notification` or `<command> finished successfully` / `failed with exit code N`).

Because `-m` without `-a` triggers text-to-speech:

- Keep `-m` messages short, plain, and speakable (one brief sentence, such as `"Build and tests passed"` or `"Ready for your review"`). Do not put markdown, file paths, URLs, flags, or stack traces in `-m`.
- Omit `-m` when the user wants a quiet chime rather than spoken audio, or pair `-m` with `-a` when both custom body text and a sound file are wanted.

## Non-obvious rules and gotchas

- **Put `--` before every wrapped command, and all `notify` flags before `--`.** `notify bun test` is a syntax error (exit `2`). Every token after `--` is passed verbatim to `COMMAND`.
- **`notify` spawns `COMMAND` directly without a shell.** Operators like `&&`, `||`, `|`, redirects, globs, and inline env assignments after `--` are not interpreted by `notify`:
  - In `notify -- cmd1 && cmd2`, the outer shell runs `notify -- cmd1` first and alerts before `cmd2` starts.
  - To wrap a compound shell command and alert once at the end, invoke a shell explicitly and pass `-m` so the notification body does not default to `sh finished successfully`:
    ```bash
    notify -m "Typecheck and tests finished" -- sh -c 'bun run typecheck && bun test'
    ```
- **Each flag (`-m`, `-a`) may appear at most once**, and neither value may be empty or whitespace-only (exit `2`).
- **Delivery is synchronous and best-effort.** `notify` waits for visual and audio/speech playback to finish before exiting. Missing backends or unreadable audio files emit `notify: warning: <channel>: <diagnostic>` on stderr without changing the exit status.
- **Sandbox constraints.** `notify` lives in `~/.local/bin/notify` and invokes host desktop and audio binaries (`osascript`, `say`, `afplay`, `notify-send`, `spd-say`, `espeak`, `ffplay`, `mpv`). If a command sandbox blocks `~/.local/bin/notify` or host IPC/audio (`operation not permitted` or `notify: warning:` from blocked backends), run `notify` outside the sandbox when authorized. When wrapping a command that can run inside the sandbox, run the command sandboxed first and invoke `notify` alone outside the sandbox afterward so only notification delivery runs unsandboxed.

## Completion criteria

Done when `notify` has been invoked in the mode matching the user's request, returned `0` (immediate mode) or the wrapped command's exit status without a CLI syntax error (`exit 2`), and any `notify: warning:` diagnostics on stderr are surfaced if delivery failed or the user asked to troubleshoot notifications.
