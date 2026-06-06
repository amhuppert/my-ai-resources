import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { StaleApplyError } from "../../lib/ts-refactor/errors";
import { TsMorphEngine } from "../../lib/ts-refactor/engine/ts-morph-engine";
import { Session } from "../../lib/ts-refactor/session";

// Drives many real ts-morph operations per test; give cold compiler startup
// headroom so these do not flake on Bun's 5s default under parallel load.
setDefaultTimeout(30000);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ts-refactor-warm-apply-"));
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

function newSession(): Session {
  return new Session(new TsMorphEngine(), {
    readFileText: (p) => readFileSync(p, "utf8"),
    loadOptions: { tsconfigPath: join(root, "tsconfig.json") },
    displayRoot: root,
  });
}

describe("warm session: single program build + bounded heap", () => {
  test("many rename/move ops keep programBuildCount at 1 and heap bounded", async () => {
    tsconfig();

    // A barrel re-exporting many leaf modules. Each leaf has a symbol we will
    // rename, and an importer that references it, so every op exercises real
    // cross-file reference resolution against the warm program.
    const LEAVES = 10;
    const ROUNDS = 3;
    const barrelLines: string[] = [];
    // Stem -> current symbol name. The file path is fixed (leafN.ts); a rename
    // only rewrites the symbol text, never the file name.
    const stems: string[] = [];
    const currentSymbol = new Map<string, string>();
    for (let i = 0; i < LEAVES; i++) {
      const stem = `leaf${i}`;
      stems.push(stem);
      currentSymbol.set(stem, stem);
      write("src/" + stem + ".ts", `export const ${stem} = ${i};\n`);
      write(
        "src/use-" + stem + ".ts",
        `import { ${stem} } from "./${stem}";\nexport const u${i} = ${stem} + 1;\n`,
      );
      barrelLines.push(`export { ${stem} } from "./${stem}";`);
    }
    write("src/index.ts", barrelLines.join("\n") + "\n");

    const session = newSession();
    session.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    // Build the warm program before sampling heap so the baseline excludes the
    // one-time program construction cost.
    const heapBaseline = process.memoryUsage().heapUsed;

    let renamedCount = 0;
    for (let round = 0; round < ROUNDS; round++) {
      for (const stem of stems) {
        const leafPath = join(root, "src", `${stem}.ts`);
        const currentText = readFileSync(leafPath, "utf8");
        const currentSym = currentSymbol.get(stem) ?? "";
        const nextSym = `${stem}_r${round}`;

        const plan = session.planRename({
          filePath: leafPath,
          offset: offsetOf(currentText, currentSym),
          newName: nextSym,
        });
        expect(plan.summary.editCount).toBeGreaterThan(0);

        await session.apply(plan, {});
        currentSymbol.set(stem, nextSym);
        renamedCount += 1;
      }
    }

    const status = session.status();
    expect(status.programBuildCount).toBe(1);
    expect(status.operationCount).toBe(renamedCount * 2);

    // The barrel and importers must have tracked every rename round.
    const barrel = readFileSync(join(root, "src/index.ts"), "utf8");
    for (const stem of stems) {
      const sym = currentSymbol.get(stem) ?? "";
      expect(barrel).toContain(sym);
      const importer = readFileSync(join(root, "src", `use-${stem}.ts`), "utf8");
      expect(importer).toContain(sym);
    }

    const heapAfter = process.memoryUsage().heapUsed;
    const growth = heapAfter - heapBaseline;
    // 30 rename+apply round trips against a warm program must not balloon the
    // heap. A leaking session that rebuilt or retained per-op AST state would
    // blow well past this bound; ts-morph's forgetNodesCreatedInBlock keeps it flat.
    expect(growth).toBeLessThan(128 * 1024 * 1024);

    session.dispose();
  }, 30000);
});

