import { getDb } from "../db/connection.js";
import {
  type CreateObjectiveInput,
  type DeleteObjectiveInput,
  type GetObjectiveInput,
  type LinkObjectiveToFeaturesInput,
  type LinkObjectiveToTicketsInput,
  type ListObjectivesInput,
  type Objective,
  type UnlinkObjectiveFromFeatureInput,
  type UnlinkObjectiveFromTicketInput,
  type UpdateObjectiveInput,
} from "../schemas/objectives.js";
import { createSuccessResponse } from "../schemas/common.js";
import {
  ConstraintViolationError,
  handleError,
  NotFoundError,
} from "../utils/errors.js";
import { generateId } from "../utils/id.js";

export function createObjective(input: CreateObjectiveInput) {
  try {
    const db = getDb();
    const id = generateId();

    const insertStmt = db.prepare(`
      INSERT INTO objectives (id, slug, name, description, status, plan_file_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      insertStmt.run(
        id,
        input.slug,
        input.name,
        input.description ?? null,
        input.status ?? "pending",
        input.plan_file_path ?? null,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint")
      ) {
        throw new ConstraintViolationError(
          `Objective with slug '${input.slug}' already exists`,
        );
      }
      throw error;
    }

    const selectStmt = db.prepare(`
      SELECT id, slug, name, description, status, plan_file_path, created_at, updated_at
      FROM objectives WHERE id = ?
    `);
    const objective = selectStmt.get(id) as Objective;

    return createSuccessResponse({ objective });
  } catch (error) {
    return handleError(error);
  }
}

export function getObjective(input: GetObjectiveInput) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, slug, name, description, status, plan_file_path, created_at, updated_at
      FROM objectives WHERE slug = ?
    `);
    const objective = stmt.get(input.slug) as Objective | null;

    if (!objective) {
      throw new NotFoundError(`Objective '${input.slug}' not found`);
    }

    return createSuccessResponse({ objective });
  } catch (error) {
    return handleError(error);
  }
}

export function listObjectives(input: ListObjectivesInput) {
  try {
    const db = getDb();
    let objectives: Objective[];

    if (input.status) {
      const stmt = db.prepare(`
        SELECT id, slug, name, description, status, plan_file_path, created_at, updated_at
        FROM objectives WHERE status = ?
        ORDER BY created_at DESC
      `);
      objectives = stmt.all(input.status) as Objective[];
    } else {
      const stmt = db.prepare(`
        SELECT id, slug, name, description, status, plan_file_path, created_at, updated_at
        FROM objectives
        ORDER BY created_at DESC
      `);
      objectives = stmt.all() as Objective[];
    }

    return createSuccessResponse({ objectives });
  } catch (error) {
    return handleError(error);
  }
}

export function updateObjective(input: UpdateObjectiveInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM objectives WHERE slug = ?`);
    const existing = existingStmt.get(input.slug);
    if (!existing) {
      throw new NotFoundError(`Objective '${input.slug}' not found`);
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
    if (input.status !== undefined) {
      updates.push("status = ?");
      values.push(input.status);
    }
    if (input.plan_file_path !== undefined) {
      updates.push("plan_file_path = ?");
      values.push(input.plan_file_path);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(input.slug);

      const updateStmt = db.prepare(`
        UPDATE objectives SET ${updates.join(", ")} WHERE slug = ?
      `);
      updateStmt.run(...values);
    }

    const selectStmt = db.prepare(`
      SELECT id, slug, name, description, status, plan_file_path, created_at, updated_at
      FROM objectives WHERE slug = ?
    `);
    const objective = selectStmt.get(input.slug) as Objective;

    return createSuccessResponse({ objective });
  } catch (error) {
    return handleError(error);
  }
}

export function deleteObjective(input: DeleteObjectiveInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM objectives WHERE slug = ?`);
    const existing = existingStmt.get(input.slug);
    if (!existing) {
      throw new NotFoundError(`Objective '${input.slug}' not found`);
    }

    const deleteStmt = db.prepare(`DELETE FROM objectives WHERE slug = ?`);
    deleteStmt.run(input.slug);

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}

