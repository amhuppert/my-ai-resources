import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyEditPlan } from "./apply";
import { StaleApplyError } from "./errors";
import { fingerprintDirectory } from "./fingerprint";
import type {
  EditPlan,
  FileEdits,
  FileRename,
  Position,
  TextEdit,
} from "./types";

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function position(offset: number): Position {
  return { line: 1, column: offset, offset };
}

function textEdit(start: number, end: number, newText: string): TextEdit {
  return { start: position(start), end: position(end), newText };
}

function makePlan(overrides: {
  operation?: EditPlan["operation"];
  fileEdits?: FileEdits[];
  fileRenames?: FileRename[];
}): EditPlan {
  return {
    operation: overrides.operation ?? "rename",
    fileEdits: overrides.fileEdits ?? [],
    fileRenames: overrides.fileRenames ?? [],
    scope: { tsconfigPath: "tsconfig.json", filesLoaded: 1, warnings: [] },
    planId: "plan-1",
    summary: { filesTouched: 1, editCount: 1, references: 1 },
    unifiedDiff: "",
  };
}

describe("applyEditPlan", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ts-refactor-apply-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("happy path: writes edits and performs renames, returns result", async () => {
    const filePath = join(dir, "a.ts");
    const original = "const oldName = 1;\n";
    writeFileSync(filePath, original, "utf8");

    const fromPath = join(dir, "b.ts");
    const toPath = join(dir, "moved", "b.ts");
    const fromContent = "export const x = 2;\n";
    writeFileSync(fromPath, fromContent, "utf8");

    const plan = makePlan({
      fileEdits: [
        {
          filePath,
          baseSha256: sha256(original),
          edits: [textEdit(6, 13, "newName")],
        },
      ],
      fileRenames: [
        {
          from: fromPath,
          to: toPath,
          fromSha256: sha256(fromContent),
          overwrite: false,
        },
      ],
    });

    const result = await applyEditPlan(plan, {});

    expect(result.written).toEqual([filePath]);
    expect(result.renamed).toEqual([
      {
        from: fromPath,
        to: toPath,
        fromSha256: sha256(fromContent),
        overwrite: false,
      },
    ]);
    expect(readFileSync(filePath, "utf8")).toBe("const newName = 1;\n");
    expect(existsSync(fromPath)).toBe(false);
    expect(readFileSync(toPath, "utf8")).toBe(fromContent);
  });

  test("stale content target throws StaleApplyError and writes nothing", async () => {
    const filePath = join(dir, "a.ts");
    const onDisk = "const changed = 1;\n";
    writeFileSync(filePath, onDisk, "utf8");

    const plan = makePlan({
      fileEdits: [
        {
          filePath,
          baseSha256: sha256("const original = 1;\n"),
          edits: [textEdit(6, 14, "renamed")],
        },
      ],
    });

    await expect(applyEditPlan(plan, {})).rejects.toBeInstanceOf(
      StaleApplyError
    );
    // unchanged
    expect(readFileSync(filePath, "utf8")).toBe(onDisk);
  });

  test("StaleApplyError lists every offending path", async () => {
    const fileA = join(dir, "a.ts");
    const fileB = join(dir, "b.ts");
    const fileC = join(dir, "c.ts");
    writeFileSync(fileA, "drift\n", "utf8");
    writeFileSync(fileB, "ok\n", "utf8");
    writeFileSync(fileC, "drift\n", "utf8");

    const plan = makePlan({
      fileEdits: [
        {
          filePath: fileA,
          baseSha256: sha256("expected-a\n"),
          edits: [textEdit(0, 0, "")],
        },
        {
          filePath: fileB,
          baseSha256: sha256("ok\n"),
          edits: [textEdit(0, 0, "")],
        },
        {
          filePath: fileC,
          baseSha256: sha256("expected-c\n"),
          edits: [textEdit(0, 0, "")],
        },
      ],
    });

    try {
      await applyEditPlan(plan, {});
      throw new Error("expected StaleApplyError");
    } catch (err) {
      expect(err).toBeInstanceOf(StaleApplyError);
      if (err instanceof StaleApplyError) {
        expect(err.paths).toContain(fileA);
        expect(err.paths).toContain(fileC);
        expect(err.paths).not.toContain(fileB);
      }
    }
  });

  test("stale rename source (fromSha256 mismatch) rejects", async () => {
    const fromPath = join(dir, "from.ts");
    const toPath = join(dir, "to.ts");
    writeFileSync(fromPath, "current\n", "utf8");

    const plan = makePlan({
      operation: "move",
      fileRenames: [
        {
          from: fromPath,
          to: toPath,
          fromSha256: sha256("planned\n"),
          overwrite: false,
        },
      ],
    });

    await expect(applyEditPlan(plan, {})).rejects.toBeInstanceOf(
      StaleApplyError
    );
    expect(existsSync(fromPath)).toBe(true);
    expect(existsSync(toPath)).toBe(false);
  });

  test("destination collision with overwrite:false rejects even under allowStale", async () => {
    const fromPath = join(dir, "from.ts");
    const toPath = join(dir, "to.ts");
    const fromContent = "src\n";
    writeFileSync(fromPath, fromContent, "utf8");
    writeFileSync(toPath, "existing\n", "utf8");

    const plan = makePlan({
      operation: "move",
      fileRenames: [
        {
          from: fromPath,
          to: toPath,
          // intentionally mismatched to prove allowStale relaxes content only
          fromSha256: sha256("does-not-match\n"),
          overwrite: false,
        },
      ],
    });

    await expect(
      applyEditPlan(plan, { allowStale: true })
    ).rejects.toBeInstanceOf(StaleApplyError);
    expect(readFileSync(toPath, "utf8")).toBe("existing\n");
    expect(readFileSync(fromPath, "utf8")).toBe(fromContent);
  });

  test("allowStale overrides content staleness and emits a warning", async () => {
    const filePath = join(dir, "a.ts");
    const onDisk = "const drifted = 1;\n";
    writeFileSync(filePath, onDisk, "utf8");

    const warnings: string[] = [];
    const plan = makePlan({
      fileEdits: [
        {
          filePath,
          baseSha256: sha256("const planned = 1;\n"),
          edits: [textEdit(6, 13, "applied")],
        },
      ],
    });

    const result = await applyEditPlan(plan, {
      allowStale: true,
      warn: (msg) => warnings.push(msg),
    });

    expect(result.written).toEqual([filePath]);
    expect(readFileSync(filePath, "utf8")).toBe("const applied = 1;\n");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => /stale/i.test(w))).toBe(true);
  });

  test("allowStale still rejects a pre-existing destination", async () => {
    const fromPath = join(dir, "from.ts");
    const toPath = join(dir, "to.ts");
    writeFileSync(fromPath, "drifted-source\n", "utf8");
    writeFileSync(toPath, "occupied\n", "utf8");

    const warnings: string[] = [];
    const plan = makePlan({
      operation: "move",
      fileRenames: [
        {
          from: fromPath,
          to: toPath,
          fromSha256: sha256("planned-source\n"),
          overwrite: false,
        },
      ],
    });

    await expect(
      applyEditPlan(plan, { allowStale: true, warn: (m) => warnings.push(m) })
    ).rejects.toBeInstanceOf(StaleApplyError);
    expect(readFileSync(toPath, "utf8")).toBe("occupied\n");
  });

  test("overwrite:true allows replacing an existing destination", async () => {
    const fromPath = join(dir, "from.ts");
    const toPath = join(dir, "to.ts");
    const fromContent = "replacement\n";
    writeFileSync(fromPath, fromContent, "utf8");
    writeFileSync(toPath, "old-target\n", "utf8");

    const plan = makePlan({
      operation: "move",
      fileRenames: [
        {
          from: fromPath,
          to: toPath,
          fromSha256: sha256(fromContent),
          overwrite: true,
        },
      ],
    });

    const result = await applyEditPlan(plan, {});

    expect(result.renamed.length).toBe(1);
    expect(existsSync(fromPath)).toBe(false);
    expect(readFileSync(toPath, "utf8")).toBe(fromContent);
  });

  test("file that is both edited and renamed: edits land on from, then moved to to", async () => {
    const fromPath = join(dir, "src", "feature.ts");
    const toPath = join(dir, "dest", "feature.ts");
    mkdirSync(join(dir, "src"), { recursive: true });
    const fromContent = "export const oldName = 42;\n";
    writeFileSync(fromPath, fromContent, "utf8");

    const plan = makePlan({
      operation: "move",
      fileEdits: [
        {
          filePath: fromPath,
          baseSha256: sha256(fromContent),
          edits: [textEdit(13, 20, "newName")],
        },
      ],
      fileRenames: [
        {
          from: fromPath,
          to: toPath,
          fromSha256: sha256(fromContent),
          overwrite: false,
        },
      ],
    });

    const result = await applyEditPlan(plan, {});

    expect(result.written).toEqual([fromPath]);
    expect(existsSync(fromPath)).toBe(false);
    expect(readFileSync(toPath, "utf8")).toBe("export const newName = 42;\n");
  });

  test("multiple edits in one file apply end-to-start correctly", async () => {
    const filePath = join(dir, "multi.ts");
    const original = "const aaa = bbb + ccc;\n";
    // offsets:  const aaa = bbb + ccc;
    //           012345678901234567890
    //                 ^6  ^12   ^18
    writeFileSync(filePath, original, "utf8");

    const plan = makePlan({
      fileEdits: [
        {
          filePath,
          baseSha256: sha256(original),
          edits: [
            textEdit(6, 9, "ALPHA"),
            textEdit(12, 15, "BETA"),
            textEdit(18, 21, "GAMMA"),
          ],
        },
      ],
    });

    const result = await applyEditPlan(plan, {});

    expect(result.written).toEqual([filePath]);
    expect(readFileSync(filePath, "utf8")).toBe(
      "const ALPHA = BETA + GAMMA;\n"
    );
  });

  test("directory move relocates the subtree and rewrites an external importer", async () => {
    const pkgDir = join(dir, "pkg");
    const newPkgDir = join(dir, "core");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, "a.ts"), "export const a = 1;\n", "utf8");
    writeFileSync(join(pkgDir, "b.ts"), "export const b = 2;\n", "utf8");

    const importer = join(dir, "ext.ts");
    const importerOriginal = 'import { a } from "./pkg/a";\nexport const e = a;\n';
    writeFileSync(importer, importerOriginal, "utf8");

    const plan = makePlan({
      operation: "moveDir",
      fileEdits: [
        {
          filePath: importer,
          baseSha256: sha256(importerOriginal),
          // "./pkg/a" occupies offsets 19..26
          edits: [textEdit(19, 26, "./core/a")],
        },
      ],
      fileRenames: [
        {
          from: pkgDir,
          to: newPkgDir,
          fromSha256: fingerprintDirectory(pkgDir),
          overwrite: false,
        },
      ],
    });

    const result = await applyEditPlan(plan, {});

    expect(result.renamed.length).toBe(1);
    expect(existsSync(pkgDir)).toBe(false);
    expect(readFileSync(join(newPkgDir, "a.ts"), "utf8")).toBe(
      "export const a = 1;\n"
    );
    expect(readFileSync(join(newPkgDir, "b.ts"), "utf8")).toBe(
      "export const b = 2;\n"
    );
    expect(readFileSync(importer, "utf8")).toContain('"./core/a"');
  });

  test("directory move rejects when the subtree changed since planning", async () => {
    const pkgDir = join(dir, "pkg");
    const newPkgDir = join(dir, "core");
    mkdirSync(pkgDir, { recursive: true });
    const inner = join(pkgDir, "a.ts");
    writeFileSync(inner, "export const a = 1;\n", "utf8");
    const plannedFingerprint = fingerprintDirectory(pkgDir);
    // A file inside the directory drifts after planning.
    writeFileSync(inner, "export const a = 999;\n", "utf8");

    const plan = makePlan({
      operation: "moveDir",
      fileRenames: [
        {
          from: pkgDir,
          to: newPkgDir,
          fromSha256: plannedFingerprint,
          overwrite: false,
        },
      ],
    });

    await expect(applyEditPlan(plan, {})).rejects.toBeInstanceOf(StaleApplyError);
    expect(existsSync(pkgDir)).toBe(true);
    expect(existsSync(newPkgDir)).toBe(false);
  });

  test("two renames sharing a destination (overwrite:false) reject as an intra-plan collision", async () => {
    const fromA = join(dir, "a.ts");
    const fromB = join(dir, "b.ts");
    const dest = join(dir, "dest.ts");
    writeFileSync(fromA, "AAA\n", "utf8");
    writeFileSync(fromB, "BBB\n", "utf8");

    const plan = makePlan({
      operation: "move",
      fileRenames: [
        { from: fromA, to: dest, fromSha256: sha256("AAA\n"), overwrite: false },
        { from: fromB, to: dest, fromSha256: sha256("BBB\n"), overwrite: false },
      ],
    });

    await expect(applyEditPlan(plan, {})).rejects.toBeInstanceOf(StaleApplyError);
    // Nothing moved: both sources intact, destination never created.
    expect(readFileSync(fromA, "utf8")).toBe("AAA\n");
    expect(readFileSync(fromB, "utf8")).toBe("BBB\n");
    expect(existsSync(dest)).toBe(false);
  });
});
