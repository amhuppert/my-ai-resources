import { describe, expect, test } from "bun:test";
import {
  HELP_TEXT,
  formatNotification,
  parseNotifyArgs,
  runNotify,
  type CommandOutcome,
  type FileProbe,
  type NotifyRuntime,
  type NotifyRequest,
  type ProcessCompletion,
  type RelayedSignal,
  type RunningProcess,
  type SpawnIo,
} from "./notify";

class FakeNotifyRuntime implements NotifyRuntime {
  platform: NodeJS.Platform = "darwin";
  cwd = "/work/project";
  homeDir = "/home/alex";
  env: NodeJS.ProcessEnv = { TEST_ENV: "yes" };
  executables = new Map<string, string>();
  files = new Map<string, FileProbe>();
  results = new Map<string, ProcessCompletion>();
  spawns: Array<{
    argv: readonly [string, ...string[]];
    options: {
      readonly cwd: string;
      readonly env: NodeJS.ProcessEnv;
      readonly io: SpawnIo;
    };
  }> = [];
  probes: string[] = [];
  warnings: string[] = [];
  errors: string[] = [];
  events: string[] = [];
  signalHandlers = new Map<RelayedSignal, Set<() => void>>();
  spawnErrors = new Map<string, unknown>();
  processFactories = new Map<string, () => RunningProcess>();
  kills: NodeJS.Signals[] = [];

  which(name: string): string | null {
    return this.executables.get(name) ?? null;
  }

  probeFile(path: string): FileProbe {
    this.probes.push(path);
    return this.files.get(path) ?? { type: "missing" };
  }

  spawn(
    argv: readonly [string, ...string[]],
    options: {
      readonly cwd: string;
      readonly env: NodeJS.ProcessEnv;
      readonly io: SpawnIo;
    },
  ): RunningProcess {
    this.spawns.push({ argv, options });
    this.events.push(`spawn:${argv[0]}`);
    const key = JSON.stringify(argv);
    const spawnError = this.spawnErrors.get(key);
    if (spawnError !== undefined) throw spawnError;
    const factory = this.processFactories.get(key);
    if (factory !== undefined) return factory();
    const result = this.results.get(key) ?? {
      type: "exited",
      exitCode: 0,
      stderr: "",
    };
    return {
      completion: Promise.resolve(result),
      kill: (signal) => {
        this.kills.push(signal);
      },
    };
  }

  addSignalHandler(signal: RelayedSignal, handler: () => void): void {
    const handlers = this.signalHandlers.get(signal) ?? new Set();
    handlers.add(handler);
    this.signalHandlers.set(signal, handlers);
  }

  removeSignalHandler(signal: RelayedSignal, handler: () => void): void {
    this.signalHandlers.get(signal)?.delete(handler);
  }

  warn(message: string): void {
    this.warnings.push(message);
    this.events.push(`warning:${message}`);
  }

  error(message: string): void {
    this.errors.push(message);
    this.events.push(`error:${message}`);
  }

  install(...names: string[]): void {
    for (const name of names) {
      this.executables.set(name, `/usr/bin/${name}`);
    }
  }

  setFile(path: string): void {
    this.files.set(path, { type: "file" });
  }

  fail(argv: readonly [string, ...string[]], stderr = "backend failed"): void {
    this.results.set(JSON.stringify(argv), {
      type: "exited",
      exitCode: 1,
      stderr,
    });
  }

  trigger(signal: RelayedSignal): void {
    for (const handler of this.signalHandlers.get(signal) ?? []) handler();
  }
}

