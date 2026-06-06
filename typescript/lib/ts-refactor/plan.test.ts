import { describe, expect, test } from "bun:test";
import { buildEditPlan, type BuildEditPlanDeps } from "./plan";
import type { PlanDraft, Position } from "./types";

function pos(line: number, column: number, offset: number): Position {
  return { line, column, offset };
}

function renameDraft(): PlanDraft {
  return {
    operation: "rename",
    fileEdits: [
      {
        filePath: "/repo/src/a.ts",
        baseSha256: "sha-a",
        edits: [
          { start: pos(1, 7, 6), end: pos(1, 10, 9), newText: "baz" },
        ],
      },
      {
        filePath: "/repo/src/b.ts",
        baseSha256: "sha-b",
        edits: [
          { start: pos(2, 5, 20), end: pos(2, 8, 23), newText: "baz" },
          { start: pos(5, 1, 40), end: pos(5, 4, 43), newText: "baz" },
        ],
      },
    ],
    fileRenames: [],
    scope: {
      tsconfigPath: "/repo/tsconfig.json",
      filesLoaded: 12,
      warnings: [],
    },
  };
}

const deps: BuildEditPlanDeps = {
  readFileText: (filePath) => {
    if (filePath === "/repo/src/a.ts") return "const foo = 1;\nconst x = foo;\n";
    if (filePath === "/repo/src/b.ts")
      return "line0\nline1 foo here\nline2\nline3\nfoo at five\n";
    if (filePath === "/repo/src/old.ts") return "export const v = 1;\n";
    return "";
  },
};

describe("buildEditPlan planId", () => {
  test("identical drafts produce identical planId", () => {
    const a = buildEditPlan(renameDraft(), deps);
    const b = buildEditPlan(renameDraft(), deps);
    expect(a.planId).toBe(b.planId);
    expect(a.planId.length).toBeGreaterThan(0);
  });

  test("planId is independent of object key ordering", () => {
    const ordered = renameDraft();
    const reordered: PlanDraft = {
      // Different key insertion order, identical content.
      scope: ordered.scope,
      fileRenames: ordered.fileRenames,
      fileEdits: ordered.fileEdits,
      operation: ordered.operation,
    };
    expect(buildEditPlan(ordered, deps).planId).toBe(
      buildEditPlan(reordered, deps).planId
    );
  });

  test("mutating one edit changes the planId", () => {
    const base = buildEditPlan(renameDraft(), deps);
    const mutated = renameDraft();
    const firstFile = mutated.fileEdits[0];
    if (!firstFile) throw new Error("fixture missing fileEdits[0]");
    const firstEdit = firstFile.edits[0];
    if (!firstEdit) throw new Error("fixture missing edits[0]");
    firstEdit.newText = "different";
    expect(buildEditPlan(mutated, deps).planId).not.toBe(base.planId);
  });

  test("changing scope changes the planId", () => {
    const base = buildEditPlan(renameDraft(), deps);
    const mutated = renameDraft();
    mutated.scope.warnings = ["symbol exported via public entry point"];
    expect(buildEditPlan(mutated, deps).planId).not.toBe(base.planId);
  });
});

describe("buildEditPlan summary", () => {
  test("counts distinct files, edits, and references across edits and renames", () => {
    const draft: PlanDraft = {
      operation: "move",
      fileEdits: [
        {
          filePath: "/repo/src/a.ts",
          baseSha256: "sha-a",
          edits: [
            { start: pos(1, 1, 0), end: pos(1, 2, 1), newText: "Z" },
            { start: pos(2, 1, 10), end: pos(2, 2, 11), newText: "Y" },
          ],
        },
        {
          filePath: "/repo/src/b.ts",
          baseSha256: "sha-b",
          edits: [{ start: pos(1, 1, 0), end: pos(1, 2, 1), newText: "X" }],
        },
      ],
      fileRenames: [
        {
          from: "/repo/src/old.ts",
          to: "/repo/src/new.ts",
          fromSha256: "sha-old",
          overwrite: false,
        },
      ],
      scope: {
        tsconfigPath: "/repo/tsconfig.json",
        filesLoaded: 5,
        warnings: [],
      },
    };

    const plan = buildEditPlan(draft, deps);
    // distinct files: a.ts, b.ts (edited) + old.ts (renamed) = 3
    expect(plan.summary.filesTouched).toBe(3);
    // total edits: 2 + 1 = 3
    expect(plan.summary.editCount).toBe(3);
    // each edit is a reference rewrite
    expect(plan.summary.references).toBe(3);
  });

  test("a file that is both edited and renamed counts once in filesTouched", () => {
    const draft: PlanDraft = {
      operation: "move",
      fileEdits: [
        {
          filePath: "/repo/src/old.ts",
          baseSha256: "sha-old",
          edits: [{ start: pos(1, 1, 0), end: pos(1, 2, 1), newText: "Z" }],
        },
      ],
      fileRenames: [
        {
          from: "/repo/src/old.ts",
          to: "/repo/src/new.ts",
          fromSha256: "sha-old",
          overwrite: false,
        },
      ],
      scope: {
        tsconfigPath: "/repo/tsconfig.json",
        filesLoaded: 2,
        warnings: [],
      },
    };

    const plan = buildEditPlan(draft, deps);
    expect(plan.summary.filesTouched).toBe(1);
    expect(plan.summary.editCount).toBe(1);
  });
});

describe("buildEditPlan unifiedDiff", () => {
  test("includes +/- lines for edits and a rename header", () => {
    const draft: PlanDraft = {
      operation: "move",
      fileEdits: [
        {
          filePath: "/repo/src/a.ts",
          baseSha256: "sha-a",
          // foo (offset 6..9) -> baz
          edits: [{ start: pos(1, 7, 6), end: pos(1, 10, 9), newText: "baz" }],
        },
      ],
      fileRenames: [
        {
          from: "/repo/src/old.ts",
          to: "/repo/src/new.ts",
          fromSha256: "sha-old",
          overwrite: false,
        },
      ],
      scope: {
        tsconfigPath: "/repo/tsconfig.json",
        filesLoaded: 5,
        warnings: [],
      },
    };

    const plan = buildEditPlan(draft, deps);
    expect(plan.unifiedDiff).toContain("-const foo = 1;");
    expect(plan.unifiedDiff).toContain("+const baz = 1;");
    expect(plan.unifiedDiff).toContain("rename: old.ts -> new.ts");
  });

  test("derived plan preserves the draft fields verbatim", () => {
    const draft = renameDraft();
    const plan = buildEditPlan(draft, deps);
    expect(plan.operation).toBe(draft.operation);
    expect(plan.fileEdits).toEqual(draft.fileEdits);
    expect(plan.fileRenames).toEqual(draft.fileRenames);
    expect(plan.scope).toEqual(draft.scope);
  });
});
