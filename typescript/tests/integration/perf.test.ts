import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { TsMorphEngine } from "../../lib/ts-refactor/engine/ts-morph-engine";
import { Session } from "../../lib/ts-refactor/session";

// Performance regression checks (R9.1, R9.2, R9.3).
//
// These assert structural invariants observed via status() counters rather than
// absolute wall-clock numbers: warm operations must not re-pay the program
// build (programBuildCount stays flat), and heap usage must plateau under the
// forgetNodesCreatedInBlock discipline. Timing is only used as a tolerant
// secondary signal (ratios, never absolute milliseconds) to keep the test from
// flaking on a loaded CI machine.

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ts-refactor-perf-"));
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

// Builds a fixture project large enough that a full program rebuild is clearly
// more expensive than a warm position-addressed rename, so the cold/warm ratio
// is meaningful without being tied to absolute timings.
function fixtureProject(moduleCount: number): {
  tsconfigPath: string;
  defPath: string;
  defText: string;
} {
  const tsconfigPath = tsconfig();
  const defText = "export const widget = 1;\n";
  const defPath = write("src/def.ts", defText);

  for (let i = 0; i < moduleCount; i++) {
    write(
      `src/use-${i}.ts`,
      `import { widget } from "./def";\nexport const use${i} = widget + ${i};\n`,
    );
  }

  return { tsconfigPath, defPath, defText };
}

function newSession(): Session {
  return new Session(new TsMorphEngine(), {
    readFileText: (filePath) => readFileSync(filePath, "utf8"),
    displayRoot: root,
  });
}

describe("ts-refactor performance regression", () => {
  test("R9.1 cold-vs-warm: warm rename reuses the warm program (no rebuild) and is not slower than cold", () => {
    const { tsconfigPath, defPath, defText } = fixtureProject(40);
    const offset = offsetOf(defText, "widget");

    // Cold: fresh session pays the one-time program build during loadProject,
    // then plans the rename against the just-built program.
    const coldSession = newSession();
    const coldStart = performance.now();
    coldSession.loadProject({ tsconfigPath });
    coldSession.planRename({ filePath: defPath, offset, newName: "gadget" });
    const coldMs = performance.now() - coldStart;
    const afterColdBuilds = coldSession.status().programBuildCount;

    // Warm: the SAME session plans the SAME rename again. No loadProject, so no
    // rebuild is permitted.
    const warmStart = performance.now();
    coldSession.planRename({ filePath: defPath, offset, newName: "gizmo" });
    const warmMs = performance.now() - warmStart;
    const afterWarmBuilds = coldSession.status().programBuildCount;

    coldSession.dispose();

    // The load-bearing invariant: the warm operation did not rebuild the program.
    expect(afterColdBuilds).toBe(1);
    expect(afterWarmBuilds).toBe(afterColdBuilds);

    // Tolerant secondary signal: warm should not cost dramatically more than the
    // cold path that included the build. Generous ceiling to avoid CI flake.
    expect(warmMs).toBeLessThanOrEqual(coldMs * 3 + 50);
  }, 60_000);

  test("R9.2 warm session does not rebuild the program across many plan+apply operations", async () => {
    const { tsconfigPath, defPath } = fixtureProject(20);

    const session = newSession();
    session.loadProject({ tsconfigPath });
    expect(session.status().programBuildCount).toBe(1);

    // Alternate the rename target back and forth and apply each plan so the warm
    // engine refreshes files in place. None of this is allowed to rebuild.
    let currentName = "widget";
    const names = ["alpha", "beta", "gamma", "delta", "epsilon"];
    for (const nextName of names) {
      const currentText = readFileSync(defPath, "utf8");
      const offset = offsetOf(currentText, currentName);
      const plan = session.planRename({ filePath: defPath, offset, newName: nextName });
      await session.apply(plan, {});
      expect(session.status().programBuildCount).toBe(1);
      currentName = nextName;
    }

    // The declaration and every importer reflect the final rename.
    expect(readFileSync(defPath, "utf8")).toContain("export const epsilon");
    expect(readFileSync(join(root, "src/use-0.ts"), "utf8")).toContain("epsilon");

    expect(session.status().programBuildCount).toBe(1);
    expect(session.status().operationCount).toBeGreaterThanOrEqual(names.length * 2);

    session.dispose();
  }, 60_000);

  test("R9.3 heap plateaus across many plan-only operations (forgetNodesCreatedInBlock discipline)", () => {
    const { tsconfigPath, defPath, defText } = fixtureProject(20);
    const offset = offsetOf(defText, "widget");

    const session = newSession();
    session.loadProject({ tsconfigPath });

    const iterations = 80;
    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      // Plan-only (no apply): repeatedly walks the same warm program and asserts
      // the heap stays bounded. The current backend resolves references through
      // the raw compiler LanguageService (compilerObject.findRenameLocations),
      // not ts-morph wrapper nodes, so the plateau here is driven by reusing the
      // warm program rather than by forgetNodesCreatedInBlock; the wrapper-cache
      // discipline is retained as cheap insurance for a future wrapper-traversing
      // backend (the Req-8 engine seam).
      session.planRename({ filePath: defPath, offset, newName: `name${i}` });
      samples.push(session.status().heapUsed);
    }

    // The program was never rebuilt by the plan-only loop.
    expect(session.status().programBuildCount).toBe(1);

    // Compare the average heap of an early window against a late window. Under a
    // bounded (plateaued) heap the late window must not balloon relative to the
    // early window. Thresholds are intentionally generous: GC timing makes any
    // single sample noisy, so we compare windowed averages and allow growth up
    // to 2x. An unbounded leak across these iterations over a multi-importer
    // program would blow well past this.
    const windowSize = 20;
    const earlyAvg = average(samples.slice(0, windowSize));
    const lateAvg = average(samples.slice(samples.length - windowSize));

    expect(lateAvg).toBeLessThanOrEqual(earlyAvg * 2);

    session.dispose();
  }, 60_000);
});

function average(values: number[]): number {
  if (values.length === 0) throw new Error("cannot average an empty window");
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}
