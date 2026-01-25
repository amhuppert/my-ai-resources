import { getDb } from "../db/connection.js";
import {
  type CreateRequirementsInput,
  type DeleteRequirementInput,
  type GetRequirementInput,
  type ListRequirementsInput,
  type Requirement,
  type UpdateRequirementInput,
} from "../schemas/requirements.js";
import { createSuccessResponse } from "../schemas/common.js";
import { handleError, NotFoundError } from "../utils/errors.js";
import { generateId } from "../utils/id.js";

interface RequirementRow {
  id: string;
  feature_id: string;
  text: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

function rowToRequirement(row: RequirementRow): Requirement {
  return {
    ...row,
    notes: JSON.parse(row.notes) as string[],
  };
}

export function createRequirements(input: CreateRequirementsInput) {
  try {
    const db = getDb();

    const featureStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
    const feature = featureStmt.get(input.feature_slug) as {
      id: string;
    } | null;
    if (!feature) {
      throw new NotFoundError(`Feature '${input.feature_slug}' not found`);
    }

    const createdRequirements: Requirement[] = [];

    const insertStmt = db.prepare(`
      INSERT INTO requirements (id, feature_id, text, notes)
      VALUES (?, ?, ?, ?)
    `);

    const selectStmt = db.prepare(`
      SELECT id, feature_id, text, notes, created_at, updated_at
      FROM requirements WHERE id = ?
    `);

    db.transaction(() => {
      for (const req of input.requirements) {
        const id = generateId();
        const notes = JSON.stringify(req.notes ?? []);
        insertStmt.run(id, feature.id, req.text, notes);
        const row = selectStmt.get(id) as RequirementRow;
        createdRequirements.push(rowToRequirement(row));
      }
    })();

    return createSuccessResponse({ requirements: createdRequirements });
  } catch (error) {
    return handleError(error);
  }
}

export function getRequirement(input: GetRequirementInput) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, feature_id, text, notes, created_at, updated_at
      FROM requirements WHERE id = ?
    `);
    const row = stmt.get(input.id) as RequirementRow | null;

    if (!row) {
      throw new NotFoundError(`Requirement '${input.id}' not found`);
    }

    return createSuccessResponse({ requirement: rowToRequirement(row) });
  } catch (error) {
    return handleError(error);
  }
}

export function listRequirements(input: ListRequirementsInput) {
  try {
    const db = getDb();

    const featureStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
    const feature = featureStmt.get(input.feature_slug) as {
      id: string;
    } | null;
    if (!feature) {
      throw new NotFoundError(`Feature '${input.feature_slug}' not found`);
    }

    const stmt = db.prepare(`
      SELECT id, feature_id, text, notes, created_at, updated_at
      FROM requirements WHERE feature_id = ?
      ORDER BY created_at
    `);
    const rows = stmt.all(feature.id) as RequirementRow[];

    return createSuccessResponse({ requirements: rows.map(rowToRequirement) });
  } catch (error) {
    return handleError(error);
  }
}

export function updateRequirement(input: UpdateRequirementInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM requirements WHERE id = ?`);
    const existing = existingStmt.get(input.id);
    if (!existing) {
      throw new NotFoundError(`Requirement '${input.id}' not found`);
    }

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (input.text !== undefined) {
      updates.push("text = ?");
      values.push(input.text);
    }
    if (input.notes !== undefined) {
      updates.push("notes = ?");
      values.push(JSON.stringify(input.notes));
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(input.id);

      const updateStmt = db.prepare(`
        UPDATE requirements SET ${updates.join(", ")} WHERE id = ?
      `);
      updateStmt.run(...values);
    }

    const selectStmt = db.prepare(`
      SELECT id, feature_id, text, notes, created_at, updated_at
      FROM requirements WHERE id = ?
    `);
    const row = selectStmt.get(input.id) as RequirementRow;

    return createSuccessResponse({ requirement: rowToRequirement(row) });
  } catch (error) {
    return handleError(error);
  }
}

export function deleteRequirement(input: DeleteRequirementInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM requirements WHERE id = ?`);
    const existing = existingStmt.get(input.id);
    if (!existing) {
      throw new NotFoundError(`Requirement '${input.id}' not found`);
    }

    const deleteStmt = db.prepare(`DELETE FROM requirements WHERE id = ?`);
    deleteStmt.run(input.id);

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
