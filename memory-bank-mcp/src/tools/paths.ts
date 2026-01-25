import { getDb } from "../db/connection.js";
import {
  type CreatePathsInput,
  type DeletePathInput,
  type GetPathInput,
  type LinkPathsToFeatureInput,
  type ListPathsInput,
  type Path,
  type UnlinkPathFromFeatureInput,
  type UpdatePathInput,
} from "../schemas/paths.js";
import { createSuccessResponse } from "../schemas/common.js";
import {
  ConstraintViolationError,
  handleError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import { generateId } from "../utils/id.js";

interface PathRow {
  id: string;
  path: string;
  type: "file" | "directory";
  description: string | null;
  use_when: string;
  created_at: string;
  updated_at: string;
}

function rowToPath(row: PathRow): Path {
  return {
    ...row,
    use_when: JSON.parse(row.use_when) as string[],
  };
}

function normalizePath(p: string): string {
  let normalized = p.replace(/^\.\//, "");
  normalized = normalized.replace(/^\/+/, "");
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

export function createPaths(input: CreatePathsInput) {
  try {
    const db = getDb();
    const createdPaths: Path[] = [];

    const insertStmt = db.prepare(`
      INSERT INTO paths (id, path, type, description, use_when)
      VALUES (?, ?, ?, ?, ?)
    `);

    const selectStmt = db.prepare(`
      SELECT id, path, type, description, use_when, created_at, updated_at
      FROM paths WHERE id = ?
    `);

    db.transaction(() => {
      for (const pathInput of input.paths) {
        const id = generateId();
        const normalizedPath = normalizePath(pathInput.path);
        const useWhen = JSON.stringify(pathInput.use_when ?? []);

        try {
          insertStmt.run(
            id,
            normalizedPath,
            pathInput.type,
            pathInput.description ?? null,
            useWhen,
          );
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("UNIQUE constraint")
          ) {
            throw new ConstraintViolationError(
              `Path '${normalizedPath}' already exists`,
            );
          }
          throw error;
        }

        const row = selectStmt.get(id) as PathRow;
        createdPaths.push(rowToPath(row));
      }
    })();

    return createSuccessResponse({ paths: createdPaths });
  } catch (error) {
    return handleError(error);
  }
}

export function getPath(input: GetPathInput) {
  try {
    const db = getDb();
    let row: PathRow | null = null;

    if (input.id !== undefined) {
      const stmt = db.prepare(`
        SELECT id, path, type, description, use_when, created_at, updated_at
        FROM paths WHERE id = ?
      `);
      row = stmt.get(input.id) as PathRow | null;
      if (!row) {
        throw new NotFoundError(`Path with id '${input.id}' not found`);
      }
    } else if (input.path !== undefined) {
      const normalizedPath = normalizePath(input.path);
      const stmt = db.prepare(`
        SELECT id, path, type, description, use_when, created_at, updated_at
        FROM paths WHERE path = ?
      `);
      row = stmt.get(normalizedPath) as PathRow | null;
      if (!row) {
        throw new NotFoundError(`Path '${normalizedPath}' not found`);
      }
    } else {
      throw new ValidationError("Either 'id' or 'path' must be provided");
    }

    return createSuccessResponse({ path: rowToPath(row) });
  } catch (error) {
    return handleError(error);
  }
}

export function listPaths(input: ListPathsInput) {
  try {
    const db = getDb();
    let rows: PathRow[];

    if (input.feature_slug) {
      const featureStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
      const feature = featureStmt.get(input.feature_slug) as {
        id: string;
      } | null;
      if (!feature) {
        throw new NotFoundError(`Feature '${input.feature_slug}' not found`);
      }

      if (input.type) {
        const stmt = db.prepare(`
          SELECT p.id, p.path, p.type, p.description, p.use_when, p.created_at, p.updated_at
          FROM paths p
          JOIN feature_paths fp ON p.id = fp.path_id
          WHERE fp.feature_id = ? AND p.type = ?
          ORDER BY p.path
        `);
        rows = stmt.all(feature.id, input.type) as PathRow[];
      } else {
        const stmt = db.prepare(`
          SELECT p.id, p.path, p.type, p.description, p.use_when, p.created_at, p.updated_at
          FROM paths p
          JOIN feature_paths fp ON p.id = fp.path_id
          WHERE fp.feature_id = ?
          ORDER BY p.path
        `);
        rows = stmt.all(feature.id) as PathRow[];
      }
    } else if (input.type) {
      const stmt = db.prepare(`
        SELECT id, path, type, description, use_when, created_at, updated_at
        FROM paths WHERE type = ?
        ORDER BY path
      `);
      rows = stmt.all(input.type) as PathRow[];
    } else {
      const stmt = db.prepare(`
        SELECT id, path, type, description, use_when, created_at, updated_at
        FROM paths
        ORDER BY path
      `);
      rows = stmt.all() as PathRow[];
    }

    return createSuccessResponse({ paths: rows.map(rowToPath) });
  } catch (error) {
    return handleError(error);
  }
}

export function updatePath(input: UpdatePathInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM paths WHERE id = ?`);
    const existing = existingStmt.get(input.id);
    if (!existing) {
      throw new NotFoundError(`Path with id '${input.id}' not found`);
    }

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (input.description !== undefined) {
      updates.push("description = ?");
      values.push(input.description);
    }
    if (input.use_when !== undefined) {
      updates.push("use_when = ?");
      values.push(JSON.stringify(input.use_when));
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(input.id);

      const updateStmt = db.prepare(`
        UPDATE paths SET ${updates.join(", ")} WHERE id = ?
      `);
      updateStmt.run(...values);
    }

    const selectStmt = db.prepare(`
      SELECT id, path, type, description, use_when, created_at, updated_at
      FROM paths WHERE id = ?
    `);
    const row = selectStmt.get(input.id) as PathRow;

    return createSuccessResponse({ path: rowToPath(row) });
  } catch (error) {
    return handleError(error);
  }
}

export function deletePath(input: DeletePathInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM paths WHERE id = ?`);
    const existing = existingStmt.get(input.id);
    if (!existing) {
      throw new NotFoundError(`Path with id '${input.id}' not found`);
    }

    const deleteStmt = db.prepare(`DELETE FROM paths WHERE id = ?`);
    deleteStmt.run(input.id);

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}

export function linkPathsToFeature(input: LinkPathsToFeatureInput) {
  try {
    const db = getDb();

    const featureStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
    const feature = featureStmt.get(input.feature_slug) as {
      id: string;
    } | null;
    if (!feature) {
      throw new NotFoundError(`Feature '${input.feature_slug}' not found`);
    }

    const pathStmt = db.prepare(`SELECT id FROM paths WHERE id = ?`);
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO feature_paths (feature_id, path_id)
      VALUES (?, ?)
    `);

    db.transaction(() => {
      for (const pathId of input.path_ids) {
        const path = pathStmt.get(pathId);
        if (!path) {
          throw new NotFoundError(`Path with id '${pathId}' not found`);
        }
        insertStmt.run(feature.id, pathId);
      }
    })();

    return createSuccessResponse({ linked: input.path_ids.length });
  } catch (error) {
    return handleError(error);
  }
}

export function unlinkPathFromFeature(input: UnlinkPathFromFeatureInput) {
  try {
    const db = getDb();

    const featureStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
    const feature = featureStmt.get(input.feature_slug) as {
      id: string;
    } | null;
    if (!feature) {
      throw new NotFoundError(`Feature '${input.feature_slug}' not found`);
    }

    const deleteStmt = db.prepare(`
      DELETE FROM feature_paths WHERE feature_id = ? AND path_id = ?
    `);
    const result = deleteStmt.run(feature.id, input.path_id);

    if (result.changes === 0) {
      throw new NotFoundError(
        `Link between feature '${input.feature_slug}' and path '${input.path_id}' not found`,
      );
    }

    return createSuccessResponse({ unlinked: true });
  } catch (error) {
    return handleError(error);
  }
}