describe("parseNotifyArgs", () => {
  test("parses immediate notification without a message", () => {
    expect(parseNotifyArgs([])).toEqual({
      type: "run",
      request: { type: "immediate" },
    });
  });

  test.each([
    [["-m", "  Build finished  "], "Build finished"],
    [["--message", "Ready ✅"], "Ready ✅"],
  ] as const)("parses and trims an explicit message", (argv, message) => {
    expect(parseNotifyArgs(argv)).toEqual({
      type: "run",
      request: { type: "immediate", message },
    });
  });

  test.each([
    [["-a", "sounds/complete.wav"], "sounds/complete.wav"],
    [["--audio", "/tmp/custom alert.ogg"], "/tmp/custom alert.ogg"],
  ] as const)("parses a custom audio path", (argv, audioPath) => {
    expect(parseNotifyArgs(argv)).toEqual({
      type: "run",
      request: { type: "immediate", audioPath },
    });
  });

  test("preserves every command argument after the delimiter", () => {
    expect(
      parseNotifyArgs([
        "--",
        "/usr/bin/printf",
        "%s %s",
        "hello world",
        "--message",
        "$HOME",
      ]),
    ).toEqual({
      type: "run",
      request: {
        type: "command",
        command: "/usr/bin/printf",
        args: ["%s %s", "hello world", "--message", "$HOME"],
      },
    });
  });

  test("parses a message before a wrapped command", () => {
    expect(
      parseNotifyArgs(["-m", " Tests done ", "--", "bun", "test"]),
    ).toEqual({
      type: "run",
      request: {
        type: "command",
        message: "Tests done",
        command: "bun",
        args: ["test"],
      },
    });
  });

  test("parses audio and message options before a wrapped command", () => {
    expect(
      parseNotifyArgs([
        "--audio",
        "sounds/complete.wav",
        "-m",
        " Tests done ",
        "--",
        "bun",
        "test",
      ]),
    ).toEqual({
      type: "run",
      request: {
        type: "command",
        message: "Tests done",
        audioPath: "sounds/complete.wav",
        command: "bun",
        args: ["test"],
      },
    });
  });

  test.each([["-h"], ["--help"]])(
    "recognizes help before the delimiter",
    (...argv) => {
      expect(parseNotifyArgs(argv)).toEqual({ type: "help" });
    },
  );

  test("help describes command, delivery, platform, and status behavior", () => {
    for (const text of [
      "notify [-m MESSAGE] [-a FILE] -- COMMAND [ARG...]",
      "-a, --audio FILE",
      "passed through unchanged",
      "SIGHUP, SIGINT, and SIGTERM",
      '"Command succeeded"',
      "is the only audio file attempted",
      ".claude/notification.mp3",
      "~/.config/notify/notification.mp3",
      "macOS  visual: osascript",
      "Linux  visual: notify-send",
      "failure does not switch to another program",
      "synchronous and best effort",
      "127     COMMAND could not be started",
      "128+N   COMMAND ended by signal N, or notify relayed signal N",
    ]) {
      expect(HELP_TEXT).toContain(text);
    }
  });

  test("treats help after the delimiter as the command", () => {
    expect(parseNotifyArgs(["--", "--help"])).toEqual({
      type: "run",
      request: { type: "command", command: "--help", args: [] },
    });
  });

  test.each([
    {
      argv: ["echo", "hello"],
      message: "Commands must follow --",
    },
    {
      argv: ["--unknown"],
      message: "Unknown option: --unknown",
    },
    {
      argv: ["--message=value"],
      message: "Unknown option: --message=value",
    },
    {
      argv: ["-m"],
      message: "Missing value for -m",
    },
    {
      argv: ["--message", "--", "echo"],
      message: "Missing value for --message",
    },
    {
      argv: ["-m", "   "],
      message: "Message must not be blank",
    },
    {
      argv: ["-m", "one", "--message", "two"],
      message: "Message option may only be specified once",
    },
    {
      argv: ["-a"],
      message: "Missing value for -a",
    },
    {
      argv: ["--audio", "--", "echo"],
      message: "Missing value for --audio",
    },
    {
      argv: ["-a", "   "],
      message: "Audio path must not be blank",
    },
    {
      argv: ["-a", "one.wav", "--audio", "two.wav"],
      message: "Audio option may only be specified once",
    },
    {
      argv: ["--"],
      message: "Missing command after --",
    },
    {
      argv: ["--", ""],
      message: "Command must not be empty",
    },
  ])("rejects invalid syntax: $message", ({ argv, message }) => {
    expect(parseNotifyArgs(argv)).toEqual({ type: "error", message });
  });
});

