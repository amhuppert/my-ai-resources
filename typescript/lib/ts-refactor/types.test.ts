import { describe, expect, test } from "bun:test";
import {
  EditPlanSchema,
  PlanDraftSchema,
  parseEditPlan,
  serializeEditPlan,
  type EditPlan,
  type PlanDraft,
} from "./types";

function buildEditPlan(): EditPlan {
  return {
    operation: "rename",
    fileEdits: [
      {
        filePath: "/abs/project/src/user.ts",
        baseSha256: "a".repeat(64),
        edits: [
          {
            start: { line: 12, column: 8, offset: 240 },
            end: { line: 12, column: 14, offset: 246 },
            newText: "AccountId",
          },
          {
            start: { line: 30, column: 2, offset: 600 },
            end: { line: 30, column: 8, offset: 606 },
            newText: "foo: AccountId",
          },
        ],
      },
    ],
    fileRenames: [
      {
        from: "/abs/project/src/user.ts",
        to: "/abs/project/src/account.ts",
        fromSha256: "b".repeat(64),
        overwrite: false,
      },
    ],
    scope: {
      tsconfigPath: "/abs/project/tsconfig.json",
      filesLoaded: 42,
      warnings: ["symbol exported via public entry point"],
    },
    planId: "c".repeat(64),
    summary: {
      filesTouched: 1,
      editCount: 2,
      references: 2,
    },
    unifiedDiff: "--- a/src/user.ts\n+++ b/src/user.ts\n",
  };
}

describe("EditPlan round-trip (R3.3)", () => {
  test("parseEditPlan after serializeEditPlan deep-equals the original", () => {
    const plan = buildEditPlan();

    const roundTripped = parseEditPlan(JSON.parse(serializeEditPlan(plan)));

    expect(roundTripped).toEqual(plan);
  });

  test("serializeEditPlan produces parseable JSON", () => {
    const plan = buildEditPlan();

    const json = serializeEditPlan(plan);

    expect(() => JSON.parse(json)).not.toThrow();
    expect(typeof json).toBe("string");
  });
});

describe("parseEditPlan validation", () => {
  test("throws when a required field is missing", () => {
    const plan = buildEditPlan();
    const { planId, ...withoutPlanId } = plan;

    expect(() => parseEditPlan(withoutPlanId)).toThrow();
  });

  test("throws when summary is missing", () => {
    const plan = buildEditPlan();
    const { summary, ...withoutSummary } = plan;

    expect(() => parseEditPlan(withoutSummary)).toThrow();
  });

  test("throws on an unknown extra field (strict)", () => {
    const plan = buildEditPlan();

    expect(() =>
      parseEditPlan({ ...plan, unexpected: "nope" })
    ).toThrow();
  });

  test("throws on a non-object input", () => {
    expect(() => parseEditPlan("not a plan")).toThrow();
    expect(() => parseEditPlan(null)).toThrow();
  });
});

describe("PlanDraft is rendering-free (R8.1)", () => {
  test("PlanDraftSchema rejects an object carrying a planId", () => {
    const draft: PlanDraft = {
      operation: "rename",
      fileEdits: [],
      fileRenames: [],
      scope: {
        tsconfigPath: "/abs/project/tsconfig.json",
        filesLoaded: 1,
        warnings: [],
      },
    };

    const withPlanId = { ...draft, planId: "x".repeat(64) };

    expect(PlanDraftSchema.safeParse(withPlanId).success).toBe(false);
  });

  test("PlanDraftSchema rejects summary and unifiedDiff", () => {
    const draft: PlanDraft = {
      operation: "move",
      fileEdits: [],
      fileRenames: [],
      scope: {
        tsconfigPath: "/abs/project/tsconfig.json",
        filesLoaded: 1,
        warnings: [],
      },
    };

    expect(
      PlanDraftSchema.safeParse({
        ...draft,
        summary: { filesTouched: 0, editCount: 0, references: 0 },
      }).success
    ).toBe(false);
    expect(
      PlanDraftSchema.safeParse({ ...draft, unifiedDiff: "" }).success
    ).toBe(false);
  });

  test("a valid PlanDraft value has no planId/summary/unifiedDiff", () => {
    const draft: PlanDraft = {
      operation: "moveDir",
      fileEdits: [],
      fileRenames: [],
      scope: {
        tsconfigPath: "/abs/project/tsconfig.json",
        filesLoaded: 3,
        warnings: [],
      },
    };

    const parsed = PlanDraftSchema.parse(draft);

    expect("planId" in parsed).toBe(false);
    expect("summary" in parsed).toBe(false);
    expect("unifiedDiff" in parsed).toBe(false);
  });

  test("EditPlan structurally extends PlanDraft fields", () => {
    const plan = buildEditPlan();

    const draftView: PlanDraft = {
      operation: plan.operation,
      fileEdits: plan.fileEdits,
      fileRenames: plan.fileRenames,
      scope: plan.scope,
    };

    expect(PlanDraftSchema.parse(draftView)).toEqual(draftView);
  });
});

describe("EditPlanSchema accepts the three operations", () => {
  test.each(["rename", "move", "moveDir"] as const)(
    "accepts operation %s",
    (operation) => {
      const plan = { ...buildEditPlan(), operation };

      expect(EditPlanSchema.safeParse(plan).success).toBe(true);
    }
  );

  test("rejects an unknown operation", () => {
    const plan = { ...buildEditPlan(), operation: "delete" };

    expect(EditPlanSchema.safeParse(plan).success).toBe(false);
  });
});