describe("apply safety: content staleness", () => {
  test("mutating an edited target between plan and apply rejects with StaleApplyError", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);
    write(
      "src/use.ts",
      'import { widget } from "./def";\nexport const x = widget;\n',
    );

    const session = newSession();
    session.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    const plan = session.planRename({
      filePath: defPath,
      offset: offsetOf(defText, "widget"),
      newName: "gadget",
    });

    // A concurrent editor touches the very file the plan edits.
    writeFileSync(defPath, "export const widget = 99;\n");

    await expect(session.apply(plan, {})).rejects.toBeInstanceOf(StaleApplyError);

    // Nothing was committed: the file keeps the concurrent edit, untouched by apply.
    expect(readFileSync(defPath, "utf8")).toBe("export const widget = 99;\n");

    let caught: unknown;
    try {
      await session.apply(plan, {});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(StaleApplyError);
    if (caught instanceof StaleApplyError) {
      expect(caught.code).toBe("stale");
      expect(caught.paths).toContain(defPath);
    }

    session.dispose();
  });

  test("mutating a renamed SOURCE between plan and apply rejects", async () => {
    tsconfig();
    const fromText = "export const fmt = (n: number) => `${n}`;\n";
    const fromPath = write("src/date.ts", fromText);
    write(
      "src/use.ts",
      'import { fmt } from "./date";\nexport const v = fmt(1);\n',
    );
    const toPath = join(root, "src/time/date.ts");

    const session = newSession();
    session.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    const plan = session.planMove({ from: fromPath, to: toPath });

    // A concurrent editor changes the source file slated to move.
    writeFileSync(fromPath, fromText + "export const extra = 0;\n");

    let caught: unknown;
    try {
      await session.apply(plan, {});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(StaleApplyError);
    if (caught instanceof StaleApplyError) {
      expect(caught.paths).toContain(fromPath);
    }

    // The move never happened: source still present, destination absent.
    expect(readFileSync(fromPath, "utf8")).toBe(
      fromText + "export const extra = 0;\n",
    );
    expect(() => readFileSync(toPath, "utf8")).toThrow();

    session.dispose();
  });
});

describe("apply safety: allowStale scope", () => {
  test("allowStale overrides content staleness on an edited target", async () => {
    tsconfig();
    const defText = "export const widget = 1;\n";
    const defPath = write("src/def.ts", defText);
    const usePath = write(
      "src/use.ts",
      'import { widget } from "./def";\nexport const x = widget;\n',
    );

    const session = newSession();
    session.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    const plan = session.planRename({
      filePath: defPath,
      offset: offsetOf(defText, "widget"),
      newName: "gadget",
    });

    // The importer drifts after planning. The plan's edits to def.ts and use.ts
    // were computed against the original bytes; allowStale must let them through.
    writeFileSync(usePath, 'import { widget } from "./def";\nexport const x = widget; // edited\n');

    const warnings: string[] = [];
    const result = await session.apply(plan, {
      allowStale: true,
      warn: (m) => warnings.push(m),
    });

    expect(result.written).toContain(defPath);
    expect(readFileSync(defPath, "utf8")).toBe("export const gadget = 1;\n");
    expect(warnings.some((w) => w.includes("--allow-stale"))).toBe(true);

    session.dispose();
  });

  test("allowStale STILL rejects a pre-existing rename destination", async () => {
    tsconfig();
    const fromText = "export const fmt = (n: number) => `${n}`;\n";
    const fromPath = write("src/date.ts", fromText);
    write(
      "src/use.ts",
      'import { fmt } from "./date";\nexport const v = fmt(1);\n',
    );
    const toPath = join(root, "src/time/date.ts");

    const session = newSession();
    session.loadProject({ tsconfigPath: join(root, "tsconfig.json") });

    const plan = session.planMove({ from: fromPath, to: toPath });

    // A file already occupies the move destination. A non-overwrite move must be
    // rejected even when staleness checks are relaxed, to avoid clobbering data.
    const destSentinel = "export const PRE_EXISTING = true;\n";
    write("src/time/date.ts", destSentinel);

    let caught: unknown;
    try {
      await session.apply(plan, { allowStale: true });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(StaleApplyError);
    if (caught instanceof StaleApplyError) {
      expect(caught.paths).toContain(toPath);
    }

    // The destination keeps its original content; the source is still in place.
    expect(readFileSync(toPath, "utf8")).toBe(destSentinel);
    expect(readFileSync(fromPath, "utf8")).toBe(fromText);

    session.dispose();
  });
});
