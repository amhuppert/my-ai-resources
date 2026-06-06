import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { TsMorphEngine } from "./engine/ts-morph-engine";
import type {
  LoadProjectOptions,
  MoveRequest,
  RefactorEngine,
  RenameRequest,
} from "./engine/refactor-engine";
import { Session } from "./session";
import type { PlanDraft, ProjectScope } from "./types";

// The end-to-end cases build a real ts-morph Project; give cold compiler
// startup headroom so they do not flake on Bun's 5s default under parallel load.
setDefaultTimeout(30000);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ts-refactor-session-"));
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

function offsetOf(text: string, marker: string): number {
  const idx = text.indexOf(marker);
  if (idx < 0) throw new Error(`marker not found: ${marker}`);
  return idx;
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// A controllable engine for lifecycle assertions: records calls and returns
// canned PlanDrafts without building any real TypeScript program.
class FakeEngine implements RefactorEngine {
  loadCalls: LoadProjectOptions[] = [];
  renameCalls: RenameRequest[] = [];
  moveCalls: MoveRequest[] = [];
  moveDirCalls: MoveRequest[] = [];
  refreshCalls: string[][] = [];
  disposeCalls = 0;
  #buildCount = 0;
  #scope: ProjectScope = { tsconfigPath: "", filesLoaded: 0, warnings: [] };
  #nextDraft: PlanDraft | undefined;

  setScope(scope: ProjectScope): void {
    this.#scope = scope;
  }

  setNextDraft(draft: PlanDraft): void {
    this.#nextDraft = draft;
  }

  loadProject(opts: LoadProjectOptions): ProjectScope {
    this.loadCalls.push(opts);
    this.#buildCount += 1;
    this.#scope = { ...this.#scope, tsconfigPath: opts.tsconfigPath };
    return this.#scope;
  }

  planRename(req: RenameRequest): PlanDraft {
    this.renameCalls.push(req);
    return this.#draft("rename");
  }

  planMove(req: MoveRequest): PlanDraft {
    this.moveCalls.push(req);
    return this.#draft("move");
  }

  planMoveDir(req: MoveRequest): PlanDraft {
    this.moveDirCalls.push(req);
    return this.#draft("moveDir");
  }

  refreshFiles(absPaths: string[]): void {
    this.refreshCalls.push(absPaths);
  }

  dispose(): void {
    this.disposeCalls += 1;
  }

  programBuildCount(): number {
    return this.#buildCount;
  }

  #draft(operation: PlanDraft["operation"]): PlanDraft {
    if (this.#nextDraft) {
      const draft = this.#nextDraft;
      this.#nextDraft = undefined;
      return draft;
    }
    return {
      operation,
      fileEdits: [],
      fileRenames: [],
      scope: this.#scope,
    };
  }
}

// Builds a draft that replaces the whole file content [0, replacedLength) with
// newText so apply produces exactly newText on disk.
function draftReplacingAll(
  filePath: string,
  baseSha256: string,
  replacedLength: number,
  newText: string,
): PlanDraft {
  return {
    operation: "rename",
    fileEdits: [
      {
        filePath,
        baseSha256,
        edits: [
          {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: replacedLength + 1, offset: replacedLength },
            newText,
          },
        ],
      },
    ],
    fileRenames: [],
    scope: { tsconfigPath: "", filesLoaded: 0, warnings: [] },
  };
}

