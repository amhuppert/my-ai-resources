import { basename, join } from "node:path";
import { constants as osConstants } from "node:os";

export type NotifyRequest =
  | { readonly type: "immediate"; readonly message?: string }
  | {
      readonly type: "command";
      readonly message?: string;
      readonly command: string;
      readonly args: readonly string[];
    };

export type ParseResult =
  | { readonly type: "run"; readonly request: NotifyRequest }
  | { readonly type: "help" }
  | { readonly type: "error"; readonly message: string };

export type CommandOutcome =
  | { readonly type: "success" }
  | { readonly type: "exit-failure"; readonly exitCode: number }
  | { readonly type: "signal"; readonly signal: NodeJS.Signals }
  | { readonly type: "launch-failure" };

export interface NotificationContent {
  readonly title: string;
  readonly body: string;
}

export type RelayedSignal = "SIGHUP" | "SIGINT" | "SIGTERM";

export type ProcessCompletion =
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

export type FileProbe =
  | { readonly type: "missing" }
  | { readonly type: "file" }
  | { readonly type: "error"; readonly message: string };

export type SpawnIo =
  | { readonly type: "inherit" }
  | { readonly type: "capture"; readonly stdinText?: string };

export interface RunningProcess {
  readonly completion: Promise<ProcessCompletion>;
  kill(signal: NodeJS.Signals): void;
}

