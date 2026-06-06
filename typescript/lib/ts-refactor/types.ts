import { z } from "zod";

export const PositionSchema = z
  .object({
    line: z.number(),
    column: z.number(),
    offset: z.number(),
  })
  .strict();

export type Position = z.infer<typeof PositionSchema>;

export const TextEditSchema = z
  .object({
    start: PositionSchema,
    end: PositionSchema,
    // Already incorporates any compiler-provided prefixText/suffixText
    // (e.g. shorthand-property rename `{ foo }` -> `{ foo: newName }`);
    // a bare span replacement would drop that text.
    newText: z.string(),
  })
  .strict();

export type TextEdit = z.infer<typeof TextEditSchema>;

export const FileEditsSchema = z
  .object({
    // Absolute path.
    filePath: z.string(),
    // Hash of file contents the edits were computed against (staleness gate).
    baseSha256: z.string(),
    // Non-overlapping, sorted by start.
    edits: z.array(TextEditSchema),
  })
  .strict();

export type FileEdits = z.infer<typeof FileEditsSchema>;

export const FileRenameSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    fromSha256: z.string(),
    overwrite: z.boolean(),
  })
  .strict();

export type FileRename = z.infer<typeof FileRenameSchema>;

export const ProjectScopeSchema = z
  .object({
    tsconfigPath: z.string(),
    filesLoaded: z.number(),
    warnings: z.array(z.string()),
  })
  .strict();

export type ProjectScope = z.infer<typeof ProjectScopeSchema>;

export const RefactorOperationSchema = z.enum(["rename", "move", "moveDir"]);

export type RefactorOperation = z.infer<typeof RefactorOperationSchema>;

const planBase = z.object({
  operation: RefactorOperationSchema,
  fileEdits: z.array(FileEditsSchema),
  fileRenames: z.array(FileRenameSchema),
  scope: ProjectScopeSchema,
});

// Rendering-free engine output: must NOT carry planId/summary/unifiedDiff.
export const PlanDraftSchema = planBase.strict();

export type PlanDraft = z.infer<typeof PlanDraftSchema>;

export const EditPlanSummarySchema = z
  .object({
    filesTouched: z.number(),
    editCount: z.number(),
    references: z.number(),
  })
  .strict();

export type EditPlanSummary = z.infer<typeof EditPlanSummarySchema>;

export const EditPlanSchema = planBase
  .extend({
    planId: z.string(),
    summary: EditPlanSummarySchema,
    unifiedDiff: z.string(),
  })
  .strict();

export type EditPlan = z.infer<typeof EditPlanSchema>;

export const ApplyResultSchema = z
  .object({
    written: z.array(z.string()),
    renamed: z.array(FileRenameSchema),
  })
  .strict();

export type ApplyResult = z.infer<typeof ApplyResultSchema>;

export function parseEditPlan(value: unknown): EditPlan {
  return EditPlanSchema.parse(value);
}

export function serializeEditPlan(plan: EditPlan): string {
  return JSON.stringify(plan);
}