describe("Session lifecycle (fake engine)", () => {
  test("loadProject delegates to the engine and stores scope", () => {
    const engine = new FakeEngine();
    engine.setScope({ tsconfigPath: "", filesLoaded: 7, warnings: ["w"] });
    const session = new Session(engine, { readFileText: () => "" });

    const scope = session.loadProject({ tsconfigPath: "/tmp/tsconfig.json" });

    expect(engine.loadCalls).toEqual([{ tsconfigPath: "/tmp/tsconfig.json" }]);
    expect(scope.tsconfigPath).toBe("/tmp/tsconfig.json");
    expect(scope.filesLoaded).toBe(7);
  });

  test("a plan op lazily loads the project on first use", () => {
    const engine = new FakeEngine();
    const session = new Session(engine, {
      readFileText: () => "",
      loadOptions: { tsconfigPath: "/tmp/tsconfig.json" },
    });

    expect(engine.loadCalls.length).toBe(0);

    session.planRename({ filePath: "/x.ts", offset: 0, newName: "y" });

    expect(engine.loadCalls.length).toBe(1);
  });

  test("the program is built once across many ops (programBuildCount stays 1)", () => {
    const engine = new FakeEngine();
    const session = new Session(engine, { readFileText: () => "" });
    session.loadProject({ tsconfigPath: "/tmp/tsconfig.json" });

    for (let i = 0; i < 25; i++) {
      session.planRename({ filePath: "/x.ts", offset: i, newName: `y${i}` });
      session.planMove({ from: `/a${i}.ts`, to: `/b${i}.ts` });
      session.planMoveDir({ from: `/d${i}`, to: `/e${i}` });
    }

    expect(session.status().programBuildCount).toBe(1);
    expect(engine.programBuildCount()).toBe(1);
  });

  test("status reports scope, heap, and counters", () => {
    const engine = new FakeEngine();
    engine.setScope({ tsconfigPath: "", filesLoaded: 3, warnings: [] });
    const session = new Session(engine, { readFileText: () => "" });
    session.loadProject({ tsconfigPath: "/tmp/tsconfig.json" });

    session.planRename({ filePath: "/x.ts", offset: 0, newName: "y" });
    session.planMove({ from: "/a.ts", to: "/b.ts" });

    const status = session.status();

    expect(status.scope.tsconfigPath).toBe("/tmp/tsconfig.json");
    expect(status.scope.filesLoaded).toBe(3);
    expect(status.operationCount).toBe(2);
    expect(status.programBuildCount).toBe(1);
    expect(typeof status.heapUsed).toBe("number");
    expect(status.heapUsed).toBeGreaterThan(0);
  });

  test("each plan and apply increments operationCount", async () => {
    const target = write("src/file.ts", "x");
    const baseSha256 = sha256("x");

    const engine = new FakeEngine();
    const session = new Session(engine, { readFileText: () => "x" });
    session.loadProject({ tsconfigPath: "/tmp/tsconfig.json" });

    engine.setNextDraft(draftReplacingAll(target, baseSha256, 1, ""));
    const plan = session.planRename({ filePath: target, offset: 0, newName: "y" });
    expect(session.status().operationCount).toBe(1);

    await session.apply(plan, {});
    expect(session.status().operationCount).toBe(2);
  });

  test("apply by planId works without re-sending the plan", async () => {
    const target = write("src/file.ts", "hello");
    const baseSha256 = sha256("hello");

    const engine = new FakeEngine();
    const session = new Session(engine, { readFileText: () => "hello" });
    session.loadProject({ tsconfigPath: "/tmp/tsconfig.json" });

    engine.setNextDraft(draftReplacingAll(target, baseSha256, 5, "HELLO"));
    const plan = session.planRename({ filePath: target, offset: 0, newName: "HELLO" });

    const result = await session.apply(plan.planId, {});

    expect(result.written).toEqual([target]);
    expect(readFileSync(target, "utf8")).toBe("HELLO");
  });

  test("apply refreshes edited files and rename destinations", async () => {
    const edited = write("src/edited.ts", "data");
    const baseSha256 = sha256("data");

    const engine = new FakeEngine();
    const session = new Session(engine, { readFileText: () => "data" });
    session.loadProject({ tsconfigPath: "/tmp/tsconfig.json" });

    engine.setNextDraft({
      operation: "move",
      fileEdits: [
        {
          filePath: edited,
          baseSha256,
          edits: [
            {
              start: { line: 1, column: 1, offset: 0 },
              end: { line: 1, column: 1, offset: 0 },
              newText: "x",
            },
          ],
        },
      ],
      fileRenames: [
        {
          from: write("src/from.ts", "moved"),
          to: join(root, "src/to.ts"),
          fromSha256: sha256("moved"),
          overwrite: false,
        },
      ],
      scope: { tsconfigPath: "", filesLoaded: 0, warnings: [] },
    });

    const plan = session.planMove({ from: join(root, "src/from.ts"), to: join(root, "src/to.ts") });
    await session.apply(plan, {});

    expect(engine.refreshCalls.length).toBe(1);
    const refreshed = engine.refreshCalls[0] ?? [];
    expect(refreshed).toContain(edited);
    expect(refreshed).toContain(join(root, "src/to.ts"));
  });

  test("apply by an unknown planId throws a usage error", async () => {
    const engine = new FakeEngine();
    const session = new Session(engine, { readFileText: () => "" });
    session.loadProject({ tsconfigPath: "/tmp/tsconfig.json" });

    await expect(session.apply("not-a-real-plan-id", {})).rejects.toThrow();
  });

  test("dispose delegates to the engine", () => {
    const engine = new FakeEngine();
    const session = new Session(engine, { readFileText: () => "" });
    session.dispose();
    expect(engine.disposeCalls).toBe(1);
  });
});

describe("Session end-to-end (real TsMorphEngine)", () => {
  test("program built once across many ops; refresh lets a later plan observe committed state", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);
    const useText = 'import { widget } from "./def";\nexport const x = widget + widget;\n';
    const usePath = write("src/use.ts", useText);

    const engine = new TsMorphEngine();
    const session = new Session(engine, {
      readFileText: (p) => readFileSync(p, "utf8"),
    });
    session.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    const renamePlan = session.planRename({
      filePath: defPath,
      offset: offsetOf(defText, "widget"),
      newName: "gadget",
    });
    expect(renamePlan.summary.editCount).toBeGreaterThan(0);

    await session.apply(renamePlan, {});

    expect(readFileSync(defPath, "utf8")).toBe("export const gadget = 1;\n");
    expect(readFileSync(usePath, "utf8")).toBe(
      'import { gadget } from "./def";\nexport const x = gadget + gadget;\n',
    );

    // After refresh, the warm program observes committed state: the symbol is now
    // `gadget`, so a fresh rename of `widget` finds nothing while `gadget` works.
    const followUp = session.planRename({
      filePath: defPath,
      offset: offsetOf(readFileSync(defPath, "utf8"), "gadget"),
      newName: "doohickey",
    });
    expect(followUp.summary.editCount).toBeGreaterThan(0);

    const status = session.status();
    expect(status.programBuildCount).toBe(1);
    expect(status.operationCount).toBeGreaterThan(0);

    session.dispose();
  });
});
