# Notify CLI Implementation Plan

## Overview

Implement `notify` as a Bun/TypeScript user utility for macOS and Linux. The command either notifies immediately or executes one argv-preserving foreground command, waits for it to finish, shows a native visual notification, performs one synchronous audio path, and returns the wrapped command's status. Compile the source into a standalone executable in the existing generated `scripts/` utility directory so Bun preserves the required `--` token and `ai install --scope user` installs it to `~/.local/bin/notify` with the other utility scripts.

Target Bun 1.3.14 (the workspace runtime), TypeScript 5.8.3, and the repository's existing `@types/bun` 1.2.18 configuration without changing dependency versions. Add no npm dependencies, shell evaluation, configuration format, network access, or persistent state.

## Public CLI Contract

Support only these invocation forms:

```text
notify
notify -m MESSAGE
notify --message MESSAGE
notify -- COMMAND [ARG...]
notify -m MESSAGE -- COMMAND [ARG...]
notify --message MESSAGE -- COMMAND [ARG...]
notify -h
notify --help
```

- `--` is mandatory before a wrapped command. Pass every token after it directly to the child without parsing, joining, or shell evaluation.
- Accept `-m MESSAGE` and `--message MESSAGE` only as separate tokens before `--`. Do not add `--message=MESSAGE`, combined short-option, positional-message, shell-string, version, quiet, channel-selection, or timeout forms.
- Trim leading and trailing whitespace from an explicit message. Reject an empty or whitespace-only result.
- Reject duplicate message options, a missing message value, unknown pre-delimiter options, bare positional arguments, `--` without a command, and an empty command token immediately after `--`.
- `-h` or `--help` before the delimiter prints usage to stdout and exits `0` without notifying. The same token after `--` is a child token.
- Invalid syntax prints `notify: <reason>` and the usage synopsis to stderr, then exits `2` without notifying or launching a child.
- Resolve `.claude/notification.mp3` relative to the invocation working directory. Resolve the global fallback as `join(homedir(), ".config", "notify", "notification.mp3")`. Do not search parent directories or create either location.
- On platforms other than `darwin` and `linux`, print `notify: unsupported platform: <platform>` to stderr and exit `1` before launching a wrapped command.

## Notification Content

Use the explicit trimmed message as the body whenever one was supplied. Otherwise derive the body from only the executable basename; never include child arguments or the executable's directory.

| Invocation outcome             | Native title         | Default body                      | Process status        |
| ------------------------------ | -------------------- | --------------------------------- | --------------------- |
| Immediate, no message          | `Notification`       | `Notification`                    | `0`                   |
| Immediate, explicit message    | `Notification`       | Explicit message                  | `0`                   |
| Child exits `0`                | `Command succeeded`  | `COMMAND finished successfully`   | `0`                   |
| Child exits nonzero `N`        | `Command failed`     | `COMMAND failed with exit code N` | `N`                   |
| Child terminates from `SIGNAL` | `Command terminated` | `COMMAND terminated by SIGNAL`    | `128 + signal number` |
| Executable cannot launch       | `Command failed`     | `COMMAND could not be started`    | `127`                 |

- When an explicit message wraps a command, retain the outcome title and replace only the body. For example, an exit `3` with `-m "Tests are done"` uses title `Command failed`, body `Tests are done`, and status `3`.
- Preserve Unicode and internal whitespace in explicit messages.
- Do not append punctuation to the templates.
- Compute signal numbers from `node:os.constants.signals`. Treat a child exit code such as `143` as an ordinary nonzero exit unless the process reports an actual signal.

## Execution and Signal Semantics

- Launch the child directly with `[command, ...args]`, the invocation working directory, the current environment, and inherited stdin/stdout/stderr. Child output remains live and unprefixed.
- Do not invoke a login shell or interpret pipes, redirections, globbing, substitutions, variables, or quoting.
- After a successful spawn, register handlers for `SIGHUP`, `SIGINT`, and `SIGTERM` while the child is running. On the first received signal, record it; on every received signal, relay that signal to the child if it is still active. Do not exit the wrapper from the handler.
- Await the child after relaying. If the wrapper received a relayed signal, use the first recorded signal for the notification outcome and return status even if the child traps it and exits with another code. Otherwise use the child's reported exit code or signal.
- Remove all three handlers immediately after the child settles and before delivering notifications. Ignore a kill error caused by the child exiting during relay; warn for other relay errors without replacing the final status.
- If spawn throws or otherwise reports that the executable could not start, print `notify: failed to start COMMAND: <diagnostic>` to stderr, use the launch-failure notification content, and return `127` after notification.
- Deliver notification after success, nonzero exit, child signal, relayed wrapper signal, and launch failure.
- `SIGKILL` received by the wrapper, host shutdown, and process crashes cannot be intercepted and are the only signal-delivery exceptions.

