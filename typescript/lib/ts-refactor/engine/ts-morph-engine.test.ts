import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Project } from "ts-morph";
import { NoSymbolError } from "../errors";
import type { FileEdits, TextEdit } from "../types";
import { TsMorphEngine } from "./ts-morph-engine";

// Each test builds a real ts-morph Project; cold compiler startup can exceed
// Bun's 5s default, so give the whole file generous headroom.
setDefaultTimeout(30000);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ts-morph-engine-"));
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

function tsconfig(compilerOptions: Record<string, unknown>): string {
  return write(
    "tsconfig.json",
    JSON.stringify(
      { compilerOptions, include: ["src"] },
      null,
      2,
    ),
  );
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// Apply a file's edits (sorted by start) to produce the resulting text, working
// from the end so offsets stay valid.
function applyEdits(text: string, edits: TextEdit[]): string {
  let out = text;
  const sorted = [...edits].sort((a, b) => b.start.offset - a.start.offset);
  for (const edit of sorted) {
    out = out.slice(0, edit.start.offset) + edit.newText + out.slice(edit.end.offset);
  }
  return out;
}

function offsetOf(text: string, marker: string): number {
  const idx = text.indexOf(marker);
  if (idx < 0) throw new Error(`marker not found: ${marker}`);
  return idx;
}

function findFile(fileEdits: FileEdits[], absPath: string): FileEdits {
  const match = fileEdits.find((fe) => fe.filePath === absPath);
  if (!match) throw new Error(`no edits for ${absPath}`);
  return match;
}

describe("loadProject", () => {
  test("returns scope with source-file count and increments programBuildCount", () => {
    tsconfig({ module: "ESNext", target: "ESNext", moduleResolution: "bundler", strict: true });
    write("src/a.ts", "export const a = 1;\n");
    write("src/b.ts", "export const b = 2;\n");

    const engine = new TsMorphEngine();
    expect(engine.programBuildCount()).toBe(0);

    const tsconfigPath = join(root, "tsconfig.json");
    const scope = engine.loadProject({ tsconfigPath });

    expect(scope.tsconfigPath).toBe(tsconfigPath);
    expect(scope.filesLoaded).toBe(2);
    expect(scope.warnings).toEqual([]);
    expect(engine.programBuildCount()).toBe(1);

    engine.dispose();
  });

  test("scopeFiles narrows loaded files and records a warning", () => {
    tsconfig({ module: "ESNext", target: "ESNext", moduleResolution: "bundler", strict: true });
    const aPath = write("src/a.ts", "export const a = 1;\n");
    write("src/b.ts", "export const b = 2;\n");

    const engine = new TsMorphEngine();
    const scope = engine.loadProject({
      tsconfigPath: join(root, "tsconfig.json"),
      scopeFiles: [aPath],
    });

    expect(scope.filesLoaded).toBe(1);
    expect(scope.warnings.length).toBeGreaterThan(0);
    expect(scope.warnings.some((w) => /scope/i.test(w))).toBe(true);

    engine.dispose();
  });
});

describe("planRename", () => {
  function loadRename(): TsMorphEngine {
    tsconfig({ module: "ESNext", target: "ESNext", moduleResolution: "bundler", strict: true });
    const engine = new TsMorphEngine();
    engine.loadProject({ tsconfigPath: join(root, "tsconfig.json") });
    return engine;
  }

  test("renames across files, grouping non-overlapping edits sorted by start with disk baseSha256", () => {
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);
    const useText = 'import { widget } from "./def";\nexport const x = widget + widget;\n';
    const usePath = write("src/use.ts", useText);

    const engine = loadRename();
    const draft = engine.planRename({
      filePath: defPath,
      offset: offsetOf(defText, "widget"),
      newName: "gadget",
    });

    expect(draft.operation).toBe("rename");
    expect(draft.fileRenames).toEqual([]);

    const defEdits = findFile(draft.fileEdits, defPath);
    const useEdits = findFile(draft.fileEdits, usePath);

    expect(defEdits.baseSha256).toBe(sha256(defText));
    expect(useEdits.baseSha256).toBe(sha256(useText));

    // sorted by start, non-overlapping
    for (const fe of draft.fileEdits) {
      for (let i = 1; i < fe.edits.length; i++) {
        const prev = fe.edits[i - 1];
        const cur = fe.edits[i];
        expect(prev).toBeDefined();
        expect(cur).toBeDefined();
        if (prev && cur) {
          expect(cur.start.offset).toBeGreaterThanOrEqual(prev.end.offset);
        }
      }
    }

    expect(applyEdits(defText, defEdits.edits)).toBe("export const gadget = 1;\n");
    expect(applyEdits(useText, useEdits.edits)).toBe(
      'import { gadget } from "./def";\nexport const x = gadget + gadget;\n',
    );

    engine.dispose();
  });

  test("shorthand property rename includes compiler suffixText ({ foo } -> { foo: newName })", () => {
    const text = "const foo = 1;\nconst obj = { foo };\n";
    const filePath = write("src/shorthand.ts", text);

    const engine = loadRename();
    const draft = engine.planRename({
      filePath,
      offset: offsetOf(text, "foo"),
      newName: "renamed",
    });

    const fe = findFile(draft.fileEdits, filePath);
    const result = applyEdits(text, fe.edits);

    expect(result).toContain("const renamed = 1;");
    // The shorthand { foo } becomes { foo: renamed }: the property key stays
    // `foo` and the compiler supplies the prefix `foo: ` so the value binds the
    // renamed declaration. A bare span replacement would have dropped that text.
    expect(result).toContain("{ foo: renamed }");
    expect(fe.edits.some((e) => e.newText.includes(":"))).toBe(true);

    engine.dispose();
  });

  test("aliased import (import { x as y }) preserves the alias binding", () => {
    const defText = "export const original = 42;\n";
    const defPath = write("src/source.ts", defText);
    const useText = 'import { original as alias } from "./source";\nexport const v = alias;\n';
    const usePath = write("src/consumer.ts", useText);

    const engine = loadRename();
    const draft = engine.planRename({
      filePath: defPath,
      offset: offsetOf(defText, "original"),
      newName: "primary",
    });

    const useEdits = findFile(draft.fileEdits, usePath);
    const result = applyEdits(useText, useEdits.edits);

    expect(result).toContain("import { primary as alias }");
    expect(result).toContain("export const v = alias;");

    engine.dispose();
  });

  test("namespace member rename updates qualified usages", () => {
    const nsText = "export namespace Geometry {\n  export const tau = 6.28;\n}\n";
    const nsPath = write("src/ns.ts", nsText);
    const useText = 'import { Geometry } from "./ns";\nexport const c = Geometry.tau;\n';
    const usePath = write("src/ns-use.ts", useText);

    const engine = loadRename();
    const draft = engine.planRename({
      filePath: nsPath,
      offset: offsetOf(nsText, "tau"),
      newName: "circle",
    });

    const useEdits = findFile(draft.fileEdits, usePath);
    expect(applyEdits(useText, useEdits.edits)).toContain("Geometry.circle");

    engine.dispose();
  });

  test("overloaded function rename updates all signatures and callers", () => {
    const text = [
      "export function compute(x: number): number;",
      "export function compute(x: string): string;",
      "export function compute(x: number | string): number | string {",
      "  return x;",
      "}",
      "export const r = compute(1);",
      "",
    ].join("\n");
    const filePath = write("src/overload.ts", text);

    const engine = loadRename();
    const draft = engine.planRename({
      filePath,
      offset: offsetOf(text, "compute"),
      newName: "calculate",
    });

    const fe = findFile(draft.fileEdits, filePath);
    const result = applyEdits(text, fe.edits);

    // both signatures, the implementation, and the call site
    expect((result.match(/calculate/g) ?? []).length).toBe(4);
    expect(result).not.toContain("compute");

    engine.dispose();
  });

  test("throws NoSymbolError when no renameable symbol is at the offset", () => {
    const text = "export const a = 1;\n        \n";
    const filePath = write("src/blank.ts", text);

    const engine = loadRename();
    expect(() =>
      engine.planRename({ filePath, offset: offsetOf(text, "  "), newName: "z" }),
    ).toThrow(NoSymbolError);

    engine.dispose();
  });
});