export interface NotifyRuntime {
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

interface BackendCommand {
  readonly argv: readonly [string, ...string[]];
  readonly stdinText?: string;
}

export const HELP_TEXT = `Usage:
  notify [-m MESSAGE]
  notify [-m MESSAGE] -- COMMAND [ARG...]

Options:
  -m, --message MESSAGE  Notification message
  -h, --help             Show this help`;

export function parseNotifyArgs(argv: readonly string[]): ParseResult {
  let message: string | undefined;
  let index = 0;

  while (index < argv.length) {
    const argument = argv[index];

    if (argument === "--") {
      const command = argv[index + 1];
      if (command === undefined) {
        return { type: "error", message: "Missing command after --" };
      }
      if (command.length === 0) {
        return { type: "error", message: "Command must not be empty" };
      }

      const request: NotifyRequest = {
        type: "command",
        command,
        args: argv.slice(index + 2),
        ...(message === undefined ? {} : { message }),
      };
      return { type: "run", request };
    }

    if (argument === "-h" || argument === "--help") {
      return { type: "help" };
    }

    if (argument === "-m" || argument === "--message") {
      if (message !== undefined) {
        return {
          type: "error",
          message: "Message option may only be specified once",
        };
      }

      const value = argv[index + 1];
      if (value === undefined || value === "--") {
        return { type: "error", message: `Missing value for ${argument}` };
      }

      message = value.trim();
      if (message.length === 0) {
        return { type: "error", message: "Message must not be blank" };
      }

      index += 2;
      continue;
    }

    if (argument?.startsWith("-")) {
      return { type: "error", message: `Unknown option: ${argument}` };
    }

    return { type: "error", message: "Commands must follow --" };
  }

  const request: NotifyRequest = {
    type: "immediate",
    ...(message === undefined ? {} : { message }),
  };
  return { type: "run", request };
}

export function formatNotification(
  request: NotifyRequest,
  outcome?: CommandOutcome,
): NotificationContent {
  if (request.type === "immediate") {
    return {
      title: "Notification",
      body: request.message ?? "Notification",
    };
  }

  if (outcome === undefined) {
    throw new Error("Command outcome is required");
  }

  const command = basename(request.command);
  switch (outcome.type) {
    case "success":
      return {
        title: "Command succeeded",
        body: request.message ?? `${command} finished successfully`,
      };
    case "exit-failure":
      return {
        title: "Command failed",
        body:
          request.message ??
          `${command} failed with exit code ${outcome.exitCode}`,
      };
    case "signal":
      return {
        title: "Command terminated",
        body: request.message ?? `${command} terminated by ${outcome.signal}`,
      };
    case "launch-failure":
      return {
        title: "Command failed",
        body: request.message ?? `${command} could not be started`,
      };
  }
}

function firstAvailable(
  runtime: NotifyRuntime,
  names: readonly string[],
): { readonly name: string; readonly path: string } | undefined {
  for (const name of names) {
    const path = runtime.which(name);
    if (path !== null) return { name, path };
  }
  return undefined;
}

function visualCommand(
  content: NotificationContent,
  runtime: NotifyRuntime,
): BackendCommand | undefined {
  if (runtime.platform === "darwin") {
    const executable = runtime.which("osascript");
    if (executable === null) return undefined;
    return {
      argv: [
        executable,
        "-e",
        "on run argv",
        "-e",
        "display notification (item 2 of argv) with title (item 1 of argv)",
        "-e",
        "end run",
        "--",
        content.title,
        content.body,
      ],
    };
  }

  const executable = runtime.which("notify-send");
  if (executable === null) return undefined;
  return {
    argv: [executable, "--app-name=notify", "--", content.title, content.body],
  };
}

function speechCommand(
  body: string,
  runtime: NotifyRuntime,
): BackendCommand | undefined {
  if (runtime.platform === "darwin") {
    const executable = runtime.which("say");
    if (executable === null) return undefined;
    return { argv: [executable], stdinText: body };
  }

  const backend = firstAvailable(runtime, ["spd-say", "espeak"]);
  if (backend?.name === "spd-say") {
    return { argv: [backend.path, "--wait", "--", body] };
  }
  if (backend?.name === "espeak") {
    return { argv: [backend.path, "--stdin"], stdinText: body };
  }
  return undefined;
}

function mp3Command(
  path: string,
  backend: { readonly name: string; readonly path: string },
): BackendCommand {
  switch (backend.name) {
    case "afplay":
      return { argv: [backend.path, path] };
    case "ffplay":
      return {
        argv: [
          backend.path,
          "-nostdin",
          "-nodisp",
          "-autoexit",
          "-loglevel",
          "quiet",
          path,
        ],
      };
    case "mpv":
      return {
        argv: [backend.path, "--no-video", "--really-quiet", "--", path],
      };
    default:
      throw new Error(`Unsupported MP3 backend: ${backend.name}`);
  }
}

function mp3Backend(
  runtime: NotifyRuntime,
): { readonly name: string; readonly path: string } | undefined {
  return runtime.platform === "darwin"
    ? firstAvailable(runtime, ["afplay"])
    : firstAvailable(runtime, ["ffplay", "mpv"]);
}

function diagnosticFor(
  executable: string,
  completion: ProcessCompletion,
): string {
  const stderr = completion.stderr.trim();
  if (stderr.length > 0) return stderr;
  if (completion.type === "signaled") {
    return `${basename(executable)} terminated by ${completion.signal}`;
  }
  return `${basename(executable)} exited with status ${completion.exitCode}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function attemptBackend(
  channel: "audio" | "speech" | "visual",
  command: BackendCommand,
  runtime: NotifyRuntime,
): Promise<boolean> {
  try {
    const process = runtime.spawn(command.argv, {
      cwd: runtime.cwd,
      env: runtime.env,
      io:
        command.stdinText === undefined
          ? { type: "capture" }
          : { type: "capture", stdinText: command.stdinText },
    });
    const completion = await process.completion;
    if (completion.type === "exited" && completion.exitCode === 0) {
      return true;
    }
    runtime.warn(`${channel}: ${diagnosticFor(command.argv[0], completion)}`);
    return false;
  } catch (error) {
    runtime.warn(`${channel}: ${errorMessage(error)}`);
    return false;
  }
}

async function deliverVisual(
  content: NotificationContent,
  runtime: NotifyRuntime,
): Promise<void> {
  const command = visualCommand(content, runtime);
  if (command === undefined) {
    runtime.warn(
      "visual: no supported native notification command is installed",
    );
    return;
  }
  await attemptBackend("visual", command, runtime);
}

async function deliverSpeech(
  body: string,
  runtime: NotifyRuntime,
): Promise<void> {
  const command = speechCommand(body, runtime);
  if (command === undefined) {
    runtime.warn("speech: no supported text-to-speech command is installed");
    return;
  }
  await attemptBackend("speech", command, runtime);
}

async function deliverDerivedAudio(
  body: string,
  runtime: NotifyRuntime,
): Promise<void> {
  const paths = [
    join(runtime.cwd, ".claude", "notification.mp3"),
    join(runtime.homeDir, ".config", "notify", "notification.mp3"),
  ];
  let backend: { readonly name: string; readonly path: string } | undefined;
  let reportedMissingPlayer = false;

  for (const path of paths) {
    const probe = runtime.probeFile(path);
    if (probe.type === "missing") continue;
    if (probe.type === "error") {
      runtime.warn(`audio: ${probe.message}`);
      continue;
    }

    backend ??= mp3Backend(runtime);
    if (backend === undefined) {
      if (!reportedMissingPlayer) {
        runtime.warn("audio: no supported MP3 player is installed");
        reportedMissingPlayer = true;
      }
      break;
    }

    const succeeded = await attemptBackend(
      "audio",
      mp3Command(path, backend),
      runtime,
    );
    if (succeeded) return;
  }

  await deliverSpeech(body, runtime);
}

const RELAYED_SIGNALS: readonly RelayedSignal[] = [
  "SIGHUP",
  "SIGINT",
  "SIGTERM",
];

function signalStatus(signal: NodeJS.Signals): number {
  const signalNumber = osConstants.signals[signal];
  if (signalNumber === undefined) {
    throw new Error(`Unknown signal: ${signal}`);
  }
  return 128 + signalNumber;
}

function outcomeStatus(outcome: CommandOutcome): number {
  switch (outcome.type) {
    case "success":
      return 0;
    case "exit-failure":
      return outcome.exitCode;
    case "signal":
      return signalStatus(outcome.signal);
    case "launch-failure":
      return 127;
  }
}

function isNoSuchProcessError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ESRCH"
  );
}

async function runCommand(
  request: Extract<NotifyRequest, { readonly type: "command" }>,
  runtime: NotifyRuntime,
): Promise<CommandOutcome> {
  let child: RunningProcess;
  try {
    child = runtime.spawn([request.command, ...request.args], {
      cwd: runtime.cwd,
      env: runtime.env,
      io: { type: "inherit" },
    });
  } catch (error) {
    runtime.error(
      `failed to start ${basename(request.command)}: ${errorMessage(error)}`,
    );
    return { type: "launch-failure" };
  }

  let firstRelayedSignal: RelayedSignal | undefined;
  let childIsActive = true;
  const handlers = new Map<RelayedSignal, () => void>();

  for (const signal of RELAYED_SIGNALS) {
    const handler = (): void => {
      firstRelayedSignal ??= signal;
      if (!childIsActive) return;
      try {
        child.kill(signal);
      } catch (error) {
        if (!isNoSuchProcessError(error)) {
          runtime.warn(
            `signal: failed to relay ${signal}: ${errorMessage(error)}`,
          );
        }
      }
    };
    handlers.set(signal, handler);
    runtime.addSignalHandler(signal, handler);
  }

  let completion: ProcessCompletion;
  try {
    completion = await child.completion;
  } finally {
    childIsActive = false;
    for (const [signal, handler] of handlers) {
      runtime.removeSignalHandler(signal, handler);
    }
  }

  if (firstRelayedSignal !== undefined) {
    return { type: "signal", signal: firstRelayedSignal };
  }
  if (completion.type === "signaled") {
    return { type: "signal", signal: completion.signal };
  }
  return completion.exitCode === 0
    ? { type: "success" }
    : { type: "exit-failure", exitCode: completion.exitCode };
}

async function deliver(
  request: NotifyRequest,
  content: NotificationContent,
  runtime: NotifyRuntime,
): Promise<void> {
  await deliverVisual(content, runtime);
  if (request.message !== undefined) {
    await deliverSpeech(content.body, runtime);
  } else {
    await deliverDerivedAudio(content.body, runtime);
  }
}

export async function runNotify(
  request: NotifyRequest,
  runtime: NotifyRuntime,
): Promise<number> {
  if (runtime.platform !== "darwin" && runtime.platform !== "linux") {
    throw new Error(`Unsupported platform: ${runtime.platform}`);
  }
  if (request.type === "immediate") {
    const content = formatNotification(request);
    await deliver(request, content, runtime);
    return 0;
  }

  const outcome = await runCommand(request, runtime);
  const content = formatNotification(request, outcome);
  await deliver(request, content, runtime);
  return outcomeStatus(outcome);
}
