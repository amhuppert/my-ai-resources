import { getDb } from "../db/connection.js";
import {
  type CreateFeaturesInput,
  type DeleteFeatureInput,
  type Feature,
  type GetFeatureInput,
  type ListFeaturesInput,
  type UpdateFeatureInput,
} from "../schemas/features.js";
import { createSuccessResponse } from "../schemas/common.js";
import {
  ConstraintViolationError,
  handleError,
  NotFoundError,
} from "../utils/errors.js";
import { generateId } from "../utils/id.js";

export function createFeatures(input: CreateFeaturesInput) {
  try {
    const db = getDb();
    const createdFeatures: Feature[] = [];

    const insertStmt = db.prepare(`
      INSERT INTO features (id, slug, name, description)
      VALUES (?, ?, ?, ?)
    `);

    const selectStmt = db.prepare(`
      SELECT id, slug, name, description, created_at, updated_at
      FROM features WHERE id = ?
    `);

    db.transaction(() => {
      for (const feature of input.features) {
        const id = generateId();
        try {
          insertStmt.run(
            id,
            feature.slug,
            feature.name,
            feature.description ?? null,
          );
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("UNIQUE constraint")
          ) {
            throw new ConstraintViolationError(
              `Feature with slug '${feature.slug}' already exists`,
            );
          }
          throw error;
        }
        const created = selectStmt.get(id) as Feature;
        createdFeatures.push(created);
      }
    })();

    return createSuccessResponse({ features: createdFeatures });
  } catch (error) {
    return handleError(error);
  }
}

export function getFeature(input: GetFeatureInput) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, slug, name, description, created_at, updated_at
      FROM features WHERE slug = ?
    `);
    const feature = stmt.get(input.slug) as Feature | null;

    if (!feature) {
      throw new NotFoundError(`Feature '${input.slug}' not found`);
    }

    return createSuccessResponse({ feature });
  } catch (error) {
    return handleError(error);
  }
}

export function listFeatures(input: ListFeaturesInput) {
  try {
    const db = getDb();
    let features: Feature[];

    if (input.parent_slug) {
      const stmt = db.prepare(`
        SELECT id, slug, name, description, created_at, updated_at
        FROM features
        WHERE slug LIKE ? AND slug != ?
        ORDER BY slug
      `);
      features = stmt.all(
        `${input.parent_slug}/%`,
        input.parent_slug,
      ) as Feature[];
    } else {
      const stmt = db.prepare(`
        SELECT id, slug, name, description, created_at, updated_at
        FROM features
        ORDER BY slug
      `);
      features = stmt.all() as Feature[];
    }

    return createSuccessResponse({ features });
  } catch (error) {
    return handleError(error);
  }
}

export function updateFeature(input: UpdateFeatureInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
    const existing = existingStmt.get(input.slug);
    if (!existing) {
      throw new NotFoundError(`Feature '${input.slug}' not found`);
    }

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (input.name !== undefined) {
      updates.push("name = ?");
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push("description = ?");
      values.push(input.description);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(input.slug);

      const updateStmt = db.prepare(`
        UPDATE features SET ${updates.join(", ")} WHERE slug = ?
      `);
      updateStmt.run(...values);
    }

    const selectStmt = db.prepare(`
      SELECT id, slug, name, description, created_at, updated_at
      FROM features WHERE slug = ?
    `);
    const feature = selectStmt.get(input.slug) as Feature;

    return createSuccessResponse({ feature });
  } catch (error) {
    return handleError(error);
  }
}

export function deleteFeature(input: DeleteFeatureInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
    const existing = existingStmt.get(input.slug);
    if (!existing) {
      throw new NotFoundError(`Feature '${input.slug}' not found`);
    }

    const deleteStmt = db.prepare(`DELETE FROM features WHERE slug = ?`);
    deleteStmt.run(input.slug);

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
