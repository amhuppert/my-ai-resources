import {
  afterEach,
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TYPESCRIPT_DIR = join(import.meta.dir, "..", "..");
const CLI_SOURCE = join(TYPESCRIPT_DIR, "scripts", "notify.ts");
const buildDir = mkdtempSync(join(tmpdir(), "notify-cli-build-"));
const CLI = join(buildDir, "notify");

setDefaultTimeout(15_000);

beforeAll(() => {
  const result = Bun.spawnSync(
    [process.execPath, "build", "--compile", CLI_SOURCE, "--outfile", CLI],
    { cwd: TYPESCRIPT_DIR, stdout: "pipe", stderr: "pipe" },
  );
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString());
  }
});

afterAll(() => {
  rmSync(buildDir, { recursive: true, force: true });
});

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

describe("notify CLI", () => {
  let tempDir: string;
  let binDir: string;
  let projectDir: string;
  let homeDir: string;
  let logPath: string;

  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `notify-cli-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    binDir = join(tempDir, "bin");
    projectDir = join(tempDir, "project");
    homeDir = join(tempDir, "home");
    logPath = join(tempDir, "backend.log");
    mkdirSync(binDir, { recursive: true });
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(homeDir, { recursive: true });
    projectDir = realpathSync(projectDir);

    for (const executable of ["osascript", "notify-send"]) {
      writeExecutable(
        executable,
        '#!/bin/sh\nprintf "visual\\n" >> "$NOTIFY_TEST_LOG"\n',
      );
    }
    for (const executable of ["say", "espeak"]) {
      writeExecutable(
        executable,
        '#!/bin/sh\nbody=$(/bin/cat)\nprintf "speech:%s\\n" "$body" >> "$NOTIFY_TEST_LOG"\n',
      );
    }
    writeExecutable(
      "spd-say",
      '#!/bin/sh\nfor value do body=$value; done\nprintf "speech:%s\\n" "$body" >> "$NOTIFY_TEST_LOG"\n',
    );
    for (const executable of ["afplay", "ffplay", "mpv"]) {
      writeExecutable(
        executable,
        '#!/bin/sh\nfor value do audio=$value; done\nprintf "audio:%s\\n" "$audio" >> "$NOTIFY_TEST_LOG"\n',
      );
    }
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeExecutable(name: string, contents: string): void {
    const path = join(binDir, name);
    writeFileSync(path, contents);
    chmodSync(path, 0o755);
  }

  function backendLog(): string[] {
    if (!existsSync(logPath)) return [];
    return readFileSync(logPath, "utf8").trim().split("\n");
  }

  async function runCli(
    args: readonly string[],
    options: { readonly cwd?: string } = {},
  ): Promise<CliResult> {
    const proc = Bun.spawn([CLI, ...args], {
      cwd: options.cwd ?? projectDir,
      env: {
        ...process.env,
        HOME: homeDir,
        PATH: binDir,
        NOTIFY_TEST_LOG: logPath,
      },
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    return { exitCode, stdout, stderr };
  }

  test("notifies immediately with an explicit message", async () => {
    const result = await runCli(["-m", "Ready"]);

    expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" });
    expect(backendLog()).toEqual(["visual", "speech:Ready"]);
  });

  test("prints complete help without notifying", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Command execution:");
    expect(result.stdout).toContain("Notification content:");
    expect(result.stdout).toContain("-a, --audio FILE");
    expect(result.stdout).toContain("Audio selection:");
    expect(result.stdout).toContain("Backends:");
    expect(result.stdout).toContain("Exit status:");
    expect(backendLog()).toEqual([]);
  });

  test("rejects a bare command before producing side effects", async () => {
    const result = await runCli(["echo", "hello"]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("notify: Commands must follow --");
    expect(result.stderr).toContain("Usage:");
    expect(backendLog()).toEqual([]);
  });

  test("passes through child output and mirrors a nonzero exit", async () => {
    const result = await runCli([
      "-m",
      "Tests done",
      "--",
      "/bin/sh",
      "-c",
      'printf "child stdout\\n"; printf "child stderr\\n" >&2; exit 7',
    ]);

    expect(result.exitCode).toBe(7);
    expect(result.stdout).toBe("child stdout\n");
    expect(result.stderr).toBe("child stderr\n");
    expect(backendLog()).toEqual(["visual", "speech:Tests done"]);
  });

  test("notifies and returns 127 when a command cannot launch", async () => {
    const result = await runCli(["--", "definitely-missing-command"]);

    expect(result.exitCode).toBe(127);
    expect(result.stderr).toContain(
      "notify: failed to start definitely-missing-command:",
    );
    expect(backendLog()).toEqual([
      "visual",
      "speech:definitely-missing-command could not be started",
    ]);
  });

  test("prefers the project MP3 over the global MP3", async () => {
    const projectAudio = join(projectDir, ".claude", "notification.mp3");
    const globalAudio = join(homeDir, ".config", "notify", "notification.mp3");
    mkdirSync(join(projectDir, ".claude"), { recursive: true });
    mkdirSync(join(homeDir, ".config", "notify"), { recursive: true });
    writeFileSync(projectAudio, "project audio");
    writeFileSync(globalAudio, "global audio");

    const result = await runCli([]);

    expect(result.exitCode).toBe(0);
    expect(backendLog()).toEqual(["visual", `audio:${projectAudio}`]);
  });

  test("plays a requested relative audio file instead of defaults or speech", async () => {
    const audioDir = join(projectDir, "sounds");
    const requestedAudio = join(audioDir, "custom alert.wav");
    const projectAudio = join(projectDir, ".claude", "notification.mp3");
    mkdirSync(audioDir, { recursive: true });
    mkdirSync(join(projectDir, ".claude"), { recursive: true });
    writeFileSync(requestedAudio, "custom audio");
    writeFileSync(projectAudio, "project audio");

    const result = await runCli([
      "-m",
      "Ready",
      "--audio",
      "sounds/custom alert.wav",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(backendLog()).toEqual(["visual", `audio:${requestedAudio}`]);
  });

  test("an explicit message suppresses configured MP3 files", async () => {
    const projectAudio = join(projectDir, ".claude", "notification.mp3");
    mkdirSync(join(projectDir, ".claude"), { recursive: true });
    writeFileSync(projectAudio, "project audio");

    const result = await runCli(["--message", "Use speech"]);

    expect(result.exitCode).toBe(0);
    expect(backendLog()).toEqual(["visual", "speech:Use speech"]);
  });

  test("relays SIGTERM to the child, notifies, and exits 143", async () => {
    const markerPath = join(tempDir, "child-started");
    const proc = Bun.spawn(
      [
        CLI,
        "-m",
        "Worker stopped",
        "--",
        "/bin/sh",
        "-c",
        'printf ready > "$NOTIFY_CHILD_MARKER"; trap "exit 0" TERM; while :; do /bin/sleep 1; done',
      ],
      {
        cwd: projectDir,
        env: {
          ...process.env,
          HOME: homeDir,
          PATH: binDir,
          NOTIFY_TEST_LOG: logPath,
          NOTIFY_CHILD_MARKER: markerPath,
        },
        stdin: "ignore",
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const deadline = Date.now() + 3_000;
    while (!existsSync(markerPath) && Date.now() < deadline) {
      await Bun.sleep(10);
    }
    expect(existsSync(markerPath)).toBe(true);

    proc.kill("SIGTERM");
    const [exitCode, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stderr).text(),
      new Response(proc.stdout).text(),
    ]).then(([code, error]) => [code, error] as const);

    expect(exitCode).toBe(143);
    expect(stderr).toBe("");
    expect(backendLog()).toEqual(["visual", "speech:Worker stopped"]);
  });
});
