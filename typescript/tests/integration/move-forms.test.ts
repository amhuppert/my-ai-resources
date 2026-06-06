import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Project } from "ts-morph";
import { TsMorphEngine } from "../../lib/ts-refactor/engine/ts-morph-engine";
import { Session } from "../../lib/ts-refactor/session";

// Each test cold-starts one or more ts-morph Projects; give generous headroom.
setDefaultTimeout(30000);

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ts-refactor-move-forms-it-"));
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

function writeTsconfig(): string {
  return write(
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
}

// Mirrors spikes/ts-refactor-move/spike.ts: a file (src/lib/date.ts) imported via
// every covered resolution form, plus the moved file's own relative import and a
// barrel re-export.
function writeAllFormsFixture(): {
  tsconfigPath: string;
  datePath: string;
  importers: {
    barrel: string;
    relative: string;
    baseUrl: string;
    paths: string;
    ext: string;
  };
} {
  const tsconfigPath = writeTsconfig();
  write("src/lib/math.ts", "export const add = (a: number, b: number) => a + b;\n");
  const datePath = write(
    "src/lib/date.ts",
    'import { add } from "./math";\nexport const fmt = (n: number): string => `day ${add(n, 0)}`;\n',
  );
  const importers = {
    barrel: write("src/lib/index.ts", 'export * from "./date";\n'),
    relative: write(
      "src/consumers/a-relative.ts",
      'import { fmt } from "../lib/date";\nexport const a = fmt(1);\n',
    ),
    baseUrl: write(
      "src/consumers/b-baseurl.ts",
      'import { fmt } from "src/lib/date";\nexport const b = fmt(2);\n',
    ),
    paths: write(
      "src/consumers/c-paths.ts",
      'import { fmt } from "@lib/date";\nexport const c = fmt(3);\n',
    ),
    ext: write(
      "src/consumers/e-ext.ts",
      'import { fmt } from "../lib/date.ts";\nexport const e = fmt(5);\n',
    ),
  };
  return { tsconfigPath, datePath, importers };
}

function newSession(tsconfigPath: string): Session {
  const engine = new TsMorphEngine();
  return new Session(engine, {
    readFileText: (filePath) => readFileSync(filePath, "utf8"),
    loadOptions: { tsconfigPath },
    displayRoot: root,
  });
}

// Type-check the post-apply on-disk project: zero module-resolution diagnostics
// means every importer still resolves to the moved file.
function assertProjectResolves(tsconfigPath: string): void {
  const project = new Project({ tsConfigFilePath: tsconfigPath });
  const diags = project.getPreEmitDiagnostics();
  const moduleErrors = diags.filter((d) => {
    const code = d.getCode();
    // 2307 cannot find module, 2306 not a module, 2792 cannot find module (did you mean to set moduleResolution).
    return code === 2307 || code === 2306 || code === 2792;
  });
  const messages = moduleErrors.map(
    (d) => `${d.getSourceFile()?.getBaseName() ?? "?"}: ${d.getMessageText()}`,
  );
  expect(messages).toEqual([]);
}

describe("move covers every resolution form end-to-end", () => {
  test("moving a file updates every importer form and the project still resolves after apply", async () => {
    const { tsconfigPath, datePath, importers } = writeAllFormsFixture();
    const toPath = join(root, "src/time/date.ts");

    const session = newSession(tsconfigPath);
    try {
      const plan = session.planMove({ from: datePath, to: toPath });

      // Every covered importer form is in the plan's edits.
      const edited = new Set(plan.fileEdits.map((fe) => fe.filePath));
      expect(edited.has(importers.relative)).toBe(true);
      expect(edited.has(importers.baseUrl)).toBe(true);
      expect(edited.has(importers.paths)).toBe(true);
      expect(edited.has(importers.barrel)).toBe(true);
      expect(edited.has(importers.ext)).toBe(true);
      // The moved file's own relative import to ./math is also rewritten.
      expect(edited.has(datePath)).toBe(true);

      // The single fileRename relocates the source.
      expect(plan.fileRenames).toHaveLength(1);
      expect(plan.fileRenames[0]?.from).toBe(datePath);
      expect(plan.fileRenames[0]?.to).toBe(toPath);

      await session.apply(plan, {});

      // The file moved.
      expect(existsSync(datePath)).toBe(false);
      expect(existsSync(toPath)).toBe(true);

      // Every importer still references the moved file in some form (we do not
      // assert exact specifier style, only that the project still resolves).
      assertProjectResolves(tsconfigPath);
    } finally {
      session.dispose();
    }
  });

  test("a relative-only importer resolves after the move", async () => {
    const tsconfigPath = writeTsconfig();
    const fromPath = write(
      "src/util/format.ts",
      "export const format = (n: number) => `${n}`;\n",
    );
    write(
      "src/consumers/use.ts",
      'import { format } from "../util/format";\nexport const v = format(1);\n',
    );
    const toPath = join(root, "src/helpers/format.ts");

    const session = newSession(tsconfigPath);
    try {
      const plan = session.planMove({ from: fromPath, to: toPath });
      await session.apply(plan, {});

      expect(existsSync(toPath)).toBe(true);
      assertProjectResolves(tsconfigPath);
    } finally {
      session.dispose();
    }
  });

  test("move-dir --apply relocates the directory subtree and the project still resolves", async () => {
    const { tsconfigPath } = writeAllFormsFixture();
    const fromDir = join(root, "src/lib");
    const toDir = join(root, "src/core");

    const session = newSession(tsconfigPath);
    try {
      const plan = session.planMoveDir({ from: fromDir, to: toDir });
      expect(plan.fileRenames).toHaveLength(1);
      expect(plan.fileRenames[0]?.from).toBe(fromDir);

      // The blocker regression guard: applying a directory move must move the
      // directory on disk (not crash with EISDIR) and keep the project resolving.
      await session.apply(plan, {});

      expect(existsSync(fromDir)).toBe(false);
      expect(existsSync(join(toDir, "date.ts"))).toBe(true);
      expect(existsSync(join(toDir, "math.ts"))).toBe(true);
      assertProjectResolves(tsconfigPath);
    } finally {
      session.dispose();
    }
  });

  test("move-dir does not evict a sibling directory that shares the moved prefix", async () => {
    const tsconfigPath = writeTsconfig();
    write("src/lib/date.ts", "export const fmt = (n: number) => `${n}`;\n");
    write(
      "src/consumers/a.ts",
      'import { fmt } from "../lib/date";\nexport const a = fmt(1);\n',
    );
    // A sibling directory whose path starts with the moved directory's path
    // ("src/library" vs "src/lib"). It is loaded via the tsconfig `include` glob
    // and is NOT imported by anything else, so a naive (non-separator-terminated)
    // prefix check in refreshFiles would evict it with no chance of re-resolution.
    const widgetSource = "export const sym = 1;\n";
    const widgetPath = write("src/library/widget.ts", widgetSource);

    const session = newSession(tsconfigPath);
    try {
      await session.apply(
        session.planMoveDir({ from: join(root, "src/lib"), to: join(root, "src/core") }),
        {},
      );

      // A follow-up rename targeting the SIBLING must still succeed — proving it
      // was not evicted when src/lib moved.
      const renamePlan = session.planRename({
        filePath: widgetPath,
        offset: widgetSource.indexOf("sym"),
        newName: "token",
      });
      expect(renamePlan.fileEdits.some((fe) => fe.filePath === widgetPath)).toBe(true);
    } finally {
      session.dispose();
    }
  });
});

describe("move crossing a package exports boundary", () => {
  // A move that would require rewriting a package `exports` subpath target is out
  // of MVP scope: the planner must emit a scope warning instead of silently
  // rewriting the boundary. (Requirement 2.4)
  test("planMove emits a scope warning when the moved file is a package exports target", () => {
    const tsconfigPath = writeTsconfig();
    write(
      "package.json",
      JSON.stringify(
        {
          name: "fixture-pkg",
          type: "module",
          exports: {
            ".": "./src/index.ts",
            "./date": "./src/lib/date.ts",
          },
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
    write("src/index.ts", 'export * from "./lib/date";\n');

    const toPath = join(root, "src/time/date.ts");

    const session = newSession(tsconfigPath);
    try {
      const plan = session.planMove({ from: datePath, to: toPath });

      const warningText = plan.scope.warnings.join(" ").toLowerCase();
      expect(plan.scope.warnings.length).toBeGreaterThan(0);
      expect(warningText).toContain("exports");
    } finally {
      session.dispose();
    }
  });
});
