import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";
import { TsMorphEngine } from "../../lib/ts-refactor/engine/ts-morph-engine";
import { Session } from "../../lib/ts-refactor/session";
import type { EditPlan } from "../../lib/ts-refactor/types";

// R1.6: a rename's planned edits must cover exactly the reference set that a raw
// TypeScript LanguageService independently reports for the same symbol, even when
// the symbol is reached through a barrel re-export and an aliased import. An
// independent compiler instance (not the engine's ts-morph Project) is used as
// the oracle so the assertion is not circular.

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ts-refactor-rename-oracle-"));
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

// A symbol `widget` declared in def.ts, re-exported through a barrel (index.ts),
// imported directly in direct.ts, and imported with an alias in aliased.ts.
function fixtureProject(): {
  tsconfigPath: string;
  defPath: string;
  indexPath: string;
  directPath: string;
  aliasedPath: string;
  declOffset: number;
} {
  const tsconfigPath = tsconfig();
  const defSource = "export const widget = 1;\n";
  const defPath = write("src/def.ts", defSource);
  const indexPath = write("src/index.ts", 'export { widget } from "./def";\n');
  const directPath = write(
    "src/direct.ts",
    'import { widget } from "./def";\nexport const direct = widget + 1;\n',
  );
  const aliasedPath = write(
    "src/aliased.ts",
    'import { widget as gizmo } from "./def";\nexport const aliased = gizmo + 2;\n',
  );

  return {
    tsconfigPath,
    defPath,
    indexPath,
    directPath,
    aliasedPath,
    declOffset: defSource.indexOf("widget"),
  };
}

// A namespace member `circle` declared in geo.ts and used qualified
// (`Geo.circle`) in use-geo.ts.
function namespaceFixture(): {
  tsconfigPath: string;
  defPath: string;
  usePath: string;
  declOffset: number;
} {
  const tsconfigPath = tsconfig();
  const defSource = "export namespace Geo {\n  export const circle = 1;\n}\n";
  const defPath = write("src/geo.ts", defSource);
  const usePath = write(
    "src/use-geo.ts",
    'import { Geo } from "./geo";\nexport const area = Geo.circle + 1;\n',
  );
  return { tsconfigPath, defPath, usePath, declOffset: defSource.indexOf("circle") };
}

// An overloaded function `calc` (two signatures + implementation) called in
// use-calc.ts; renaming one signature must rewrite all signatures and callers.
function overloadFixture(): {
  tsconfigPath: string;
  defPath: string;
  usePath: string;
  declOffset: number;
} {
  const tsconfigPath = tsconfig();
  const defSource =
    "export function calc(x: number): number;\n" +
    "export function calc(x: string): string;\n" +
    "export function calc(x: number | string): number | string {\n  return x;\n}\n";
  const defPath = write("src/calc.ts", defSource);
  const usePath = write(
    "src/use-calc.ts",
    'import { calc } from "./calc";\nexport const r = calc(1);\n',
  );
  return { tsconfigPath, defPath, usePath, declOffset: defSource.indexOf("calc") };
}

interface OracleLocation {
  fileName: string;
  start: number;
  length: number;
}

// Build an independent Program/LanguageService from the raw `typescript` package
// and ask it where the symbol at (filePath, offset) would be renamed.
function oracleRenameLocations(
  tsconfigPath: string,
  filePath: string,
  offset: number,
): OracleLocation[] {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(`oracle could not read tsconfig: ${tsconfigPath}`);
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(tsconfigPath),
  );

  const fileVersions = new Map<string, number>();
  for (const f of parsed.fileNames) {
    fileVersions.set(f, 0);
  }

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [...fileVersions.keys()],
    getScriptVersion: (fileName) => String(fileVersions.get(fileName) ?? 0),
    getScriptSnapshot: (fileName) => {
      if (!ts.sys.fileExists(fileName)) return undefined;
      const text = ts.sys.readFile(fileName);
      if (text === undefined) return undefined;
      return ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => dirname(tsconfigPath),
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  const locations = service.findRenameLocations(filePath, offset, false, false, {
    providePrefixAndSuffixTextForRename: true,
  });
  if (locations === undefined) {
    return [];
  }
  return locations.map((loc) => ({
    fileName: loc.fileName,
    start: loc.textSpan.start,
    length: loc.textSpan.length,
  }));
}

// Translate planned TextEdits (line/column/offset addressed) into the same
// (fileName, start, length, newText) shape the oracle reports, so the two sets
// can be compared directly.
interface NormalizedEdit {
  fileName: string;
  start: number;
  length: number;
  newText: string;
}

