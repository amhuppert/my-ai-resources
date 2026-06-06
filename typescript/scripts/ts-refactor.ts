#!/usr/bin/env bun

import { createInterface } from "node:readline";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import { applyEditPlan } from "@/lib/ts-refactor/apply.js";
import { TsMorphEngine } from "@/lib/ts-refactor/engine/ts-morph-engine.js";
import {
  exitCodeForError,
  summarizeApply,
  summarizePlan,
} from "@/lib/ts-refactor/reporter.js";
import { positionToOffset } from "@/lib/ts-refactor/position.js";
import { dispatch, runServeLoop } from "@/lib/ts-refactor/protocol.js";
import { Session } from "@/lib/ts-refactor/session.js";
import { parseEditPlan, serializeEditPlan, type EditPlan } from "@/lib/ts-refactor/types.js";

type OutputFormat = "json" | "diff" | "both";

function readFileText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function logStderr(message: string): void {
  process.stderr.write(`${message}\n`);
}

function writeStdout(message: string): void {
  process.stdout.write(`${message}\n`);
}

function parseFormat(raw: string | undefined): OutputFormat {
  if (raw === undefined) return "json";
  if (raw === "json" || raw === "diff" || raw === "both") return raw;
  logStderr(`Invalid --format "${raw}"; expected json, diff, or both`);
  process.exit(2);
}

function newSession(tsconfigPath: string, projectRoot: string): Session {
  return new Session(new TsMorphEngine(), {
    readFileText,
    loadOptions: { tsconfigPath: resolve(tsconfigPath) },
    displayRoot: projectRoot,
  });
}

function renderPlan(plan: EditPlan, format: OutputFormat): void {
  if (format === "json") {
    writeStdout(serializeEditPlan(plan));
    return;
  }
  if (format === "diff") {
    writeStdout(plan.unifiedDiff);
    return;
  }
  writeStdout(serializeEditPlan(plan));
  writeStdout(plan.unifiedDiff);
}

interface PlanOnlyOptions {
  plan: EditPlan;
  apply: boolean;
  allowStale: boolean;
  planOut: string | undefined;
  format: OutputFormat;
}

// Print/persist a plan, and apply it only when --apply is set. Plan-only is the
// default for every mutating command (R3.1); --plan-out writes JSON without
// applying (R3.4). Plan rendering goes to stdout; warnings/progress to stderr.
async function emitPlan(options: PlanOnlyOptions): Promise<number> {
  const { plan } = options;

  // Agent-facing triage (operation, counts, scope, heuristic warnings) to
  // stderr; the machine-readable plan goes to stdout via renderPlan.
  logStderr(summarizePlan(plan));

  if (options.planOut !== undefined) {
    writeFileSync(options.planOut, serializeEditPlan(plan), "utf8");
    logStderr(`Wrote plan to ${options.planOut}`);
  }

  renderPlan(plan, options.format);

  if (!options.apply) {
    return 0;
  }

  const result = await applyEditPlan(plan, {
    allowStale: options.allowStale,
    warn: logStderr,
  });
  logStderr(summarizeApply(result));
  return 0;
}

function projectRootOf(tsconfigPath: string): string {
  return dirname(resolve(tsconfigPath));
}

function resolveRenameOffset(
  filePath: string,
  positionRaw: string | undefined,
  offsetRaw: string | undefined,
): number {
  if (positionRaw !== undefined && offsetRaw !== undefined) {
    logStderr("rename accepts exactly one of --position or --offset, not both");
    process.exit(2);
  }
  if (positionRaw === undefined && offsetRaw === undefined) {
    logStderr("rename requires --position <line:col> or --offset <n>");
    process.exit(2);
  }

  if (offsetRaw !== undefined) {
    const offset = Number(offsetRaw);
    if (!Number.isInteger(offset) || offset < 0) {
      logStderr(`Invalid --offset "${offsetRaw}"; expected a non-negative integer`);
      process.exit(2);
    }
    return offset;
  }

  const match = /^(\d+):(\d+)$/.exec((positionRaw ?? "").trim());
  if (match === null) {
    logStderr(`Invalid --position "${positionRaw}"; expected line:col (e.g. 12:8)`);
    process.exit(2);
  }
  const line = Number(match[1]);
  const column = Number(match[2]);
  return positionToOffset(readFileText(resolve(filePath)), line, column);
}