describe("formatNotification", () => {
  test.each([
    [
      { type: "immediate" } satisfies NotifyRequest,
      { title: "Notification", body: "Notification" },
    ],
    [
      { type: "immediate", message: "Ready ✅" } satisfies NotifyRequest,
      { title: "Notification", body: "Ready ✅" },
    ],
  ])("formats immediate notification content", (request, expected) => {
    expect(formatNotification(request)).toEqual(expected);
  });

  test.each([
    [
      { type: "success" } satisfies CommandOutcome,
      { title: "Command succeeded", body: "bun finished successfully" },
    ],
    [
      { type: "exit-failure", exitCode: 7 } satisfies CommandOutcome,
      { title: "Command failed", body: "bun failed with exit code 7" },
    ],
    [
      { type: "signal", signal: "SIGTERM" } satisfies CommandOutcome,
      { title: "Command terminated", body: "bun terminated by SIGTERM" },
    ],
    [
      { type: "launch-failure" } satisfies CommandOutcome,
      { title: "Command failed", body: "bun could not be started" },
    ],
  ])("formats command outcome content", (outcome, expected) => {
    const request: NotifyRequest = {
      type: "command",
      command: "/usr/local/bin/bun",
      args: ["test", "--watch=false"],
    };

    expect(formatNotification(request, outcome)).toEqual(expected);
  });

  test("uses an explicit message as the body while retaining the outcome title", () => {
    const request: NotifyRequest = {
      type: "command",
      command: "bun",
      args: ["test"],
      message: "Tests are done",
    };

    expect(
      formatNotification(request, { type: "exit-failure", exitCode: 3 }),
    ).toEqual({ title: "Command failed", body: "Tests are done" });
  });

  test("requires an outcome for command requests", () => {
    const request: NotifyRequest = {
      type: "command",
      command: "bun",
      args: [],
    };

    expect(() => formatNotification(request)).toThrow(
      "Command outcome is required",
    );
  });
});