describe("planRename scope warnings (public entry point heuristic)", () => {
  test("warns when the renamed symbol is exported from a package.json main/types entry point", () => {
    tsconfig({ module: "ESNext", target: "ESNext", moduleResolution: "bundler", strict: true });
    write("package.json", JSON.stringify({ name: "pkg", types: "src/index.ts" }));
    const idxText = "export const publicApi = 1;\n";
    const idxPath = write("src/index.ts", idxText);

    const engine = new TsMorphEngine();
    engine.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    const draft = engine.planRename({
      filePath: idxPath,
      offset: offsetOf(idxText, "publicApi"),
      newName: "publicApiV2",
    });

    expect(draft.scope.warnings.length).toBeGreaterThan(0);
    const warning = draft.scope.warnings.join(" ");
    expect(warning.toLowerCase()).toContain("external");
    expect(warning.toLowerCase()).toContain("not");

    engine.dispose();
  });

  test("no public-entry warning for a purely internal symbol", () => {
    tsconfig({ module: "ESNext", target: "ESNext", moduleResolution: "bundler", strict: true });
    const text = "const helper = 1;\nexport const used = helper + 1;\n";
    const filePath = write("src/internal.ts", text);

    const engine = new TsMorphEngine();
    engine.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    const draft = engine.planRename({
      filePath,
      offset: offsetOf(text, "helper"),
      newName: "aide",
    });

    expect(draft.scope.warnings).toEqual([]);

    engine.dispose();
  });
});