async function runWithExitCode(fn: () => Promise<number>): Promise<void> {
  try {
    const code = await fn();
    process.exit(code);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStderr(`Error: ${message}`);
    process.exit(exitCodeForError(err));
  }
}

const program = new Command();

program
  .name("ts-refactor")
  .description("Semantic TypeScript refactors (rename, move) with plan/apply discipline")
  .version("1.0.0");

program
  .command("rename")
  .description("Rename a symbol at a position and update all references")
  .requiredOption("--file <path>", "file containing the symbol")
  .option("--position <line:col>", "1-based line:column of the symbol")
  .option("--offset <n>", "0-based UTF-16 offset of the symbol")
  .requiredOption("--to <name>", "new symbol name")
  .requiredOption("--project <tsconfig>", "path to the project tsconfig.json")
  .option("--apply", "write the plan to disk (default: plan-only)")
  .option("--plan-out <file>", "write the JSON plan to a file without applying")
  .option("--format <fmt>", "stdout rendering: json | diff | both", "json")
  .action(async (options) => {
    await runWithExitCode(async () => {
      const offset = resolveRenameOffset(options.file, options.position, options.offset);
      const session = newSession(options.project, projectRootOf(options.project));
      const plan = session.planRename({
        filePath: resolve(options.file),
        offset,
        newName: options.to,
      });
      return emitPlan({
        plan,
        apply: Boolean(options.apply),
        allowStale: false,
        planOut: options.planOut,
        format: parseFormat(options.format),
      });
    });
  });

program
  .command("move")
  .description("Move/rename one file and rewrite every importer")
  .requiredOption("--from <path>", "source file path")
  .requiredOption("--to <path>", "destination file path")
  .requiredOption("--project <tsconfig>", "path to the project tsconfig.json")
  .option("--apply", "write the plan to disk (default: plan-only)")
  .option("--plan-out <file>", "write the JSON plan to a file without applying")
  .option("--format <fmt>", "stdout rendering: json | diff | both", "json")
  .action(async (options) => {
    await runWithExitCode(async () => {
      const session = newSession(options.project, projectRootOf(options.project));
      const plan = session.planMove({
        from: resolve(options.from),
        to: resolve(options.to),
      });
      return emitPlan({
        plan,
        apply: Boolean(options.apply),
        allowStale: false,
        planOut: options.planOut,
        format: parseFormat(options.format),
      });
    });
  });

program
  .command("move-dir")
  .description("Move/rename a directory and rewrite every importer")
  .requiredOption("--from <dir>", "source directory path")
  .requiredOption("--to <dir>", "destination directory path")
  .requiredOption("--project <tsconfig>", "path to the project tsconfig.json")
  .option("--apply", "write the plan to disk (default: plan-only)")
  .option("--plan-out <file>", "write the JSON plan to a file without applying")
  .option("--format <fmt>", "stdout rendering: json | diff | both", "json")
  .action(async (options) => {
    await runWithExitCode(async () => {
      const session = newSession(options.project, projectRootOf(options.project));
      const plan = session.planMoveDir({
        from: resolve(options.from),
        to: resolve(options.to),
      });
      return emitPlan({
        plan,
        apply: Boolean(options.apply),
        allowStale: false,
        planOut: options.planOut,
        format: parseFormat(options.format),
      });
    });
  });

program
  .command("apply")
  .description("Commit a previously produced plan")
  .requiredOption("--plan <file>", "path to a JSON plan file")
  .option("--allow-stale", "relax content-staleness checks (never destination collisions)")
  .action(async (options) => {
    await runWithExitCode(async () => {
      const plan = parseEditPlan(JSON.parse(readFileText(resolve(options.plan))));
      const result = await applyEditPlan(plan, {
        allowStale: Boolean(options.allowStale),
        warn: logStderr,
      });
      logStderr(summarizeApply(result));
      return 0;
    });
  });

program
  .command("serve")
  .description("Long-lived NDJSON session over stdio")
  .requiredOption("--project <tsconfig>", "path to the project tsconfig.json")
  .action(async (options) => {
    const session = newSession(options.project, projectRootOf(options.project));
    const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

    await runServeLoop({
      session,
      input: rl,
      writeLine: writeStdout,
      readFileText,
      warn: logStderr,
    });

    process.exit(0);
  });

program.parse();