describe("runNotify delivery", () => {
  test("uses macOS visual notification followed by TTS for an explicit message", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say", "afplay");

    const status = await runNotify(
      { type: "immediate", message: "Ready ✅" },
      runtime,
    );

    expect(status).toBe(0);
    expect(runtime.spawns).toEqual([
      {
        argv: [
          "/usr/bin/osascript",
          "-e",
          "on run argv",
          "-e",
          "display notification (item 2 of argv) with title (item 1 of argv)",
          "-e",
          "end run",
          "--",
          "Notification",
          "Ready ✅",
        ],
        options: {
          cwd: "/work/project",
          env: { TEST_ENV: "yes" },
          io: { type: "capture" },
        },
      },
      {
        argv: ["/usr/bin/say"],
        options: {
          cwd: "/work/project",
          env: { TEST_ENV: "yes" },
          io: { type: "capture", stdinText: "Ready ✅" },
        },
      },
    ]);
    expect(runtime.probes).toEqual([]);
    expect(runtime.warnings).toEqual([]);
  });

  test("uses Linux visual and first available speech backend", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.platform = "linux";
    runtime.install("notify-send", "spd-say", "espeak");

    await runNotify({ type: "immediate", message: "Ready" }, runtime);

    expect(runtime.spawns.map(({ argv }) => argv)).toEqual([
      [
        "/usr/bin/notify-send",
        "--app-name=notify",
        "--",
        "Notification",
        "Ready",
      ],
      ["/usr/bin/spd-say", "--wait", "--", "Ready"],
    ]);
  });

  test("falls back from spd-say to espeak based on availability", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.platform = "linux";
    runtime.install("notify-send", "espeak");

    await runNotify({ type: "immediate", message: "Ready" }, runtime);

    expect(runtime.spawns.at(-1)).toEqual({
      argv: ["/usr/bin/espeak", "--stdin"],
      options: {
        cwd: "/work/project",
        env: { TEST_ENV: "yes" },
        io: { type: "capture", stdinText: "Ready" },
      },
    });
  });

  test("plays the project MP3 and stops the derived audio chain on success", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "afplay", "say");
    runtime.setFile("/work/project/.claude/notification.mp3");
    runtime.setFile("/home/alex/.config/notify/notification.mp3");

    await runNotify({ type: "immediate" }, runtime);

    expect(runtime.probes).toEqual(["/work/project/.claude/notification.mp3"]);
    expect(runtime.spawns.at(-1)?.argv).toEqual([
      "/usr/bin/afplay",
      "/work/project/.claude/notification.mp3",
    ]);
  });

  test("uses the global MP3 when the project MP3 is absent", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "afplay", "say");
    runtime.setFile("/home/alex/.config/notify/notification.mp3");

    await runNotify({ type: "immediate" }, runtime);

    expect(runtime.probes).toEqual([
      "/work/project/.claude/notification.mp3",
      "/home/alex/.config/notify/notification.mp3",
    ]);
    expect(runtime.spawns.at(-1)?.argv).toEqual([
      "/usr/bin/afplay",
      "/home/alex/.config/notify/notification.mp3",
    ]);
  });

  test("plays a requested audio file instead of defaults or message speech", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "afplay", "say");
    const requestedAudio = "/work/project/sounds/custom alert.wav";
    runtime.setFile(requestedAudio);
    runtime.setFile("/work/project/.claude/notification.mp3");
    runtime.setFile("/home/alex/.config/notify/notification.mp3");

    await runNotify(
      {
        type: "immediate",
        message: "Ready",
        audioPath: "sounds/custom alert.wav",
      },
      runtime,
    );

    expect(runtime.probes).toEqual([requestedAudio]);
    expect(runtime.spawns.map(({ argv }) => argv)).toEqual([
      expect.arrayContaining(["/usr/bin/osascript"]),
      ["/usr/bin/afplay", requestedAudio],
    ]);
    expect(runtime.warnings).toEqual([]);
  });

  test("speaks the body when a requested audio file cannot be found", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "afplay", "say");
    runtime.setFile("/work/project/.claude/notification.mp3");
    const requestedAudio = "/work/project/sounds/missing.wav";

    await runNotify(
      { type: "immediate", audioPath: "sounds/missing.wav" },
      runtime,
    );

    expect(runtime.probes).toEqual([requestedAudio]);
    expect(runtime.spawns.at(-1)).toEqual({
      argv: ["/usr/bin/say"],
      options: {
        cwd: "/work/project",
        env: { TEST_ENV: "yes" },
        io: { type: "capture", stdinText: "Notification" },
      },
    });
    expect(runtime.warnings).toEqual([
      `audio: ${requestedAudio}: file not found`,
    ]);
  });

  test("speaks the body when requested audio playback fails", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "afplay", "say");
    const requestedAudio = "/work/project/custom.wav";
    runtime.setFile(requestedAudio);
    runtime.fail(["/usr/bin/afplay", requestedAudio], "corrupt audio");

    await runNotify(
      { type: "immediate", message: "Ready", audioPath: requestedAudio },
      runtime,
    );

    expect(runtime.spawns.map(({ argv }) => argv).slice(1)).toEqual([
      ["/usr/bin/afplay", requestedAudio],
      ["/usr/bin/say"],
    ]);
    expect(runtime.warnings).toEqual(["audio: corrupt audio"]);
  });

  test("warns and tries the global MP3 after project playback fails", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "afplay", "say");
    const projectAudio = "/work/project/.claude/notification.mp3";
    const globalAudio = "/home/alex/.config/notify/notification.mp3";
    runtime.setFile(projectAudio);
    runtime.setFile(globalAudio);
    runtime.fail(["/usr/bin/afplay", projectAudio], "corrupt audio");

    await runNotify({ type: "immediate" }, runtime);

    expect(runtime.spawns.map(({ argv }) => argv).slice(1)).toEqual([
      ["/usr/bin/afplay", projectAudio],
      ["/usr/bin/afplay", globalAudio],
    ]);
    expect(runtime.warnings).toEqual(["audio: corrupt audio"]);
  });

  test("speaks the derived message after both MP3 files fail", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "afplay", "say");
    const projectAudio = "/work/project/.claude/notification.mp3";
    const globalAudio = "/home/alex/.config/notify/notification.mp3";
    runtime.setFile(projectAudio);
    runtime.setFile(globalAudio);
    runtime.fail(["/usr/bin/afplay", projectAudio], "project failed");
    runtime.fail(["/usr/bin/afplay", globalAudio], "global failed");

    await runNotify({ type: "immediate" }, runtime);

    expect(runtime.spawns.at(-1)).toEqual({
      argv: ["/usr/bin/say"],
      options: {
        cwd: "/work/project",
        env: { TEST_ENV: "yes" },
        io: { type: "capture", stdinText: "Notification" },
      },
    });
    expect(runtime.warnings).toEqual([
      "audio: project failed",
      "audio: global failed",
    ]);
  });

  test("warns once and falls back to TTS when files exist but no player is installed", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");
    runtime.setFile("/work/project/.claude/notification.mp3");
    runtime.setFile("/home/alex/.config/notify/notification.mp3");

    await runNotify({ type: "immediate" }, runtime);

    expect(runtime.spawns.map(({ argv }) => argv)).toEqual([
      expect.arrayContaining(["/usr/bin/osascript"]),
      ["/usr/bin/say"],
    ]);
    expect(runtime.warnings).toEqual([
      "audio: no supported audio player is installed",
    ]);
  });

  test("does not warn for absent optional files and speaks the derived message", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");

    await runNotify({ type: "immediate" }, runtime);

    expect(runtime.spawns.at(-1)?.argv).toEqual(["/usr/bin/say"]);
    expect(runtime.warnings).toEqual([]);
  });

  test("warns for a file lookup error and continues the audio chain", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");
    runtime.files.set("/work/project/.claude/notification.mp3", {
      type: "error",
      message: "permission denied",
    });

    await runNotify({ type: "immediate" }, runtime);

    expect(runtime.spawns.at(-1)?.argv).toEqual(["/usr/bin/say"]);
    expect(runtime.warnings).toEqual(["audio: permission denied"]);
  });

  test("does not try MP3 files when explicit-message TTS is unavailable", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "afplay");
    runtime.setFile("/work/project/.claude/notification.mp3");

    const status = await runNotify(
      { type: "immediate", message: "Ready" },
      runtime,
    );

    expect(status).toBe(0);
    expect(runtime.probes).toEqual([]);
    expect(runtime.warnings).toEqual([
      "speech: no supported text-to-speech command is installed",
    ]);
  });

  test("continues to audio and preserves status after visual delivery fails", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");
    runtime.fail(
      [
        "/usr/bin/osascript",
        "-e",
        "on run argv",
        "-e",
        "display notification (item 2 of argv) with title (item 1 of argv)",
        "-e",
        "end run",
        "--",
        "Notification",
        "Ready",
      ],
      "notifications disabled",
    );

    const status = await runNotify(
      { type: "immediate", message: "Ready" },
      runtime,
    );

    expect(status).toBe(0);
    expect(runtime.spawns.at(-1)?.argv).toEqual(["/usr/bin/say"]);
    expect(runtime.warnings).toEqual(["visual: notifications disabled"]);
  });

  test("selects ffplay over mpv and does not switch players after failure", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.platform = "linux";
    runtime.install("notify-send", "ffplay", "mpv", "espeak");
    const projectAudio = "/work/project/.claude/notification.mp3";
    runtime.setFile(projectAudio);
    runtime.fail(
      [
        "/usr/bin/ffplay",
        "-nostdin",
        "-nodisp",
        "-autoexit",
        "-loglevel",
        "quiet",
        projectAudio,
      ],
      "ffplay failed",
    );

    await runNotify({ type: "immediate" }, runtime);

    expect(runtime.spawns.map(({ argv }) => argv)).not.toContainEqual(
      expect.arrayContaining(["/usr/bin/mpv"]),
    );
    expect(runtime.spawns.at(-1)?.argv).toEqual(["/usr/bin/espeak", "--stdin"]);
  });
});

