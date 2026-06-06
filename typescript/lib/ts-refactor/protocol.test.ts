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
import { TsMorphEngine } from "./engine/ts-morph-engine";
import { Session } from "./session";
import { dispatch, runServeLoop } from "./protocol";
import type { EditPlan } from "./types";

// Each test builds a real ts-morph Project; give cold compiler startup headroom.
setDefaultTimeout(30000);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ts-refactor-protocol-"));
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

function newSession(): Session {
  return new Session(new TsMorphEngine(), {
    readFileText: (p) => readFileSync(p, "utf8"),
    displayRoot: root,
  });
}

function newLazySession(): Session {
  return new Session(new TsMorphEngine(), {
    readFileText: (p) => readFileSync(p, "utf8"),
    loadOptions: { tsconfigPath: join(root, "tsconfig.json") },
    displayRoot: root,
  });
}

function deps() {
  return { readFileText: (p: string) => readFileSync(p, "utf8") };
}

describe("dispatch", () => {
  test("valid rename op returns an EditPlan and echoes the id", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);
    write("src/use.ts", 'import { widget } from "./def";\nexport const x = widget;\n');

    const session = newSession();

    const load = await dispatch(
      session,
      { id: "1", op: "loadProject", params: { tsconfigPath: join(root, "tsconfig.json") } },
      deps(),
    );
    expect(load.ok).toBe(true);
    expect(load.id).toBe("1");

    const response = await dispatch(
      session,
      {
        id: "2",
        op: "rename",
        params: { filePath: defPath, position: "1:14", to: "gadget" },
      },
      deps(),
    );

    expect(response.id).toBe("2");
    expect(response.ok).toBe(true);
    const plan = response.result as EditPlan;
    expect(plan.operation).toBe("rename");
    expect(plan.summary.editCount).toBeGreaterThan(0);
  });

  test("rename via {line, column} object position works", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);

    const session = newSession();
    await dispatch(
      session,
      { id: "1", op: "loadProject", params: { tsconfigPath: join(root, "tsconfig.json") } },
      deps(),
    );

    const response = await dispatch(
      session,
      {
        id: "2",
        op: "rename",
        params: { filePath: defPath, position: { line: 1, column: 14 }, to: "gadget" },
      },
      deps(),
    );

    expect(response.ok).toBe(true);
  });

  test("rename via raw offset works", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);

    const session = newSession();
    await dispatch(
      session,
      { id: "1", op: "loadProject", params: { tsconfigPath: join(root, "tsconfig.json") } },
      deps(),
    );

    const response = await dispatch(
      session,
      {
        id: "2",
        op: "rename",
        params: { filePath: defPath, offset: defText.indexOf("widget"), to: "gadget" },
      },
      deps(),
    );

    expect(response.ok).toBe(true);
  });

  test("rename with neither position nor offset is a usage error; session stays alive", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);

    const session = newSession();
    await dispatch(
      session,
      { id: "1", op: "loadProject", params: { tsconfigPath: join(root, "tsconfig.json") } },
      deps(),
    );

    const bad = await dispatch(
      session,
      { id: "2", op: "rename", params: { filePath: defPath, to: "gadget" } },
      deps(),
    );
    expect(bad.id).toBe("2");
    expect(bad.ok).toBe(false);
    expect(bad.error?.code).toBe("usage");

    // The session still answers the next request.
    const ok = await dispatch(
      session,
      {
        id: "3",
        op: "rename",
        params: { filePath: defPath, offset: defText.indexOf("widget"), to: "gadget" },
      },
      deps(),
    );
    expect(ok.ok).toBe(true);
  });

  test("rename with both position and offset is a usage error", async () => {
    tsconfig();
    const defPath = write("src/def.ts", "export const widget = 1;\n");

    const session = newSession();
    await dispatch(
      session,
      { id: "1", op: "loadProject", params: { tsconfigPath: join(root, "tsconfig.json") } },
      deps(),
    );

    const bad = await dispatch(
      session,
      {
        id: "2",
        op: "rename",
        params: { filePath: defPath, position: "1:14", offset: 13, to: "gadget" },
      },
      deps(),
    );
    expect(bad.ok).toBe(false);
    expect(bad.error?.code).toBe("usage");
  });

  test("malformed params (unknown key) is a usage error and echoes id", async () => {
    const session = newSession();
    const response = await dispatch(
      session,
      { id: "9", op: "loadProject", params: { tsconfigPath: "/x/tsconfig.json", bogus: true } },
      deps(),
    );
    expect(response.id).toBe("9");
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("usage");
  });

  test("unknown op returns a usage error and echoes id", async () => {
    const session = newSession();
    const response = await dispatch(
      session,
      { id: "7", op: "frobnicate", params: {} },
      deps(),
    );
    expect(response.id).toBe("7");
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("usage");
  });

  test("status returns scope and counters", async () => {
    tsconfig();
    const session = newSession();
    await dispatch(
      session,
      { id: "1", op: "loadProject", params: { tsconfigPath: join(root, "tsconfig.json") } },
      deps(),
    );

    const response = await dispatch(session, { id: "2", op: "status" }, deps());
    expect(response.ok).toBe(true);
    const result = response.result as { operationCount: number; programBuildCount: number };
    expect(result.programBuildCount).toBe(1);
  });

  test("apply by planId mutates disk and echoes id", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);

    const session = newSession();
    await dispatch(
      session,
      { id: "1", op: "loadProject", params: { tsconfigPath: join(root, "tsconfig.json") } },
      deps(),
    );
    const planResp = await dispatch(
      session,
      {
        id: "2",
        op: "rename",
        params: { filePath: defPath, offset: defText.indexOf("widget"), to: "gadget" },
      },
      deps(),
    );
    const plan = planResp.result as EditPlan;

    const applyResp = await dispatch(
      session,
      { id: "3", op: "apply", params: { planId: plan.planId } },
      deps(),
    );
    expect(applyResp.id).toBe("3");
    expect(applyResp.ok).toBe(true);
    expect(readFileSync(defPath, "utf8")).toBe("export const gadget = 1;\n");
  });

  test("apply with neither plan nor planId is a usage error", async () => {
    const session = newSession();
    const response = await dispatch(
      session,
      { id: "1", op: "apply", params: {} },
      deps(),
    );
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("usage");
  });

  test("apply as the FIRST op in a lazy session lazily loads, succeeds, and mutates disk", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);

    // A valid plan from a separate (loaded) session.
    const planResp = await dispatch(
      newLazySession(),
      { id: "p", op: "rename", params: { filePath: defPath, offset: defText.indexOf("widget"), to: "gadget" } },
      deps(),
    );
    expect(planResp.ok).toBe(true);
    const plan = planResp.result as EditPlan;

    // A FRESH lazy session applies the inline plan as its very first op — no prior
    // loadProject/plan. Must not return ok:false over an already-mutated tree.
    const fresh = newLazySession();
    const applyResp = await dispatch(fresh, { id: "1", op: "apply", params: { plan } }, deps());

    expect(applyResp.error).toBeUndefined();
    expect(applyResp.ok).toBe(true);
    expect(readFileSync(defPath, "utf8")).toBe("export const gadget = 1;\n");
  });

  test("apply allowStale over the protocol relaxes content staleness AND surfaces the warning via deps.warn", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);

    const session = newLazySession();
    const planResp = await dispatch(
      session,
      { id: "1", op: "rename", params: { filePath: defPath, offset: defText.indexOf("widget"), to: "gadget" } },
      deps(),
    );
    const plan = planResp.result as EditPlan;

    // The file drifts after planning (content after the edit span changes).
    writeFileSync(defPath, "export const widget = 2;\n", "utf8");

    const warnings: string[] = [];
    const applyResp = await dispatch(
      session,
      { id: "2", op: "apply", params: { planId: plan.planId, allowStale: true } },
      { readFileText: (p: string) => readFileSync(p, "utf8"), warn: (m: string) => warnings.push(m) },
    );

    expect(applyResp.ok).toBe(true);
    expect(readFileSync(defPath, "utf8")).toBe("export const gadget = 2;\n");
    expect(warnings.some((w) => /stale/i.test(w))).toBe(true);
  });
});