function normalizePlanEdits(plan: EditPlan): NormalizedEdit[] {
  const result: NormalizedEdit[] = [];
  for (const fileEdits of plan.fileEdits) {
    for (const edit of fileEdits.edits) {
      result.push({
        fileName: fileEdits.filePath,
        start: edit.start.offset,
        length: edit.end.offset - edit.start.offset,
        newText: edit.newText,
      });
    }
  }
  return result;
}

function sortEdits<T extends { fileName: string; start: number }>(edits: T[]): T[] {
  return [...edits].sort((a, b) =>
    a.fileName === b.fileName ? a.start - b.start : a.fileName.localeCompare(b.fileName),
  );
}

function renamePlanFor(
  tsconfigPath: string,
  filePath: string,
  offset: number,
  newName: string,
): EditPlan {
  const session = new Session(new TsMorphEngine(), {
    readFileText: (p) => readFileSync(p, "utf8"),
    loadOptions: { tsconfigPath },
    displayRoot: root,
  });
  try {
    return session.planRename({ filePath, offset, newName });
  } finally {
    session.dispose();
  }
}

// Assert the plan's reference spans equal the independent oracle's, and return
// the set of files the oracle reported (for additional coverage assertions).
function expectOracleParity(
  plan: EditPlan,
  tsconfigPath: string,
  filePath: string,
  offset: number,
): Set<string> {
  const oracle = oracleRenameLocations(tsconfigPath, filePath, offset);
  expect(oracle.length).toBeGreaterThan(0);
  const oracleSpans = sortEdits(
    oracle.map((o) => ({ fileName: o.fileName, start: o.start, length: o.length })),
  );
  const plannedSpans = sortEdits(
    normalizePlanEdits(plan).map((p) => ({
      fileName: p.fileName,
      start: p.start,
      length: p.length,
    })),
  );
  expect(plannedSpans).toEqual(oracleSpans);
  return new Set(oracle.map((o) => o.fileName));
}

// Each test spins up two independent TypeScript compiler instances (the engine's
// ts-morph Project and the oracle/verification Program), each loading lib.d.ts
// from cold; the generous timeout covers that compiler startup cost.
const COMPILER_TIMEOUT_MS = 30_000;