describe("planMove", () => {
  function buildMoveFixture(): { engine: TsMorphEngine; datePath: string } {
    write(
      "tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            module: "ESNext",
            target: "ESNext",
            moduleResolution: "bundler",
            baseUrl: ".",
            paths: { "@lib/*": ["src/lib/*"] },
            allowImportingTsExtensions: true,
            noEmit: true,
            strict: true,
          },
          include: ["src"],
        },
        null,
        2,
      ),
    );
    write("src/lib/math.ts", "export const add = (a: number, b: number) => a + b;\n");
    const datePath = write(
      "src/lib/date.ts",
      'import { add } from "./math";\nexport const fmt = (n: number): string => `day ${add(n, 0)}`;\n',
    );
    write("src/lib/index.ts", 'export * from "./date";\n');
    write("src/consumers/a-relative.ts", 'import { fmt } from "../lib/date";\nexport const a = fmt(1);\n');
    write("src/consumers/b-baseurl.ts", 'import { fmt } from "src/lib/date";\nexport const b = fmt(2);\n');
    write("src/consumers/c-paths.ts", 'import { fmt } from "@lib/date";\nexport const c = fmt(3);\n');
    write("src/consumers/d-barrel.ts", 'import { fmt } from "../lib";\nexport const d = fmt(4);\n');
    write("src/consumers/e-ext.ts", 'import { fmt } from "../lib/date.ts";\nexport const e = fmt(5);\n');

    const engine = new TsMorphEngine();
    engine.loadProject({ tsconfigPath: join(root, "tsconfig.json") });
    return { engine, datePath };
  }

  function snapshot(engine: TsMorphEngine): Array<[string, string]> {
    return [...engine.debugSnapshot()].sort((x, y) => x[0].localeCompare(y[0]));
  }

  // Verify a rewritten importer still resolves by writing the planned project
  // to a fresh on-disk copy and asking a new Project for diagnostics.
  function assertResolves(fileEdits: FileEdits[], renames: { from: string; to: string }[]) {
    const verifyRoot = mkdtempSync(join(tmpdir(), "ts-morph-verify-"));
    try {
      const renameMap = new Map(renames.map((r) => [r.from, r.to]));
      // Copy every tracked source file, applying edits, into verifyRoot at its
      // (possibly renamed) relative path.
      const editsByPath = new Map(fileEdits.map((fe) => [fe.filePath, fe.edits]));
      const allPaths = new Set<string>([...editsByPath.keys(), ...renameMap.keys()]);
      // include files with neither edit nor rename by copying the whole tree
      const original = readFileSync(join(root, "tsconfig.json"), "utf8");
      mkdirSync(verifyRoot, { recursive: true });
      writeFileSync(join(verifyRoot, "tsconfig.json"), original);

      const sourceFilesToCopy: Array<{ srcAbs: string; destRel: string; content: string }> = [];
      const tracked = [
        join(root, "src/lib/math.ts"),
        join(root, "src/lib/date.ts"),
        join(root, "src/lib/index.ts"),
        join(root, "src/consumers/a-relative.ts"),
        join(root, "src/consumers/b-baseurl.ts"),
        join(root, "src/consumers/c-paths.ts"),
        join(root, "src/consumers/d-barrel.ts"),
        join(root, "src/consumers/e-ext.ts"),
      ];
      for (const abs of tracked) {
        const base = readFileSync(abs, "utf8");
        const edits = editsByPath.get(abs) ?? [];
        const content = edits.length > 0 ? applyEdits(base, edits) : base;
        const destAbs = renameMap.get(abs) ?? abs;
        const destRel = destAbs.slice(root.length + 1);
        sourceFilesToCopy.push({ srcAbs: abs, destRel, content });
      }
      for (const f of sourceFilesToCopy) {
        const destAbs = join(verifyRoot, f.destRel);
        mkdirSync(dirname(destAbs), { recursive: true });
        writeFileSync(destAbs, f.content);
      }

      const verifyProject = new Project({ tsConfigFilePath: join(verifyRoot, "tsconfig.json") });
      const diags = verifyProject.getPreEmitDiagnostics();
      const moduleErrors = diags.filter((d) => {
        const code = d.getCode();
        return code === 2307 || code === 2306 || code === 2792;
      });
      const messages = moduleErrors.map((d) => `${d.getSourceFile()?.getBaseName()}: ${d.getMessageText()}`);
      expect(messages).toEqual([]);
    } finally {
      rmSync(verifyRoot, { recursive: true, force: true });
    }
  }

  test("rewrites all importer forms, produces a fileRename, and leaves the warm project byte-identical", () => {
    const { engine, datePath } = buildMoveFixture();
    const newPath = join(root, "src/time/date.ts");

    const before = snapshot(engine);
    const draft = engine.planMove({ from: datePath, to: newPath });
    const after = snapshot(engine);

    expect(draft.operation).toBe("move");

    // byte-identical warm project (non-mutating backend)
    expect(after).toEqual(before);

    // fileRename emitted with disk-based fromSha256
    expect(draft.fileRenames).toHaveLength(1);
    const rename = draft.fileRenames[0];
    expect(rename).toBeDefined();
    if (rename) {
      expect(rename.from).toBe(datePath);
      expect(rename.to).toBe(newPath);
      expect(rename.overwrite).toBe(false);
      expect(rename.fromSha256).toBe(sha256(readFileSync(datePath, "utf8")));
    }

    // every importer form rewritten (date's own import + barrel + 4 external forms; not d-barrel which targets unmoved index)
    const touched = new Set(draft.fileEdits.map((fe) => fe.filePath));
    expect(touched.has(join(root, "src/lib/date.ts"))).toBe(true);
    expect(touched.has(join(root, "src/lib/index.ts"))).toBe(true);
    expect(touched.has(join(root, "src/consumers/a-relative.ts"))).toBe(true);
    expect(touched.has(join(root, "src/consumers/b-baseurl.ts"))).toBe(true);
    expect(touched.has(join(root, "src/consumers/c-paths.ts"))).toBe(true);
    expect(touched.has(join(root, "src/consumers/e-ext.ts"))).toBe(true);
    expect(touched.has(join(root, "src/consumers/d-barrel.ts"))).toBe(false);

    // baseSha256 matches current disk for each edited importer
    for (const fe of draft.fileEdits) {
      expect(fe.baseSha256).toBe(sha256(readFileSync(fe.filePath, "utf8")));
    }

    // applied result still resolves
    assertResolves(
      draft.fileEdits,
      draft.fileRenames.map((r) => ({ from: r.from, to: r.to })),
    );

    engine.dispose();
  });

  test("programBuildCount stays at 1 across multiple plan operations", () => {
    const { engine, datePath } = buildMoveFixture();
    expect(engine.programBuildCount()).toBe(1);

    engine.planMove({ from: datePath, to: join(root, "src/time/date.ts") });
    engine.planMove({ from: datePath, to: join(root, "src/other/date.ts") });

    expect(engine.programBuildCount()).toBe(1);

    engine.dispose();
  });
});

