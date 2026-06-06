/**
 * Spike: prove the move/move-dir planning backend for ts-refactor (Critical Issue 3).
 *
 * Questions this answers:
 *  Q1 Correctness: does ts.LanguageService.getEditsForFileRename rewrite every
 *     importer across relative / baseUrl / paths-alias / index-barrel / explicit-extension
 *     resolution, plus the moved file's own relative imports?
 *  Q2 Cleanliness (Req 2.3): after planning a move via getEditsForFileRename, is the
 *     warm in-memory Project byte-identical (paths, membership, text) to before?
 *  Q3 Move-dir: does getEditsForFileRename handle a directory path, or must move-dir
 *     be decomposed into per-file renames?
 *  Q4 Fallback: if we instead use ts-morph sourceFile.move() (mutating), can the warm
 *     session be transactionally rolled back to byte-clean? (de-risks the fallback path)
 *
 * Throwaway exploration. Fixture lives in an OS temp dir; nothing in the repo is touched.
 */
import { Project, ts } from "ts-morph";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

type Snapshot = Array<[string, string]>; // sorted [absPath, fullText]

const root = mkdtempSync(join(tmpdir(), "ts-refactor-move-spike-"));

function write(rel: string, content: string): string {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  return abs;
}

// --- fixture project ---------------------------------------------------------
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

write("src/lib/math.ts", `export const add = (a: number, b: number) => a + b;\n`);
const datePath = write(
  "src/lib/date.ts",
  `import { add } from "./math";\nexport const fmt = (n: number): string => \`day \${add(n, 0)}\`;\n`,
);
write("src/lib/index.ts", `export * from "./date";\n`);
write("src/consumers/a-relative.ts", `import { fmt } from "../lib/date";\nexport const a = fmt(1);\n`);
write("src/consumers/b-baseurl.ts", `import { fmt } from "src/lib/date";\nexport const b = fmt(2);\n`);
write("src/consumers/c-paths.ts", `import { fmt } from "@lib/date";\nexport const c = fmt(3);\n`);
write("src/consumers/d-barrel.ts", `import { fmt } from "../lib";\nexport const d = fmt(4);\n`);
write("src/consumers/e-ext.ts", `import { fmt } from "../lib/date.ts";\nexport const e = fmt(5);\n`);

// --- helpers -----------------------------------------------------------------
const project = new Project({ tsConfigFilePath: join(root, "tsconfig.json") });

function snapshot(): Snapshot {
  return project
    .getSourceFiles()
    .map((sf): [string, string] => [sf.getFilePath(), sf.getFullText()])
    .sort((x, y) => x[0].localeCompare(y[0]));
}

function snapshotsEqual(a: Snapshot, b: Snapshot): { equal: boolean; detail: string } {
  if (a.length !== b.length) {
    return { equal: false, detail: `membership changed: ${a.length} -> ${b.length} files` };
  }
  for (let i = 0; i < a.length; i++) {
    const [pa, ta] = a[i]!;
    const [pb, tb] = b[i]!;
    if (pa !== pb) return { equal: false, detail: `path differs at ${i}: ${pa} -> ${pb}` };
    if (ta !== tb) return { equal: false, detail: `TEXT differs for ${pa}` };
  }
  return { equal: true, detail: "byte-identical" };
}

const rel = (p: string) => p.slice(root.length + 1);

/** Map a flat new-specifier out of a TextChange by reading the importer text + span. */
function describeEdits(changes: readonly ts.FileTextChanges[]): string[] {
  const out: string[] = [];
  for (const fc of changes) {
    const sf = project.getSourceFile(fc.fileName);
    const text = sf?.getFullText() ?? "";
    for (const tc of fc.textChanges) {
      const oldText = text.slice(tc.span.start, tc.span.start + tc.span.length);
      out.push(`${rel(fc.fileName)}: ${JSON.stringify(oldText)} -> ${JSON.stringify(tc.newText)}`);
    }
  }
  return out.sort();
}

const lsCompiler = project.getLanguageService().compilerObject;
const fmtSettings = ts.getDefaultFormatCodeSettings();

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};
const pass = (msg: string) => console.log(`  ✓ ${msg}`);

// ============================================================================
// Q1 + Q2: file move via getEditsForFileRename (preferred, non-mutating)
// ============================================================================
console.log("\n=== Q1/Q2: file move via getEditsForFileRename (preferred path) ===");
const newDatePath = join(root, "src/time/date.ts");

const before = snapshot();
const renameChanges = lsCompiler.getEditsForFileRename(datePath, newDatePath, fmtSettings, {});
const after = snapshot();

const described = describeEdits(renameChanges);
console.log(`\n  Edits returned (${described.length}):`);
for (const d of described) console.log(`    ${d}`);

