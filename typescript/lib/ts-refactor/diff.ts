import type { FileEdits, FileRename, TextEdit } from "./types";

export interface RenderUnifiedDiffInput {
  fileEdits: FileEdits[];
  fileRenames: FileRename[];
  readFileText: (filePath: string) => string;
  // Absolute directory used to shorten displayed paths (e.g. the project root).
  // When omitted, paths are shown relative to the common parent of all files.
  displayRoot?: string;
}

interface DiffLine {
  kind: "context" | "del" | "add";
  text: string;
}

export function renderUnifiedDiff(input: RenderUnifiedDiffInput): string {
  const { fileEdits, fileRenames, readFileText } = input;

  const displayRoot =
    input.displayRoot ??
    commonParentDir([
      ...fileEdits.map((f) => f.filePath),
      ...fileRenames.flatMap((r) => [r.from, r.to]),
    ]);

  const sections: string[] = [];

  for (const rename of fileRenames) {
    sections.push(
      `rename: ${displayPath(rename.from, displayRoot)} -> ${displayPath(
        rename.to,
        displayRoot
      )}`
    );
  }

  for (const file of fileEdits) {
    sections.push(renderFileSection(file, displayRoot, readFileText));
  }

  return sections.join("\n");
}

function renderFileSection(
  file: FileEdits,
  displayRoot: string,
  readFileText: (filePath: string) => string
): string {
  const original = readFileText(file.filePath);
  const updated = applyEdits(original, file.edits);

  const display = displayPath(file.filePath, displayRoot);
  const header = [`--- a/${display}`, `+++ b/${display}`];

  const body = diffLines(splitLines(original), splitLines(updated)).map(
    formatDiffLine
  );

  return [...header, ...body].join("\n");
}

// Apply edits end-to-start so earlier offsets stay valid as later spans change.
export function applyEdits(original: string, edits: TextEdit[]): string {
  const ordered = [...edits].sort((a, b) => b.start.offset - a.start.offset);
  let result = original;
  for (const edit of ordered) {
    result =
      result.slice(0, edit.start.offset) +
      edit.newText +
      result.slice(edit.end.offset);
  }
  return result;
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  // A trailing newline produces a final empty element that is not a real line.
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function formatDiffLine(line: DiffLine): string {
  if (line.kind === "del") return `-${line.text}`;
  if (line.kind === "add") return `+${line.text}`;
  return ` ${line.text}`;
}

// Line-level diff via longest-common-subsequence backtrace.
function diffLines(a: string[], b: string[]): DiffLine[] {
  const lcs = lcsTable(a, b);
  const result: DiffLine[] = [];

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ kind: "context", text: a[i] ?? "" });
      i += 1;
      j += 1;
      continue;
    }
    const down = lcs[i + 1]?.[j] ?? 0;
    const right = lcs[i]?.[j + 1] ?? 0;
    if (down >= right) {
      result.push({ kind: "del", text: a[i] ?? "" });
      i += 1;
    } else {
      result.push({ kind: "add", text: b[j] ?? "" });
      j += 1;
    }
  }
  while (i < a.length) {
    result.push({ kind: "del", text: a[i] ?? "" });
    i += 1;
  }
  while (j < b.length) {
    result.push({ kind: "add", text: b[j] ?? "" });
    j += 1;
  }
  return result;
}

function lcsTable(a: string[], b: string[]): number[][] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    const rowNext = table[i + 1] ?? [];
    const row = table[i] ?? [];
    for (let j = b.length - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        row[j] = (rowNext[j + 1] ?? 0) + 1;
      } else {
        row[j] = Math.max(rowNext[j] ?? 0, row[j + 1] ?? 0);
      }
    }
  }
  return table;
}

function commonParentDir(paths: string[]): string {
  if (paths.length === 0) return "";
  const split = paths.map((p) => p.split("/"));
  const first = split[0] ?? [];
  // The parent directory excludes the final basename segment.
  let prefixLen = first.length - 1;
  for (const segments of split) {
    let k = 0;
    while (
      k < prefixLen &&
      k < segments.length - 1 &&
      segments[k] === first[k]
    ) {
      k += 1;
    }
    prefixLen = k;
  }
  return first.slice(0, prefixLen).join("/");
}

function displayPath(filePath: string, root: string): string {
  if (root !== "" && filePath.startsWith(`${root}/`)) {
    return filePath.slice(root.length + 1);
  }
  return filePath;
}
