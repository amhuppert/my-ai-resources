import { describe, expect, test } from "bun:test";
import {
  EngineError,
  NoSymbolError,
  StaleApplyError,
  UsageError,
} from "./errors";
import {
  ENGINE,
  exitCodeForError,
  formatError,
  NO_SYMBOL,
  REJECTED_APPLY,
  SUCCESS,
  summarizeApply,
  summarizePlan,
  USAGE,
} from "./reporter";
import type { ApplyResult, EditPlan } from "./types";

describe("exit code constants", () => {
  test("match the documented CLI exit codes (R6.5)", () => {
    expect(SUCCESS).toBe(0);
    expect(USAGE).toBe(2);
    expect(NO_SYMBOL).toBe(3);
    expect(REJECTED_APPLY).toBe(4);
    expect(ENGINE).toBe(5);
  });
});

describe("exitCodeForError", () => {
  test("maps UsageError to USAGE (2)", () => {
    expect(exitCodeForError(new UsageError("bad position"))).toBe(USAGE);
  });

  test("maps NoSymbolError to NO_SYMBOL (3)", () => {
    expect(exitCodeForError(new NoSymbolError("no symbol", "foo"))).toBe(
      NO_SYMBOL
    );
  });

  test("maps StaleApplyError to REJECTED_APPLY (4)", () => {
    expect(
      exitCodeForError(new StaleApplyError("stale", ["/a.ts"]))
    ).toBe(REJECTED_APPLY);
  });

  test("maps EngineError to ENGINE (5)", () => {
    expect(exitCodeForError(new EngineError("boom"))).toBe(ENGINE);
  });

  test("maps an unknown error to ENGINE (5)", () => {
    expect(exitCodeForError(new Error("plain"))).toBe(ENGINE);
    expect(exitCodeForError("a string")).toBe(ENGINE);
    expect(exitCodeForError(undefined)).toBe(ENGINE);
    expect(exitCodeForError({ random: true })).toBe(ENGINE);
  });
});

describe("formatError", () => {
  test("returns the protocol error shape for a RefactorError", () => {
    expect(formatError(new UsageError("missing --to"))).toEqual({
      code: "usage",
      message: "missing --to",
    });
  });

  test("returns the no_symbol code for NoSymbolError", () => {
    expect(formatError(new NoSymbolError("nothing here", "tok"))).toEqual({
      code: "no_symbol",
      message: "nothing here",
    });
  });

  test("falls back to the engine code with the error message for a plain Error", () => {
    expect(formatError(new Error("kaboom"))).toEqual({
      code: "engine",
      message: "kaboom",
    });
  });

  test("falls back to the engine code for a non-Error value", () => {
    const result = formatError("just a string");
    expect(result.code).toBe("engine");
    expect(result.message).toContain("just a string");
  });
});

function makePlan(overrides: Partial<EditPlan> = {}): EditPlan {
  const base: EditPlan = {
    planId: "plan-1",
    operation: "rename",
    fileEdits: [
      {
        filePath: "/repo/src/a.ts",
        baseSha256: "aaa",
        edits: [
          {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 4, offset: 3 },
            newText: "Bar",
          },
        ],
      },
      {
        filePath: "/repo/src/b.ts",
        baseSha256: "bbb",
        edits: [
          {
            start: { line: 2, column: 1, offset: 10 },
            end: { line: 2, column: 4, offset: 13 },
            newText: "Bar",
          },
          {
            start: { line: 3, column: 1, offset: 20 },
            end: { line: 3, column: 4, offset: 23 },
            newText: "Bar",
          },
        ],
      },
    ],
    fileRenames: [],
    scope: {
      tsconfigPath: "/repo/tsconfig.json",
      filesLoaded: 42,
      warnings: [],
    },
    summary: {
      filesTouched: 2,
      editCount: 3,
      references: 3,
    },
    unifiedDiff: "--- diff ---",
  };
  return { ...base, ...overrides };
}

describe("summarizePlan", () => {
  test("includes operation and the summary counts", () => {
    const out = summarizePlan(makePlan());
    expect(out).toContain("rename");
    expect(out).toContain("2"); // filesTouched
    expect(out).toContain("3"); // editCount / references
    expect(out.toLowerCase()).toContain("files");
    expect(out.toLowerCase()).toContain("edit");
    expect(out.toLowerCase()).toContain("reference");
  });

  test("renders scope warnings as heuristic disclosures", () => {
    const out = summarizePlan(
      makePlan({
        scope: {
          tsconfigPath: "/repo/tsconfig.json",
          filesLoaded: 42,
          warnings: [
            "symbol exported via public entry point; external references may exist and are not covered",
          ],
        },
      })
    );
    expect(out.toUpperCase()).toContain("HEURISTIC");
    expect(out).toContain(
      "symbol exported via public entry point; external references may exist and are not covered"
    );
  });

  test("does not claim completeness when there are no warnings", () => {
    const out = summarizePlan(makePlan()).toLowerCase();
    expect(out).not.toContain("complete");
    expect(out).not.toContain("all references");
    expect(out).not.toContain("guarantee");
    expect(out).not.toContain("every reference");
  });

  test("never frames a warning as a detected reference", () => {
    const out = summarizePlan(
      makePlan({
        scope: {
          tsconfigPath: "/repo/tsconfig.json",
          filesLoaded: 42,
          warnings: ["public entry point reachable"],
        },
      })
    ).toLowerCase();
    expect(out).not.toContain("detected reference");
    expect(out).not.toContain("found reference");
  });

  test("reports the loaded scope (tsconfig and files loaded)", () => {
    const out = summarizePlan(makePlan());
    expect(out).toContain("/repo/tsconfig.json");
    expect(out).toContain("42");
  });
});

describe("summarizeApply", () => {
  test("lists written files", () => {
    const result: ApplyResult = {
      written: ["/repo/src/a.ts", "/repo/src/b.ts"],
      renamed: [],
    };
    const out = summarizeApply(result);
    expect(out).toContain("/repo/src/a.ts");
    expect(out).toContain("/repo/src/b.ts");
    expect(out.toLowerCase()).toContain("written");
  });

  test("lists renamed files as from -> to", () => {
    const result: ApplyResult = {
      written: ["/repo/src/old.ts"],
      renamed: [
        {
          from: "/repo/src/old.ts",
          to: "/repo/src/new.ts",
          fromSha256: "abc",
          overwrite: false,
        },
      ],
    };
    const out = summarizeApply(result);
    expect(out).toContain("/repo/src/old.ts");
    expect(out).toContain("/repo/src/new.ts");
    expect(out.toLowerCase()).toContain("renamed");
  });

  test("handles an empty apply result without crashing", () => {
    const out = summarizeApply({ written: [], renamed: [] });
    expect(typeof out).toBe("string");
    expect(out).toContain("0");
  });
});
