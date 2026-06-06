import { createHash } from "node:crypto";
import { renderUnifiedDiff } from "./diff";
import type { EditPlan, EditPlanSummary, PlanDraft } from "./types";

export interface BuildEditPlanDeps {
  readFileText: (filePath: string) => string;
  // Absolute directory used to shorten paths in the rendered diff.
  displayRoot?: string;
}

export function buildEditPlan(
  draft: PlanDraft,
  deps: BuildEditPlanDeps
): EditPlan {
  return {
    operation: draft.operation,
    fileEdits: draft.fileEdits,
    fileRenames: draft.fileRenames,
    scope: draft.scope,
    planId: computePlanId(draft),
    summary: computeSummary(draft),
    unifiedDiff: renderUnifiedDiff({
      fileEdits: draft.fileEdits,
      fileRenames: draft.fileRenames,
      readFileText: deps.readFileText,
      displayRoot: deps.displayRoot,
    }),
  };
}

function computePlanId(draft: PlanDraft): string {
  const canonical = canonicalStringify(draft);
  return createHash("sha256").update(canonical).digest("hex");
}

function computeSummary(draft: PlanDraft): EditPlanSummary {
  const touched = new Set<string>();
  for (const file of draft.fileEdits) {
    touched.add(file.filePath);
  }
  for (const rename of draft.fileRenames) {
    touched.add(rename.from);
  }

  const editCount = draft.fileEdits.reduce(
    (total, file) => total + file.edits.length,
    0
  );

  // Every edit this tool produces is a reference-site rewrite (a rename location
  // or an import specifier), so the reference count equals the edit count by
  // construction; the two fields are reported separately for spec parity but do
  // not diverge for the current operations.
  return {
    filesTouched: touched.size,
    editCount,
    references: editCount,
  };
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// Deterministic serialization: object keys are emitted in sorted order so two
// drafts with identical content but different key insertion order hash equally.
function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): JsonValue {
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)
    );
    const result: { [key: string]: JsonValue } = {};
    for (const [key, item] of entries) {
      result[key] = canonicalize(item);
    }
    return result;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  throw new Error(`Cannot canonicalize value of type ${typeof value}`);
}
