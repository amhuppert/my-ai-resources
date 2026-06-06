import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const CLI = join(import.meta.dir, "..", "..", "scripts", "ts-refactor.ts");

// Each test spawns the CLI as a subprocess (Bun startup + a cold ts-morph
// program build, ~3s each); some spawn two. Bun's 5s default SIGTERMs them
// under parallel load, so give the whole file generous headroom.
setDefaultTimeout(30000);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ts-refactor-cli-it-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(rel: string, content: string): string {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return abs;
}

function tsconfig(): string {
  return write(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          module: "ESNext",
          target: "ESNext",
          moduleResolution: "bundler",
          strict: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );
}

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runCli(args: string[], stdin?: string): Promise<RunResult> {
  const proc = Bun.spawn(["bun", CLI, ...args], {
    cwd: root,
    stdin: stdin === undefined ? "ignore" : new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

function fixtureProject(): { tsconfigPath: string; defPath: string; usePath: string } {
  const tsconfigPath = tsconfig();
  const defPath = write("src/def.ts", "export const widget = 1;\n");
  const usePath = write(
    "src/use.ts",
    'import { widget } from "./def";\nexport const x = widget;\n',
  );
  return { tsconfigPath, defPath, usePath };
}

describe("ts-refactor CLI (one-shot)", () => {
  test("rename plan-only prints JSON plan to stdout and writes nothing", async () => {
    const { tsconfigPath, defPath } = fixtureProject();
    const before = readFileSync(defPath, "utf8");

    const result = await runCli([
      "rename",
      "--file",
      defPath,
      "--position",
      "1:14",
      "--to",
      "gadget",
      "--project",
      tsconfigPath,
      "--format",
      "json",
    ]);

    expect(result.exitCode).toBe(0);
    const plan = JSON.parse(result.stdout) as { operation: string; planId: string };
    expect(plan.operation).toBe("rename");
    expect(typeof plan.planId).toBe("string");
    // Plan-only must NOT touch disk.
    expect(readFileSync(defPath, "utf8")).toBe(before);
  });

  test("rename --apply rewrites the declaration and all references on disk", async () => {
    const { tsconfigPath, defPath, usePath } = fixtureProject();

    const result = await runCli([
      "rename",
      "--file",
      defPath,
      "--offset",
      String("export const widget = 1;\n".indexOf("widget")),
      "--to",
      "gadget",
      "--project",
      tsconfigPath,
      "--apply",
    ]);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(defPath, "utf8")).toBe("export const gadget = 1;\n");
    expect(readFileSync(usePath, "utf8")).toBe(
      'import { gadget } from "./def";\nexport const x = gadget;\n',
    );
  });

  test("--format diff prints a unified diff on stdout", async () => {
    const { tsconfigPath, defPath } = fixtureProject();

    const result = await runCli([
      "rename",
      "--file",
      defPath,
      "--position",
      "1:14",
      "--to",
      "gadget",
      "--project",
      tsconfigPath,
      "--format",
      "diff",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("+export const gadget = 1;");
  });

  test("--plan-out writes the JSON plan and applies nothing", async () => {
    const { tsconfigPath, defPath } = fixtureProject();
    const before = readFileSync(defPath, "utf8");
    const planFile = join(root, "plan.json");

    const result = await runCli([
      "rename",
      "--file",
      defPath,
      "--position",
      "1:14",
      "--to",
      "gadget",
      "--project",
      tsconfigPath,
      "--plan-out",
      planFile,
    ]);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(defPath, "utf8")).toBe(before);
    const plan = JSON.parse(readFileSync(planFile, "utf8")) as { operation: string };
    expect(plan.operation).toBe("rename");
  });

  test("apply consumes a saved plan file and commits it", async () => {
    const { tsconfigPath, defPath, usePath } = fixtureProject();
    const planFile = join(root, "plan.json");

    await runCli([
      "rename",
      "--file",
      defPath,
      "--position",
      "1:14",
      "--to",
      "gadget",
      "--project",
      tsconfigPath,
      "--plan-out",
      planFile,
    ]);

    const result = await runCli(["apply", "--plan", planFile]);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(defPath, "utf8")).toBe("export const gadget = 1;\n");
    expect(readFileSync(usePath, "utf8")).toContain("gadget");
  });

  test("move --apply relocates a file and rewrites importers", async () => {
    const tsconfigPath = tsconfig();
    const fromPath = write("src/date.ts", "export const fmt = (n: number) => `${n}`;\n");
    const usePath = write(
      "src/use.ts",
      'import { fmt } from "./date";\nexport const v = fmt(1);\n',
    );
    const toPath = join(root, "src/time/date.ts");

    const result = await runCli([
      "move",
      "--from",
      fromPath,
      "--to",
      toPath,
      "--project",
      tsconfigPath,
      "--apply",
    ]);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(toPath, "utf8")).toContain("export const fmt");
    expect(readFileSync(usePath, "utf8")).toContain("./time/date");
  });

  test("no renameable symbol at position exits 3", async () => {
    const { tsconfigPath, defPath } = fixtureProject();

    const result = await runCli([
      "rename",
      "--file",
      defPath,
      // Whitespace before the export keyword: no symbol there.
      "--offset",
      "0",
      "--to",
      "gadget",
      "--project",
      tsconfigPath,
    ]);

    expect(result.exitCode).toBe(3);
  });

  test("missing position and offset exits 2 (usage)", async () => {
    const { tsconfigPath, defPath } = fixtureProject();

    const result = await runCli([
      "rename",
      "--file",
      defPath,
      "--to",
      "gadget",
      "--project",
      tsconfigPath,
    ]);

    expect(result.exitCode).toBe(2);
  });
});

describe("ts-refactor CLI (serve)", () => {
  test("emits one NDJSON response per request line and shuts down", async () => {
    const { tsconfigPath, defPath } = fixtureProject();

    const stdin =
      [
        JSON.stringify({
          id: "1",
          op: "loadProject",
          params: { tsconfigPath },
        }),
        JSON.stringify({
          id: "2",
          op: "rename",
          params: { filePath: defPath, position: "1:14", to: "gadget" },
        }),
        JSON.stringify({ id: "3", op: "status" }),
        JSON.stringify({ id: "4", op: "shutdown" }),
      ].join("\n") + "\n";

    const result = await runCli(["serve", "--project", tsconfigPath], stdin);

    expect(result.exitCode).toBe(0);
    const lines = result.stdout.trim().split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBe(4);
    const ids = lines.map((l) => (JSON.parse(l) as { id: string }).id);
    expect(ids).toEqual(["1", "2", "3", "4"]);
    const renameResp = JSON.parse(lines[1] ?? "{}") as {
      ok: boolean;
      result?: { operation: string };
    };
    expect(renameResp.ok).toBe(true);
    expect(renameResp.result?.operation).toBe("rename");
    // Plan op must not have written to disk.
    expect(readFileSync(defPath, "utf8")).toBe("export const widget = 1;\n");
  });

  test("a malformed line yields an error response and the session continues", async () => {
    const tsconfigPath = tsconfig();

    const stdin =
      ["not json", JSON.stringify({ id: "2", op: "status" }), JSON.stringify({ id: "3", op: "shutdown" })].join(
        "\n",
      ) + "\n";

    const result = await runCli(["serve", "--project", tsconfigPath], stdin);

    expect(result.exitCode).toBe(0);
    const lines = result.stdout.trim().split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBe(3);
    const first = JSON.parse(lines[0] ?? "{}") as { ok: boolean; error?: { code: string } };
    expect(first.ok).toBe(false);
    expect(first.error?.code).toBe("usage");
  });
});
