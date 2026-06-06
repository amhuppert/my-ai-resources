import { isRefactorError } from "./errors";
import type { ApplyResult, EditPlan } from "./types";

export const SUCCESS = 0;
export const USAGE = 2;
export const NO_SYMBOL = 3;
export const REJECTED_APPLY = 4;
export const ENGINE = 5;

export function exitCodeForError(err: unknown): number {
  if (isRefactorError(err)) {
    return err.exitCode;
  }
  return ENGINE;
}

export function formatError(err: unknown): { code: string; message: string } {
  if (isRefactorError(err)) {
    return { code: err.code, message: err.message };
  }
  if (err instanceof Error) {
    return { code: "engine", message: err.message };
  }
  return { code: "engine", message: String(err) };
}

export function summarizePlan(plan: EditPlan): string {
  const { summary, scope } = plan;
  const lines = [
    `operation: ${plan.operation}`,
    `files touched: ${summary.filesTouched}`,
    `edits: ${summary.editCount}`,
    `references: ${summary.references}`,
    `scope: ${scope.tsconfigPath} (${scope.filesLoaded} files loaded)`,
  ];

  for (const warning of scope.warnings) {
    // Scope warnings are heuristic disclosures, never detected references;
    // their absence is not a completeness guarantee (R7.3).
    lines.push(`HEURISTIC scope warning: ${warning}`);
  }

  return lines.join("\n");
}

export function summarizeApply(result: ApplyResult): string {
  const lines = [`written: ${result.written.length}`];
  for (const filePath of result.written) {
    lines.push(`  ${filePath}`);
  }

  lines.push(`renamed: ${result.renamed.length}`);
  for (const rename of result.renamed) {
    lines.push(`  ${rename.from} -> ${rename.to}`);
  }

  return lines.join("\n");
}