// Which importers got rewritten?
const touched = new Set(renameChanges.map((c) => rel(c.fileName)));
const expectImporters: Record<string, string> = {
  "src/lib/date.ts": "moved file's own relative import (./math)",
  "src/lib/index.ts": "barrel re-export (./date)",
  "src/consumers/a-relative.ts": "relative specifier",
  "src/consumers/b-baseurl.ts": "baseUrl bare specifier",
  "src/consumers/c-paths.ts": "paths alias @lib/*",
  "src/consumers/e-ext.ts": "explicit .ts extension",
};
console.log("\n  Coverage by resolution form:");
for (const [file, form] of Object.entries(expectImporters)) {
  if (touched.has(file)) pass(`${form} — ${file} rewritten`);
  else fail(`${form} — ${file} NOT rewritten (no edit produced)`);
}
// d-barrel imports the index, which is NOT moved -> it should be left alone.
if (touched.has("src/consumers/d-barrel.ts"))
  fail("d-barrel (imports unmoved index) was rewritten — unexpected");
else pass("d-barrel (imports unmoved index) correctly left untouched");

console.log("\n  Q2 cleanliness (Req 2.3):");
const clean = snapshotsEqual(before, after);
if (clean.equal) pass(`warm project byte-identical after planning (${clean.detail})`);
else fail(`warm project MUTATED by planning: ${clean.detail}`);

// ============================================================================
// Q3: directory move — does getEditsForFileRename accept a directory path?
// ============================================================================
console.log("\n=== Q3: directory move (src/lib -> src/core) ===");
const beforeDir = snapshot();
let dirChanges: readonly ts.FileTextChanges[] = [];
let dirThrew = false;
try {
  dirChanges = lsCompiler.getEditsForFileRename(join(root, "src/lib"), join(root, "src/core"), fmtSettings, {});
} catch (e) {
  dirThrew = true;
  console.log(`  directory-path call threw: ${(e as Error).message}`);
}
const afterDir = snapshot();
if (!dirThrew) {
  const dirDescribed = describeEdits(dirChanges);
  console.log(`  Edits returned for directory rename (${dirDescribed.length}):`);
  for (const d of dirDescribed) console.log(`    ${d}`);
  const dirTouched = new Set(dirChanges.map((c) => rel(c.fileName)));
  // Importers of files under src/lib that live OUTSIDE src/lib must be rewritten.
  for (const f of ["src/consumers/a-relative.ts", "src/consumers/b-baseurl.ts", "src/consumers/c-paths.ts", "src/consumers/d-barrel.ts", "src/consumers/e-ext.ts"]) {
    if (dirTouched.has(f)) pass(`dir move rewrote ${f}`);
    else fail(`dir move did NOT rewrite ${f}`);
  }
}
const dirClean = snapshotsEqual(beforeDir, afterDir);
if (dirClean.equal) pass(`warm project byte-identical after dir-move planning (${dirClean.detail})`);
else fail(`warm project MUTATED by dir-move planning: ${dirClean.detail}`);

// ============================================================================
// Q4: fallback — ts-morph sourceFile.move() mutates; can we roll back clean?
// ============================================================================
console.log("\n=== Q4: fallback sourceFile.move() + transactional rollback ===");
const beforeMove = snapshot();
const origText = new Map<string, string>(
  project.getSourceFiles().map((sf): [string, string] => [sf.getFilePath(), sf.getFullText()]),
);

const sf = project.getSourceFileOrThrow(datePath);
sf.move(newDatePath); // MUTATES: changes path + rewrites importers in-memory
const afterMutate = snapshot();
const mutated = !snapshotsEqual(beforeMove, afterMutate).equal;
if (mutated) pass("sourceFile.move() mutates the warm session (expected — why path a is preferred)");
else fail("sourceFile.move() did NOT mutate — unexpected");

// Cross-check: did move() agree with getEditsForFileRename on which importers change?
const mutatedImporters = new Set(
  afterMutate.filter(([p, t]) => origText.get(p) !== undefined && origText.get(p) !== t).map(([p]) => rel(p)),
);
const renameImporters = new Set([...touched].filter((f) => f !== "src/lib/date.ts"));
const agree = [...renameImporters].every((f) => mutatedImporters.has(f));
if (agree) pass("move() and getEditsForFileRename agree on the importer set (cross-validates path a)");
else
  console.log(
    `  ~ importer sets differ — move(): [${[...mutatedImporters].sort()}] vs rename(): [${[...renameImporters].sort()}]`,
  );

// Rollback: move the file back, then restore exact original text for every file.
sf.move(datePath);
for (const f of project.getSourceFiles()) {
  const orig = origText.get(f.getFilePath());
  if (orig !== undefined && f.getFullText() !== orig) f.replaceWithText(orig);
}
const afterRollback = snapshot();
const rolledClean = snapshotsEqual(beforeMove, afterRollback);
if (rolledClean.equal) pass(`transactional rollback restored byte-clean state (${rolledClean.detail})`);
else fail(`rollback FAILED to restore clean state: ${rolledClean.detail}`);

// --- result ------------------------------------------------------------------
console.log(`\n${"=".repeat(60)}`);
console.log(failures === 0 ? "SPIKE RESULT: PASS (0 failures)" : `SPIKE RESULT: ${failures} failure(s)`);
console.log("=".repeat(60));

rmSync(root, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
