import { describe, expect, test } from "bun:test";
import { renderUnifiedDiff } from "./diff";
import type { FileEdits, FileRename, Position } from "./types";

function pos(line: number, column: number, offset: number): Position {
  return { line, column, offset };
}

describe("renderUnifiedDiff", () => {
  test("renders +/- lines for a single-edit file", () => {
    const original = "const foo = 1;\nconst bar = foo;\n";
    const fileEdits: FileEdits[] = [
      {
        filePath: "/abs/src/a.ts",
        baseSha256: "sha-a",
        // rename `foo` declaration on line 1 (offset 6..9) to `baz`
        edits: [
          {
            start: pos(1, 7, 6),
            end: pos(1, 10, 9),
            newText: "baz",
          },
        ],
      },
    ];

    const diff = renderUnifiedDiff({
      fileEdits,
      fileRenames: [],
      readFileText: () => original,
      displayRoot: "/abs",
    });

    expect(diff).toContain("--- a/src/a.ts");
    expect(diff).toContain("+++ b/src/a.ts");
    expect(diff).toContain("-const foo = 1;");
    expect(diff).toContain("+const baz = 1;");
    // unchanged line stays as context
    expect(diff).toContain(" const bar = foo;");
  });

  test("applies multiple edits end-to-start to compute new text", () => {
    const original = "alpha beta gamma\n";
    const fileEdits: FileEdits[] = [
      {
        filePath: "/abs/x.ts",
        baseSha256: "sha-x",
        edits: [
          // alpha -> A (offset 0..5)
          { start: pos(1, 1, 0), end: pos(1, 6, 5), newText: "A" },
          // gamma -> G (offset 11..16)
          { start: pos(1, 12, 11), end: pos(1, 17, 16), newText: "G" },
        ],
      },
    ];

    const diff = renderUnifiedDiff({
      fileEdits,
      fileRenames: [],
      readFileText: () => original,
    });

    expect(diff).toContain("-alpha beta gamma");
    expect(diff).toContain("+A beta G");
  });

  test("renders a rename header for a file rename", () => {
    const fileRenames: FileRename[] = [
      {
        from: "/abs/src/old.ts",
        to: "/abs/src/new.ts",
        fromSha256: "sha-old",
        overwrite: false,
      },
    ];

    const diff = renderUnifiedDiff({
      fileEdits: [],
      fileRenames,
      readFileText: () => "",
      displayRoot: "/abs",
    });

    expect(diff).toContain("rename: src/old.ts -> src/new.ts");
  });

  test("renders both rename header and edits for a renamed-and-edited file", () => {
    const original = "import { x } from './dep';\n";
    const renamedPath = "/abs/src/dep.ts";
    const fileRenames: FileRename[] = [
      {
        from: renamedPath,
        to: "/abs/src/renamed.ts",
        fromSha256: "sha-dep",
        overwrite: false,
      },
    ];
    const fileEdits: FileEdits[] = [
      {
        filePath: renamedPath,
        baseSha256: "sha-dep",
        // replace `x` (offset 9..10) with `y`
        edits: [{ start: pos(1, 10, 9), end: pos(1, 11, 10), newText: "y" }],
      },
    ];

    const diff = renderUnifiedDiff({
      fileEdits,
      fileRenames,
      readFileText: () => original,
      displayRoot: "/abs",
    });

    expect(diff).toContain("rename: src/dep.ts -> src/renamed.ts");
    expect(diff).toContain("-import { x } from './dep';");
    expect(diff).toContain("+import { y } from './dep';");
  });

  test("displays paths relative to the common parent directory", () => {
    const fileEdits: FileEdits[] = [
      {
        filePath: "/repo/src/one.ts",
        baseSha256: "sha1",
        edits: [{ start: pos(1, 1, 0), end: pos(1, 2, 1), newText: "Z" }],
      },
      {
        filePath: "/repo/src/nested/two.ts",
        baseSha256: "sha2",
        edits: [{ start: pos(1, 1, 0), end: pos(1, 2, 1), newText: "Y" }],
      },
    ];

    const diff = renderUnifiedDiff({
      fileEdits,
      fileRenames: [],
      readFileText: () => "a\n",
    });

    expect(diff).toContain("--- a/one.ts");
    expect(diff).toContain("--- a/nested/two.ts");
  });
});
