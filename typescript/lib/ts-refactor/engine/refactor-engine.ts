import type { PlanDraft, ProjectScope } from "../types";

export interface LoadProjectOptions {
  tsconfigPath: string;
  // Load the full configured project graph by default; only narrow when intentional.
  scopeFiles?: string[];
}

export interface RenameRequest {
  filePath: string;
  offset: number;
  newName: string;
}

export interface MoveRequest {
  from: string;
  to: string;
}

// Backend-agnostic planning seam so ts-morph can later be swapped for raw LS / tsgo.
// Implementations produce rendering-free PlanDrafts only; the plan layer derives
// planId, summary, and unifiedDiff.
export interface RefactorEngine {
  loadProject(opts: LoadProjectOptions): ProjectScope;
  planRename(req: RenameRequest): PlanDraft;
  planMove(req: MoveRequest): PlanDraft;
  planMoveDir(req: MoveRequest): PlanDraft;
  refreshFiles(absPaths: string[]): void;
  dispose(): void;
  // Number of TS Programs/Projects constructed (counts builds, not operations).
  programBuildCount(): number;
}
