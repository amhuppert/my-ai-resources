---
name: notify
description: Send desktop notifications and audio or text-to-speech alerts with
  the notify CLI when a command finishes, a task completes, or user input is
  needed.
---

# Notify the user (`notify`)

Use the `notify` CLI (`~/.local/bin/notify`, installed via `ai install --scope user`) to send a native desktop notification paired with an audio or spoken alert on macOS and Linux. Run `notify --help` for full flags and exit codes.

## Invocation modes

| Scenario | Form | Behavior |
| --- | --- | --- |
| Alert immediately (multi-step task done, milestone hit, or user input needed) | `notify [-m MESSAGE] [-a FILE]` | Sends a visual notification (`Notification`) and audio/speech alert right away, then exits `0`. |
| Alert when one foreground command finishes | `notify [-m MESSAGE] [-a FILE] -- COMMAND [ARG...]` | Runs `COMMAND` with inherited cwd, env, and stdio; relays `SIGHUP`, `SIGINT`, `SIGTERM`; alerts on completion (`Command succeeded`, `Command failed`, or `Command terminated`); returns `COMMAND`'s exit status. |

Use **wrapped mode** for a single command so its outcome title and exit code propagate automatically. Use **immediate mode** after multi-step work, file edits, or analysis where no single command represents the result.

## Audio vs. speech (`-m` and `-a`)

`notify` attempts a native visual notification first, then takes one audio path:

1. **Custom audio (`-a FILE` / `--audio FILE`):** plays `FILE` (resolved relative to cwd), overriding both chimes and speech. Falls back to speaking the notification body only if playback fails.
2. **Spoken message (`-m MESSAGE` / `--message MESSAGE`, without `-a`):** sets the notification body to `MESSAGE` and speaks it aloud via text-to-speech (`say` on macOS; `spd-say` or `espeak` on Linux), skipping the default chime.
3. **Default chime (neither `-m` nor `-a`):** plays the first working file from `.claude/notification.mp3` (cwd only; parent directories are not searched) or `~/.config/notify/notification.mp3`. If neither works, speaks the derived body (`Notification`, `<command> finished successfully`, or `failed with exit code N`).

Because `-m` without `-a` speaks aloud:

- Keep `-m` short, plain, and speakable (one brief sentence such as `"Build and tests passed"` or `"Ready for your review"`). Keep markdown, file paths, URLs, flags, and stack traces out of `-m`.
- Omit `-m` for a chime without speech, or combine `-m` with `-a` when you want custom notification text plus a sound file.

## Gotchas

- **Put `--` before every wrapped command and all `notify` flags before `--`.** `notify bun test` is a syntax error (exit `2`). Everything after `--` passes verbatim to `COMMAND`.
- **`notify` spawns `COMMAND` directly with no shell.** Shell operators (`&&`, `||`, `|`, redirects, globs, inline env vars) after `--` are not interpreted by `notify`. In `notify -- cmd1 && cmd2`, the outer shell alerts after `cmd1` before `cmd2` runs. To alert once at the end of a compound command, wrap `sh -c` explicitly and pass `-m` so the body does not read `sh finished successfully`:

  ```bash
  notify -m "Typecheck and tests finished" -- sh -c 'bun run typecheck && bun test'
  ```

- **Each flag (`-m`, `-a`) can appear at most once**, and neither value may be empty or whitespace-only (exit `2`).
- **Delivery is synchronous and best-effort.** `notify` waits for playback to finish before exiting. Missing backends or unreadable audio files print `notify: warning: <channel>: <diagnostic>` to stderr without changing the exit code.
- **Sandbox boundary:** `notify` lives in `~/.local/bin/notify` and calls host desktop/audio binaries (`osascript`, `say`, `afplay`, `notify-send`, `spd-say`, `espeak`, `ffplay`, `mpv`). If a sandbox blocks it (`operation not permitted` or backend warnings), run `notify` unsandboxed when authorized. If wrapping a command that runs fine sandboxed, run the command inside the sandbox first and call `notify` alone outside the sandbox afterward.

## Completion criteria

Done when `notify` ran in the mode matching the request, returned `0` (immediate mode) or the wrapped command's exit status (never syntax error `2`), and any `notify: warning:` output on stderr is reported if delivery failed or the user asked to troubleshoot notifications.