export function linkObjectiveToFeatures(input: LinkObjectiveToFeaturesInput) {
  try {
    const db = getDb();

    const objectiveStmt = db.prepare(
      `SELECT id FROM objectives WHERE slug = ?`,
    );
    const objective = objectiveStmt.get(input.objective_slug) as {
      id: string;
    } | null;
    if (!objective) {
      throw new NotFoundError(`Objective '${input.objective_slug}' not found`);
    }

    const featureStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO objective_features (objective_id, feature_id)
      VALUES (?, ?)
    `);

    db.transaction(() => {
      for (const featureSlug of input.feature_slugs) {
        const feature = featureStmt.get(featureSlug) as { id: string } | null;
        if (!feature) {
          throw new NotFoundError(`Feature '${featureSlug}' not found`);
        }
        insertStmt.run(objective.id, feature.id);
      }
    })();

    return createSuccessResponse({ linked: input.feature_slugs.length });
  } catch (error) {
    return handleError(error);
  }
}

export function unlinkObjectiveFromFeature(
  input: UnlinkObjectiveFromFeatureInput,
) {
  try {
    const db = getDb();

    const objectiveStmt = db.prepare(
      `SELECT id FROM objectives WHERE slug = ?`,
    );
    const objective = objectiveStmt.get(input.objective_slug) as {
      id: string;
    } | null;
    if (!objective) {
      throw new NotFoundError(`Objective '${input.objective_slug}' not found`);
    }

    const featureStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
    const feature = featureStmt.get(input.feature_slug) as {
      id: string;
    } | null;
    if (!feature) {
      throw new NotFoundError(`Feature '${input.feature_slug}' not found`);
    }

    const deleteStmt = db.prepare(`
      DELETE FROM objective_features WHERE objective_id = ? AND feature_id = ?
    `);
    const result = deleteStmt.run(objective.id, feature.id);

    if (result.changes === 0) {
      throw new NotFoundError(
        `Link between objective '${input.objective_slug}' and feature '${input.feature_slug}' not found`,
      );
    }

    return createSuccessResponse({ unlinked: true });
  } catch (error) {
    return handleError(error);
  }
}

export function linkObjectiveToTickets(input: LinkObjectiveToTicketsInput) {
  try {
    const db = getDb();

    const objectiveStmt = db.prepare(
      `SELECT id FROM objectives WHERE slug = ?`,
    );
    const objective = objectiveStmt.get(input.objective_slug) as {
      id: string;
    } | null;
    if (!objective) {
      throw new NotFoundError(`Objective '${input.objective_slug}' not found`);
    }

    const ticketStmt = db.prepare(`SELECT id FROM tickets WHERE key = ?`);
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO objective_tickets (objective_id, ticket_id)
      VALUES (?, ?)
    `);

    db.transaction(() => {
      for (const ticketKey of input.ticket_keys) {
        const ticket = ticketStmt.get(ticketKey) as { id: string } | null;
        if (!ticket) {
          throw new NotFoundError(`Ticket '${ticketKey}' not found`);
        }
        insertStmt.run(objective.id, ticket.id);
      }
    })();

    return createSuccessResponse({ linked: input.ticket_keys.length });
  } catch (error) {
    return handleError(error);
  }
}

export function unlinkObjectiveFromTicket(
  input: UnlinkObjectiveFromTicketInput,
) {
  try {
    const db = getDb();

    const objectiveStmt = db.prepare(
      `SELECT id FROM objectives WHERE slug = ?`,
    );
    const objective = objectiveStmt.get(input.objective_slug) as {
      id: string;
    } | null;
    if (!objective) {
      throw new NotFoundError(`Objective '${input.objective_slug}' not found`);
    }

    const ticketStmt = db.prepare(`SELECT id FROM tickets WHERE key = ?`);
    const ticket = ticketStmt.get(input.ticket_key) as { id: string } | null;
    if (!ticket) {
      throw new NotFoundError(`Ticket '${input.ticket_key}' not found`);
    }

    const deleteStmt = db.prepare(`
      DELETE FROM objective_tickets WHERE objective_id = ? AND ticket_id = ?
    `);
    const result = deleteStmt.run(objective.id, ticket.id);

    if (result.changes === 0) {
      throw new NotFoundError(
        `Link between objective '${input.objective_slug}' and ticket '${input.ticket_key}' not found`,
      );
    }

    return createSuccessResponse({ unlinked: true });
  } catch (error) {
    return handleError(error);
  }
}