describe("rename oracle (R1.6)", () => {
  test("planned edits cover exactly the raw-LS reference set across barrel + alias", () => {
    const { tsconfigPath, defPath, declOffset } = fixtureProject();

    const engine = new TsMorphEngine();
    const session = new Session(engine, {
      readFileText: (p) => readFileSync(p, "utf8"),
      loadOptions: { tsconfigPath },
      displayRoot: root,
    });

    try {
      const plan = session.planRename({
        filePath: defPath,
        offset: declOffset,
        newName: "gadget",
      });

      const oracle = oracleRenameLocations(tsconfigPath, defPath, declOffset);
      expect(oracle.length).toBeGreaterThan(0);

      const planned = normalizePlanEdits(plan);

      // Same number of reference sites, same files, same spans.
      const oracleSpans = sortEdits(
        oracle.map((o) => ({ fileName: o.fileName, start: o.start, length: o.length })),
      );
      const plannedSpans = sortEdits(
        planned.map((p) => ({ fileName: p.fileName, start: p.start, length: p.length })),
      );
      expect(plannedSpans).toEqual(oracleSpans);

      // Every distinct importing/declaring file must be covered.
      const oracleFiles = new Set(oracle.map((o) => o.fileName));
      const plannedFiles = new Set(planned.map((p) => p.fileName));
      expect([...plannedFiles].sort()).toEqual([...oracleFiles].sort());

      // The barrel and the aliased importer are both part of the reference set.
      expect([...oracleFiles].some((f) => f.endsWith("index.ts"))).toBe(true);
      expect([...oracleFiles].some((f) => f.endsWith("aliased.ts"))).toBe(true);
    } finally {
      session.dispose();
    }
  }, COMPILER_TIMEOUT_MS);

  test("the aliased binding is preserved: only the imported name is rewritten, alias stays", () => {
    const { tsconfigPath, defPath, indexPath, aliasedPath, declOffset } =
      fixtureProject();

    const engine = new TsMorphEngine();
    const session = new Session(engine, {
      readFileText: (p) => readFileSync(p, "utf8"),
      loadOptions: { tsconfigPath },
      displayRoot: root,
    });

    try {
      const plan = session.planRename({
        filePath: defPath,
        offset: declOffset,
        newName: "gadget",
      });

      const aliasedFile = plan.fileEdits.find((fe) => fe.filePath === aliasedPath);
      expect(aliasedFile).toBeDefined();
      // The local alias `gizmo` is used twice (import binding + usage), but only
      // the imported name `widget` is a rename site here. The aliased file is
      // rewritten exactly once: `widget as gizmo` -> `gadget as gizmo`.
      expect(aliasedFile?.edits.length).toBe(1);
      const edit = aliasedFile?.edits[0];
      expect(edit?.newText).toBe("gadget");

      // The barrel re-export carries the compiler's suffixText so the public
      // name is preserved: `export { widget }` -> `export { gadget as widget }`.
      const indexFile = plan.fileEdits.find((fe) => fe.filePath === indexPath);
      expect(indexFile?.edits.length).toBe(1);
      expect(indexFile?.edits[0]?.newText).toBe("gadget as widget");
    } finally {
      session.dispose();
    }
  }, COMPILER_TIMEOUT_MS);

  test("applying the plan rewrites every reference and leaves the project resolvable", async () => {
    const { tsconfigPath, defPath, indexPath, directPath, aliasedPath, declOffset } =
      fixtureProject();

    const engine = new TsMorphEngine();
    const session = new Session(engine, {
      readFileText: (p) => readFileSync(p, "utf8"),
      loadOptions: { tsconfigPath },
      displayRoot: root,
    });

    try {
      const plan = session.planRename({
        filePath: defPath,
        offset: declOffset,
        newName: "gadget",
      });

      const result = await session.apply(plan, {});
      expect(result.written.length).toBeGreaterThan(0);

      // The declaration now carries the new name.
      expect(readFileSync(defPath, "utf8")).toBe("export const gadget = 1;\n");
      // A direct importer rewrites both the binding and the usage.
      expect(readFileSync(directPath, "utf8")).toBe(
        'import { gadget } from "./def";\nexport const direct = gadget + 1;\n',
      );
      // The aliased importer rewrites only the imported name; the local alias
      // `gizmo` and its usage are untouched.
      expect(readFileSync(aliasedPath, "utf8")).toBe(
        'import { gadget as gizmo } from "./def";\nexport const aliased = gizmo + 2;\n',
      );
      // The barrel re-export preserves the public name: it imports the renamed
      // local symbol but keeps re-exporting it as `widget`.
      expect(readFileSync(indexPath, "utf8")).toBe(
        'export { gadget as widget } from "./def";\n',
      );
    } finally {
      session.dispose();
    }

    // After applying, an independent Program built from the renamed sources must
    // report zero semantic errors -> the project is still resolvable.
    const diagnostics = projectSemanticDiagnostics(tsconfigPath);
    expect(diagnostics).toEqual([]);
  }, COMPILER_TIMEOUT_MS);

  test("namespace member rename matches the independent oracle", () => {
    const { tsconfigPath, defPath, declOffset } = namespaceFixture();
    const plan = renamePlanFor(tsconfigPath, defPath, declOffset, "ellipse");
    const files = expectOracleParity(plan, tsconfigPath, defPath, declOffset);
    // The qualified usage (Geo.circle) is part of the reference set.
    expect([...files].some((f) => f.endsWith("use-geo.ts"))).toBe(true);
  }, COMPILER_TIMEOUT_MS);

  test("overloaded function rename matches the independent oracle", () => {
    const { tsconfigPath, defPath, declOffset } = overloadFixture();
    const plan = renamePlanFor(tsconfigPath, defPath, declOffset, "compute");
    const files = expectOracleParity(plan, tsconfigPath, defPath, declOffset);
    // All signatures + the implementation + the caller are covered.
    expect([...files].some((f) => f.endsWith("use-calc.ts"))).toBe(true);
    const declEdits = plan.fileEdits.find((fe) => fe.filePath === defPath);
    // Two overload signatures + the implementation = three rename sites in the
    // declaration file.
    expect(declEdits?.edits.length).toBe(3);
  }, COMPILER_TIMEOUT_MS);
});

// Compile the on-disk project with a fresh Program and return human-readable
// semantic+syntactic diagnostics (empty array means the project type-checks).
function projectSemanticDiagnostics(tsconfigPath: string): string[] {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(`could not read tsconfig: ${tsconfigPath}`);
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(tsconfigPath),
  );
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = [
    ...program.getSemanticDiagnostics(),
    ...program.getSyntacticDiagnostics(),
  ];
  return diagnostics.map((d) =>
    ts.flattenDiagnosticMessageText(d.messageText, "\n"),
  );
}
