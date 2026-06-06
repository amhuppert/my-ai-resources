import { applyEditPlan } from "./apply";
import type {
  LoadProjectOptions,
  MoveRequest,
  RefactorEngine,
  RenameRequest,
} from "./engine/refactor-engine";
import { UsageError } from "./errors";
import { buildEditPlan } from "./plan";
import type { ApplyResult, EditPlan, PlanDraft, ProjectScope } from "./types";

export interface SessionOptions {
  // Reads file contents for unified-diff rendering during plan building.
  readFileText: (filePath: string) => string;
  // Project to load lazily on the first operation when loadProject is not
  // called explicitly. Omit to require an explicit loadProject call.
  loadOptions?: LoadProjectOptions;
  // Absolute directory used to shorten paths in rendered diffs.
  displayRoot?: string;
}

export interface SessionStatus {
  scope: ProjectScope;
  heapUsed: number;
  operationCount: number;
  programBuildCount: number;
}

export interface ApplyOptions {
  allowStale?: boolean;
  warn?: (msg: string) => void;
}

// Owns the warm engine/project for a refactor session, coordinating
// plan -> apply -> refresh so the program is built once and reused.
export class Session {
  readonly #engine: RefactorEngine;
  readonly #readFileText: (filePath: string) => string;
  readonly #displayRoot: string | undefined;
  readonly #loadOptions: LoadProjectOptions | undefined;
  readonly #plans = new Map<string, EditPlan>();
  #scope: ProjectScope | undefined;
  #operationCount = 0;

  constructor(engine: RefactorEngine, options: SessionOptions) {
    this.#engine = engine;
    this.#readFileText = options.readFileText;
    this.#displayRoot = options.displayRoot;
    this.#loadOptions = options.loadOptions;
  }

  loadProject(opts: LoadProjectOptions): ProjectScope {
    const scope = this.#engine.loadProject(opts);
    this.#scope = scope;
    return scope;
  }

  planRename(req: RenameRequest): EditPlan {
    this.#ensureLoaded();
    return this.#registerPlan(this.#engine.planRename(req));
  }

  planMove(req: MoveRequest): EditPlan {
    this.#ensureLoaded();
    return this.#registerPlan(this.#engine.planMove(req));
  }

  planMoveDir(req: MoveRequest): EditPlan {
    this.#ensureLoaded();
    return this.#registerPlan(this.#engine.planMoveDir(req));
  }

  async apply(planOrId: EditPlan | string, opts: ApplyOptions): Promise<ApplyResult> {
    // Load before any write so post-apply refreshFiles cannot throw on an
    // unloaded project AFTER the disk has already been mutated (a non-ok
    // response must never leave the tree changed).
    this.#ensureLoaded();
    const plan = this.#resolvePlan(planOrId);
    const result = await applyEditPlan(plan, opts);
    this.#engine.refreshFiles(affectedPaths(plan));
    this.#operationCount += 1;
    return result;
  }

  status(): SessionStatus {
    return {
      scope: this.#scope ?? emptyScope(),
      heapUsed: process.memoryUsage().heapUsed,
      operationCount: this.#operationCount,
      programBuildCount: this.#engine.programBuildCount(),
    };
  }

  dispose(): void {
    this.#engine.dispose();
    this.#plans.clear();
  }

  #ensureLoaded(): void {
    if (this.#scope !== undefined) return;
    if (this.#loadOptions === undefined) {
      throw new UsageError("loadProject must be called before planning operations");
    }
    this.loadProject(this.#loadOptions);
  }

  #registerPlan(draft: PlanDraft): EditPlan {
    const plan = buildEditPlan(draft, {
      readFileText: this.#readFileText,
      displayRoot: this.#displayRoot,
    });
    this.#plans.set(plan.planId, plan);
    this.#operationCount += 1;
    return plan;
  }

  #resolvePlan(planOrId: EditPlan | string): EditPlan {
    if (typeof planOrId !== "string") {
      return planOrId;
    }
    const plan = this.#plans.get(planOrId);
    if (plan === undefined) {
      throw new UsageError(`No plan found for planId ${planOrId} in this session`);
    }
    return plan;
  }
}

function affectedPaths(plan: EditPlan): string[] {
  const paths = new Set<string>();
  for (const fileEdits of plan.fileEdits) {
    paths.add(fileEdits.filePath);
  }
  for (const rename of plan.fileRenames) {
    // The source is now gone (drop it from the warm project) and the
    // destination is newly present (add it) so later ops see committed state.
    paths.add(rename.from);
    paths.add(rename.to);
  }
  return [...paths];
}

function emptyScope(): ProjectScope {
  return { tsconfigPath: "", filesLoaded: 0, warnings: [] };
}