describe("runServeLoop", () => {
  test("emits exactly one response line per request line on stdout", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);

    const session = newSession();
    const lines = [
      JSON.stringify({
        id: "1",
        op: "loadProject",
        params: { tsconfigPath: join(root, "tsconfig.json") },
      }),
      JSON.stringify({
        id: "2",
        op: "rename",
        params: { filePath: defPath, offset: defText.indexOf("widget"), to: "gadget" },
      }),
      JSON.stringify({ id: "3", op: "status" }),
      JSON.stringify({ id: "4", op: "shutdown" }),
    ];

    const out: string[] = [];
    await runServeLoop({
      session,
      input: lineIterator(lines),
      writeLine: (line) => out.push(line),
      readFileText: (p) => readFileSync(p, "utf8"),
    });

    expect(out.length).toBe(4);
    for (const line of out) {
      const parsed = JSON.parse(line) as { id: string; ok: boolean };
      expect(typeof parsed.id).toBe("string");
      expect(typeof parsed.ok).toBe("boolean");
    }
    const ids = out.map((line) => (JSON.parse(line) as { id: string }).id);
    expect(ids).toEqual(["1", "2", "3", "4"]);
  });

  test("a malformed line yields an error response and the loop continues", async () => {
    const session = newSession();
    const lines = [
      "this is not json",
      JSON.stringify({ id: "2", op: "shutdown" }),
    ];

    const out: string[] = [];
    await runServeLoop({
      session,
      input: lineIterator(lines),
      writeLine: (line) => out.push(line),
      readFileText: (p) => readFileSync(p, "utf8"),
    });

    expect(out.length).toBe(2);
    const first = JSON.parse(out[0] ?? "{}") as { ok: boolean; error?: { code: string } };
    expect(first.ok).toBe(false);
    expect(first.error?.code).toBe("usage");
  });

  test("a non-string request id is coerced to its string form, not silently blanked", async () => {
    const session = newSession();
    const lines = [
      JSON.stringify({ id: 12345, op: "status" }),
      JSON.stringify({ id: "done", op: "shutdown" }),
    ];

    const out: string[] = [];
    await runServeLoop({
      session,
      input: lineIterator(lines),
      writeLine: (line) => out.push(line),
      readFileText: (p) => readFileSync(p, "utf8"),
    });

    const first = JSON.parse(out[0] ?? "{}") as { id: string; ok: boolean };
    expect(first.id).toBe("12345");
    expect(first.ok).toBe(true);
  });

  test("blank lines are skipped without producing a response", async () => {
    const session = newSession();
    const lines = ["", "   ", JSON.stringify({ id: "1", op: "shutdown" })];

    const out: string[] = [];
    await runServeLoop({
      session,
      input: lineIterator(lines),
      writeLine: (line) => out.push(line),
      readFileText: (p) => readFileSync(p, "utf8"),
    });

    expect(out.length).toBe(1);
  });
});

async function* lineIterator(lines: string[]): AsyncIterable<string> {
  for (const line of lines) {
    yield line;
  }
}
