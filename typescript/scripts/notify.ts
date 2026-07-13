#!/usr/bin/env bun

import { accessSync, constants as fsConstants, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { isAbsolute, resolve } from "node:path";
import {
  HELP_TEXT,
  parseNotifyArgs,
  runNotify,
  type FileProbe,
  type NotifyRuntime,
  type ProcessCompletion,
  type RelayedSignal,
  type RunningProcess,
  type SpawnIo,
} from "@/lib/notify.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

function processCompletion(
  exitCode: number,
  signal: NodeJS.Signals | null | undefined,
  stderr: string,
): ProcessCompletion {
  return signal === null || signal === undefined
    ? { type: "exited", exitCode, stderr }
    : { type: "signaled", signal, stderr };
}

function spawnInherited(
  argv: readonly [string, ...string[]],
  options: {
    readonly cwd: string;
    readonly env: NodeJS.ProcessEnv;
  },
): RunningProcess {
  const command = argv[0];
  if (command.includes("/")) {
    accessSync(
      isAbsolute(command) ? command : resolve(options.cwd, command),
      fsConstants.X_OK,
    );
  } else if (Bun.which(command) === null) {
    throw new Error(`command not found: ${command}`);
  }

  const proc = Bun.spawn([...argv], {
    cwd: options.cwd,
    env: options.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return {
    completion: proc.exited.then((exitCode) =>
      processCompletion(exitCode, proc.signalCode, ""),
    ),
    kill: (signal) => proc.kill(signal),
  };
}

function spawnCaptured(
  argv: readonly [string, ...string[]],
  options: {
    readonly cwd: string;
    readonly env: NodeJS.ProcessEnv;
  },
  io: Extract<SpawnIo, { readonly type: "capture" }>,
): RunningProcess {
  if (io.stdinText !== undefined) {
    const proc = Bun.spawn([...argv], {
      cwd: options.cwd,
      env: options.env,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    proc.stdin.write(io.stdinText);
    const stdinClosed = Promise.resolve(proc.stdin.end());
    return {
      completion: Promise.all([
        stdinClosed,
        proc.exited,
        new Response(proc.stdout).arrayBuffer(),
        new Response(proc.stderr).text(),
      ]).then(([_stdinClosed, exitCode, _stdout, stderr]) =>
        processCompletion(exitCode, proc.signalCode, stderr),
      ),
      kill: (signal) => proc.kill(signal),
    };
  }

  const proc = Bun.spawn([...argv], {
    cwd: options.cwd,
    env: options.env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    completion: Promise.all([
      proc.exited,
      new Response(proc.stdout).arrayBuffer(),
      new Response(proc.stderr).text(),
    ]).then(([exitCode, _stdout, stderr]) =>
      processCompletion(exitCode, proc.signalCode, stderr),
    ),
    kill: (signal) => proc.kill(signal),
  };
}

export function createNotifyRuntime(): NotifyRuntime {
  return {
    platform: platform(),
    cwd: process.cwd(),
    homeDir: homedir(),
    env: process.env,
    which: (name) => Bun.which(name),
    probeFile: (path): FileProbe => {
      try {
        return statSync(path).isFile()
          ? { type: "file" }
          : { type: "error", message: `${path} is not a regular file` };
      } catch (error) {
        return errorCode(error) === "ENOENT"
          ? { type: "missing" }
          : { type: "error", message: `${path}: ${errorMessage(error)}` };
      }
    },
    spawn: (argv, options) =>
      options.io.type === "inherit"
        ? spawnInherited(argv, options)
        : spawnCaptured(argv, options, options.io),
    addSignalHandler: (signal: RelayedSignal, handler: () => void) => {
      process.on(signal, handler);
    },
    removeSignalHandler: (signal: RelayedSignal, handler: () => void) => {
      process.off(signal, handler);
    },
    warn: (message) => {
      console.error(`notify: warning: ${message}`);
    },
    error: (message) => {
      console.error(`notify: ${message}`);
    },
  };
}

export async function main(
  argv: readonly string[],
  runtime: NotifyRuntime,
): Promise<number> {
  const parsed = parseNotifyArgs(argv);
  if (parsed.type === "help") {
    console.log(HELP_TEXT);
    return 0;
  }
  if (parsed.type === "error") {
    runtime.error(parsed.message);
    console.error(HELP_TEXT);
    return 2;
  }
  if (runtime.platform !== "darwin" && runtime.platform !== "linux") {
    runtime.error(`unsupported platform: ${runtime.platform}`);
    return 1;
  }
  return runNotify(parsed.request, runtime);
}

if (import.meta.main) {
  try {
    process.exitCode = await main(process.argv.slice(2), createNotifyRuntime());
  } catch (error) {
    console.error(`notify: ${errorMessage(error)}`);
    process.exitCode = 1;
  }
}