## Delivery Sequence

For every valid invocation, resolve the content and perform these stages serially:

1. Attempt the platform's native visual notification and wait for the backend command to return.
2. Select the audio policy based on whether `-m`/`--message` was explicitly supplied.
3. Wait for the selected MP3 playback or TTS process to finish.
4. Return the invocation status from the content table.

Visual delivery and all audio delivery are best effort:

- A missing backend or nonzero backend result emits `notify: warning: <channel>: <diagnostic>` on stderr.
- Capture and suppress backend stdout. Include trimmed backend stderr in the warning when nonempty; otherwise include the executable name and exit status.
- Continue to the audio stage when visual delivery fails.
- Never replace a valid immediate-mode status or wrapped-command status with a delivery failure.
- A missing optional MP3 file is silent. A present but unreadable/corrupt file, missing MP3 player, failed playback, missing TTS backend, failed speech, missing visual backend, or failed visual delivery warns.

### Explicit-message audio

When a message was explicitly supplied:

1. Speak exactly the resolved body with the first available TTS backend.
2. Do not inspect, play, or fall back to either MP3.
3. If TTS is unavailable or fails, warn and finish with visual delivery only.

### Derived-message audio

When no message was explicitly supplied:

1. If `<cwd>/.claude/notification.mp3` is a file, attempt to play it. Stop the audio chain on success; warn and continue on failure.
2. If `~/.config/notify/notification.mp3` is a file, attempt to play it. Stop the audio chain on success; warn and continue on failure.
3. Speak the resolved default body. Warn and finish if TTS is unavailable or fails.

Select one installed MP3 executable before attempting files. If no MP3 executable is installed and at least one candidate file exists, warn once, skip both playback attempts, and continue to TTS. Select backends by executable availability; after selecting the first installed executable for a channel, do not switch to the channel's second executable because the selected program returned nonzero.

## Platform Backends

Resolve executables with `Bun.which` and invoke them directly with argument arrays. Never interpolate a title, body, or path into shell source.

| Channel      | macOS (`darwin`) | Linux (`linux`)          |
| ------------ | ---------------- | ------------------------ |
| Visual       | `osascript`      | `notify-send`            |
| TTS priority | `say`            | `spd-say`, then `espeak` |
| MP3 priority | `afplay`         | `ffplay`, then `mpv`     |

Use these exact backend contracts:

- `osascript`: pass `on run argv`, `display notification (item 2 of argv) with title (item 1 of argv)`, and `end run` as fixed `-e` script fragments, followed by `-- TITLE BODY`. Do not embed or escape user text inside the AppleScript source.
- `notify-send`: execute `notify-send --app-name=notify -- TITLE BODY`.
- `say`: execute with no message argv, write the body to stdin, close stdin, and await exit. This prevents message text beginning with `-` from becoming an option.
- `spd-say`: execute `spd-say --wait -- BODY` and await exit.
- `espeak`: execute `espeak --stdin`, write the body to stdin, close stdin, and await exit.
- `afplay`: execute `afplay ABSOLUTE_MP3_PATH`.
- `ffplay`: execute `ffplay -nostdin -nodisp -autoexit -loglevel quiet ABSOLUTE_MP3_PATH`.
- `mpv`: execute `mpv --no-video --really-quiet -- ABSOLUTE_MP3_PATH`.

Run all delivery backends with captured stdout/stderr and without access to the user's terminal stdin except for the deliberate TTS stdin payload.

## Architecture and Interfaces

Keep CLI parsing and orchestration in one focused library module and make the executable entry point an adapter only.

### `typescript/lib/notify.ts`

Define and export this exact interface surface; use `readonly` fields and arrays as shown:

```ts
type NotifyRequest =
  | { readonly type: "immediate"; readonly message?: string }
  | {
      readonly type: "command";
      readonly message?: string;
      readonly command: string;
      readonly args: readonly string[];
    };

type ParseResult =
  | { readonly type: "run"; readonly request: NotifyRequest }
  | { readonly type: "help" }
  | { readonly type: "error"; readonly message: string };

type CommandOutcome =
  | { readonly type: "success" }
  | { readonly type: "exit-failure"; readonly exitCode: number }
  | { readonly type: "signal"; readonly signal: NodeJS.Signals }
  | { readonly type: "launch-failure" };

interface NotificationContent {
  readonly title: string;
  readonly body: string;
}

type RelayedSignal = "SIGHUP" | "SIGINT" | "SIGTERM";

type ProcessCompletion =
  | {
      readonly type: "exited";
      readonly exitCode: number;
      readonly stderr: string;
    }
  | {
      readonly type: "signaled";
      readonly signal: NodeJS.Signals;
      readonly stderr: string;
    };

type FileProbe =
  | { readonly type: "missing" }
  | { readonly type: "file" }
  | { readonly type: "error"; readonly message: string };

type SpawnIo =
  | { readonly type: "inherit" }
  | { readonly type: "capture"; readonly stdinText?: string };

interface RunningProcess {
  readonly completion: Promise<ProcessCompletion>;
  kill(signal: NodeJS.Signals): void;
}

interface NotifyRuntime {
  readonly platform: NodeJS.Platform;
  readonly cwd: string;
  readonly homeDir: string;
  readonly env: NodeJS.ProcessEnv;
  which(name: string): string | null;
  probeFile(path: string): FileProbe;
  spawn(
    argv: readonly [string, ...string[]],
    options: {
      readonly cwd: string;
      readonly env: NodeJS.ProcessEnv;
      readonly io: SpawnIo;
    },
  ): RunningProcess;
  addSignalHandler(signal: RelayedSignal, handler: () => void): void;
  removeSignalHandler(signal: RelayedSignal, handler: () => void): void;
  warn(message: string): void;
  error(message: string): void;
}

function parseNotifyArgs(argv: readonly string[]): ParseResult;
function formatNotification(
  request: NotifyRequest,
  outcome?: CommandOutcome,
): NotificationContent;
function runNotify(
  request: NotifyRequest,
  runtime: NotifyRuntime,
): Promise<number>;
```

Also export the help-text constant used by parser tests and the entry point. `probeFile` returns `file` for a regular file or a symlink resolving to a regular file, `missing` for `ENOENT`, and `error` for all other lookup failures so permission/type errors can warn rather than masquerade as absence.

Keep platform command construction and the two audio policies as unexported functions in the same module. Do not create classes or a generic notification framework.

### `typescript/scripts/notify.ts`

- Add `#!/usr/bin/env bun`.
- Construct `NotifyRuntime` once from `process`, `node:os`, `node:path`, `node:fs`, `Bun.which`, and `Bun.spawn`, then pass it to `runNotify`.
- Adapt Bun subprocess completion by awaiting `proc.exited`, checking `proc.signalCode`, and returning the corresponding `ProcessCompletion`.
- For captured backends, consume stdout/stderr concurrently with process completion to avoid pipe backpressure. For inherited child I/O, return an empty diagnostic string.
- Parse `process.argv.slice(2)`, print help/errors on the specified stream, and assign the returned status to `process.exitCode`; do not call `process.exit` during normal execution because audio must finish first.
- Export the adapter factory and `main(argv, runtime)` for focused tests, guarded by `if (import.meta.main)` for execution.

## Files and Integration Points

```text
typescript/
  lib/
    notify.ts
    notify.test.ts
  scripts/
    notify.ts
    build-notify.ts
    install-user.ts
    install-user.test.ts
  tests/integration/
    notify-cli.test.ts
  package.json
  knip.json
scripts/
  notify                 # generated, executable, git-ignored
.gitignore
README.md
typescript/README.md
```

- `typescript/scripts/build-notify.ts`: invoke `bun build --compile --minify` for `typescript/scripts/notify.ts` with `scripts/notify` as the output, then enforce mode `0o755`. A standalone executable is required because Bun's script runner consumes the first `--` before `process.argv`, while a compiled executable preserves it.
- `.gitignore`: add `/scripts/notify` beside `/scripts/list-servers`; do not commit generated output.
- `typescript/package.json`: add `build:notify` and include it in the existing `build` script.
- `typescript/knip.json`: add `scripts/notify.ts` as an entry because the build script references it by path rather than importing it.
- `typescript/scripts/install-user.ts`: when `utility-scripts` is selected, run `bun run build:notify` after the existing `build:list-servers` step and before copying `scripts/`. Treat build failure as an installation error with its stdout/stderr reported. Do not change item selection or add a separate install item.
- `typescript/scripts/install-user.test.ts`: require both utility builds when selected and neither when omitted.
- `README.md`: add `scripts/notify` to user-installed utilities, document its three usage forms, correct optional runtime dependencies by platform, and document `.claude/notification.mp3` plus the global fallback.
- `typescript/README.md`: list `notify` under user-installed/global utilities and point to the root README for behavior.
- Do not alter the existing Claude notification hook or its `.claude/notification.mp3` behavior.