describe("runNotify wrapped commands", () => {
  test("runs the exact argv with inherited process context and returns success", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");
    const request: NotifyRequest = {
      type: "command",
      command: "/usr/bin/printf",
      args: ["%s", "hello world"],
      message: "Print finished",
    };

    const status = await runNotify(request, runtime);

    expect(status).toBe(0);
    expect(runtime.spawns[0]).toEqual({
      argv: ["/usr/bin/printf", "%s", "hello world"],
      options: {
        cwd: "/work/project",
        env: { TEST_ENV: "yes" },
        io: { type: "inherit" },
      },
    });
    expect(runtime.spawns[1]?.argv).toContain("Command succeeded");
    expect(runtime.spawns[1]?.argv).toContain("Print finished");
    expect(runtime.errors).toEqual([]);
    for (const signal of ["SIGHUP", "SIGINT", "SIGTERM"] as const) {
      expect(runtime.signalHandlers.get(signal)?.size).toBe(0);
    }
  });

  test("returns a nonzero child exit and shows the failed outcome", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");
    runtime.results.set(JSON.stringify(["bun", "test"]), {
      type: "exited",
      exitCode: 7,
      stderr: "",
    });

    const status = await runNotify(
      { type: "command", command: "bun", args: ["test"] },
      runtime,
    );

    expect(status).toBe(7);
    expect(runtime.spawns[1]?.argv).toContain("Command failed");
    expect(runtime.spawns[1]?.argv).toContain("bun failed with exit code 7");
  });

  test("maps a child-reported signal to 128 plus its signal number", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");
    runtime.results.set(JSON.stringify(["worker"]), {
      type: "signaled",
      signal: "SIGKILL",
      stderr: "",
    });

    const status = await runNotify(
      { type: "command", command: "worker", args: [] },
      runtime,
    );

    expect(status).toBe(137);
    expect(runtime.spawns[1]?.argv).toContain("Command terminated");
    expect(runtime.spawns[1]?.argv).toContain("worker terminated by SIGKILL");
  });

  test("notifies and returns 127 when the executable cannot launch", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");
    runtime.spawnErrors.set(
      JSON.stringify(["missing-command"]),
      new Error("ENOENT"),
    );

    const status = await runNotify(
      { type: "command", command: "missing-command", args: [] },
      runtime,
    );

    expect(status).toBe(127);
    expect(runtime.errors).toEqual(["failed to start missing-command: ENOENT"]);
    expect(runtime.spawns[1]?.argv).toContain("Command failed");
    expect(runtime.spawns[1]?.argv).toContain(
      "missing-command could not be started",
    );
  });

  test("relays a wrapper signal, notifies, and uses the first signal status", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");
    let settleChild: ((result: ProcessCompletion) => void) | undefined;
    const childCompletion = new Promise<ProcessCompletion>((resolve) => {
      settleChild = resolve;
    });
    runtime.processFactories.set(JSON.stringify(["worker"]), () => ({
      completion: childCompletion,
      kill: (signal) => {
        runtime.kills.push(signal);
      },
    }));

    const notification = runNotify(
      { type: "command", command: "worker", args: [] },
      runtime,
    );
    await Promise.resolve();

    runtime.trigger("SIGINT");
    runtime.trigger("SIGTERM");
    settleChild?.({ type: "exited", exitCode: 0, stderr: "" });
    const status = await notification;

    expect(runtime.kills).toEqual(["SIGINT", "SIGTERM"]);
    expect(status).toBe(130);
    expect(runtime.spawns[1]?.argv).toContain("Command terminated");
    expect(runtime.spawns[1]?.argv).toContain("worker terminated by SIGINT");
    for (const signal of ["SIGHUP", "SIGINT", "SIGTERM"] as const) {
      expect(runtime.signalHandlers.get(signal)?.size).toBe(0);
    }
  });

  test("warns when signal relay fails but still notifies", async () => {
    const runtime = new FakeNotifyRuntime();
    runtime.install("osascript", "say");
    let settleChild: ((result: ProcessCompletion) => void) | undefined;
    const childCompletion = new Promise<ProcessCompletion>((resolve) => {
      settleChild = resolve;
    });
    runtime.processFactories.set(JSON.stringify(["worker"]), () => ({
      completion: childCompletion,
      kill: () => {
        throw new Error("permission denied");
      },
    }));

    const notification = runNotify(
      { type: "command", command: "worker", args: [] },
      runtime,
    );
    await Promise.resolve();
    runtime.trigger("SIGHUP");
    settleChild?.({ type: "exited", exitCode: 0, stderr: "" });

    expect(await notification).toBe(129);
    expect(runtime.warnings).toContain(
      "signal: failed to relay SIGHUP: permission denied",
    );
  });
});