describe("planMoveDir", () => {
  test("rewrites importers of every file under the directory via a single call, byte-clean", () => {
    write(
      "tsconfig.json",
      JSON.stringify(
        {
          compilerOptions: {
            module: "ESNext",
            target: "ESNext",
            moduleResolution: "bundler",
            baseUrl: ".",
            paths: { "@lib/*": ["src/lib/*"] },
            noEmit: true,
            strict: true,
          },
          include: ["src"],
        },
        null,
        2,
      ),
    );
    write("src/lib/math.ts", "export const add = (a: number, b: number) => a + b;\n");
    write("src/lib/date.ts", 'import { add } from "./math";\nexport const fmt = (n: number) => add(n, 0);\n');
    write("src/consumers/a.ts", 'import { fmt } from "../lib/date";\nexport const a = fmt(1);\n');
    write("src/consumers/b.ts", 'import { add } from "@lib/math";\nexport const b = add(1, 2);\n');

    const engine = new TsMorphEngine();
    engine.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    const before = [...engine.debugSnapshot()].sort((x, y) => x[0].localeCompare(y[0]));

    const draft = engine.planMoveDir({
      from: join(root, "src/lib"),
      to: join(root, "src/core"),
    });

    const after = [...engine.debugSnapshot()].sort((x, y) => x[0].localeCompare(y[0]));

    expect(draft.operation).toBe("moveDir");
    expect(after).toEqual(before);

    const touched = new Set(draft.fileEdits.map((fe) => fe.filePath));
    expect(touched.has(join(root, "src/consumers/a.ts"))).toBe(true);
    expect(touched.has(join(root, "src/consumers/b.ts"))).toBe(true);

    expect(draft.fileRenames).toHaveLength(1);
    const rename = draft.fileRenames[0];
    expect(rename).toBeDefined();
    if (rename) {
      expect(rename.from).toBe(join(root, "src/lib"));
      expect(rename.to).toBe(join(root, "src/core"));
    }

    engine.dispose();
  });
});

describe("refreshFiles", () => {
  test("re-reads committed disk state so subsequent plans use the new contents", () => {
    write("tsconfig.json", JSON.stringify({ compilerOptions: { module: "ESNext", target: "ESNext", moduleResolution: "bundler", strict: true }, include: ["src"] }, null, 2));
    const defPath = write("src/def.ts", "export const widget = 1;\n");
    write("src/use.ts", 'import { widget } from "./def";\nexport const x = widget;\n');

    const engine = new TsMorphEngine();
    engine.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    // mutate disk out-of-band, then refresh
    const newDef = "export const widget = 1;\nexport const extra = 2;\n";
    writeFileSync(defPath, newDef);
    engine.refreshFiles([defPath]);

    const draft = engine.planRename({
      filePath: defPath,
      offset: offsetOf(newDef, "widget"),
      newName: "gadget",
    });

    const fe = findFile(draft.fileEdits, defPath);
    expect(fe.baseSha256).toBe(sha256(newDef));
    expect(applyEdits(newDef, fe.edits)).toContain("export const extra = 2;");

    engine.dispose();
  });
});