## Red-Green Implementation Sequence

For each numbered step, add the named test first, run the targeted command and confirm it fails for the missing behavior, implement only that behavior, then rerun until green before proceeding.

1. **Parser contract**
   - Add `typescript/lib/notify.test.ts` cases for every accepted invocation, exact argv preservation after `--`, message trimming, help, and every syntax rejection.
   - Run `cd typescript && bun test lib/notify.test.ts`; confirm failure because the module/parser is absent.
   - Add the request/result types, help text, and `parseNotifyArgs` only; rerun to green.

2. **Outcome content**
   - Add table-driven tests for immediate content, all four command outcomes, executable basename extraction, explicit-body override, status mapping, and signal-number mapping.
   - Run the same targeted test and confirm the new assertions fail.
   - Add `CommandOutcome`, `formatNotification`, and status helpers; rerun to green.

3. **Visual and audio orchestration**
   - Add a fake `NotifyRuntime` that records ordered calls and configurable files, executables, and process results.
   - Test macOS and Linux backend priority; visual-before-audio ordering; explicit-message TTS-only behavior; project MP3 success; global fallback on missing/failing project MP3; TTS fallback after both MP3s; no-player behavior; first-installed-backend selection; warning behavior; and unchanged return status after every delivery failure.
   - Run the targeted unit test and confirm failures, then implement backend resolution and delivery in the minimum increments needed to make each group green.

4. **Wrapped process lifecycle and signals**
   - Add fake-process tests for inherited cwd/environment/stdio, exact child argv, zero/nonzero exit, launch throw, child-reported signal, signal-handler registration/removal, relay of HUP/INT/TERM, first-signal precedence, and notification after each terminal outcome.
   - Confirm the tests fail, implement child execution and signal orchestration, and rerun to green.

5. **Executable adapter and end-to-end behavior**
   - Add `typescript/tests/integration/notify-cli.test.ts`. Use temporary executable stubs placed first in `PATH`, a temporary `HOME`/working directory, and a shared log file so tests never display real native notifications or produce real audio.
   - Cover immediate custom notification, mandatory delimiter rejection, child stdout/stderr passthrough, exit-code mirroring, launch failure `127`, `.claude` before global MP3, and explicit-message suppression of MP3.
   - Add a signal test that starts a blocking child, waits for a marker proving it launched, sends `SIGTERM` directly to `notify`, and asserts child termination, visual/audio calls, and status `143`. Use deadline-based short polling rather than a fixed long sleep.
   - Run `cd typescript && bun test tests/integration/notify-cli.test.ts`; confirm failure before adding the entry adapter, then implement `typescript/scripts/notify.ts` and rerun to green.

6. **Build and installer integration**
   - Extend `install-user.test.ts` first to expect `build:notify`; run it and confirm failure.
   - Add `build-notify.ts`, package scripts, ignore rule, knip entry, and installer invocation; rerun the installer test.
   - Run `cd typescript && bun run build:notify`; verify `../scripts/notify` is a standalone executable and has executable mode bits.

7. **Documentation and full verification**
   - Update both README files after behavior is green.
   - Run `cd typescript && bun test lib/ scripts/ tests/integration/notify-cli.test.ts`.
   - Run `cd typescript && bun run type-check`.
   - Run `cd typescript && bun run knip`.
   - Run `cd typescript && bun run build`.
   - Run `git status --short --ignored` and confirm `scripts/notify` is ignored, only intended source/docs/plan files are tracked, and no test fixture or temporary audio file remains.

## Acceptance Criteria

- All documented valid forms work; all invalid forms fail with status `2` before side effects.
- Commands execute directly with exact argv and interactive streams, environment, and directory preserved.
- Visual notification precedes exactly one successful audio path.
- Explicit messages always choose TTS and never MP3; absent messages use project MP3, global MP3, then TTS.
- Project playback failure advances to global playback, then TTS; all delivery failures warn without changing the invocation status.
- macOS and Linux use the specified backend order and do not invoke a shell with user-controlled text.
- Normal, failed, signaled, interrupted, and unlaunchable commands all notify and return the specified status.
- Audio is awaited before exit.
- `ai install --scope user` builds and installs executable `notify` with the existing utility-scripts selection.
- Targeted tests, full relevant tests, type-checking, dependency analysis, and the complete build pass.
