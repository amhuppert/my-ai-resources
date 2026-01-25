import { z } from "zod";
import { getDb } from "../db/connection.js";
import {
  createSuccessResponse,
  type PathType,
  PathTypeSchema,
  SlugSchema,
} from "../schemas/common.js";
import type { Feature } from "../schemas/features.js";
import type { Objective } from "../schemas/objectives.js";
import type { Path } from "../schemas/paths.js";
import type { Requirement } from "../schemas/requirements.js";
import type { Task } from "../schemas/tasks.js";
import type { Ticket } from "../schemas/tickets.js";
import { handleError, NotFoundError } from "../utils/errors.js";

// Input schemas for context tools
export const GetFeatureContextInputSchema = z.object({
  slug: SlugSchema,
});

export const GetObjectiveContextInputSchema = z.object({
  slug: SlugSchema,
});

export const FindRelevantPathsInputSchema = z.object({
  query: z.string().min(1),
  feature_slugs: z.array(SlugSchema).optional(),
  type: PathTypeSchema.optional(),
});

export const BuildContextInputSchema = z.object({
  objective_slug: SlugSchema.optional(),
  feature_slugs: z.array(SlugSchema).optional(),
});

export type GetFeatureContextInput = z.infer<
  typeof GetFeatureContextInputSchema
>;
export type GetObjectiveContextInput = z.infer<
  typeof GetObjectiveContextInputSchema
>;
export type FindRelevantPathsInput = z.infer<
  typeof FindRelevantPathsInputSchema
>;
export type BuildContextInput = z.infer<typeof BuildContextInputSchema>;

interface PathRow {
  id: string;
  path: string;
  type: PathType;
  description: string | null;
  use_when: string;
  created_at: string;
  updated_at: string;
}

interface RequirementRow {
  id: string;
  feature_id: string;
  text: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

function rowToPath(row: PathRow): Path {
  return {
    ...row,
    use_when: JSON.parse(row.use_when) as string[],
  };
}

function rowToRequirement(row: RequirementRow): Requirement {
  return {
    ...row,
    notes: JSON.parse(row.notes) as string[],
  };
}

export interface FeatureContext {
  feature: Feature;
  paths: Path[];
  requirements: Requirement[];
}

export interface ObjectiveContext {
  objective: Objective;
  tasks: Task[];
  features: Feature[];
  tickets: Ticket[];
}

export function getFeatureContext(input: GetFeatureContextInput) {
  try {
    const db = getDb();

    const featureStmt = db.prepare(`
      SELECT id, slug, name, description, created_at, updated_at
      FROM features WHERE slug = ?
    `);
    const feature = featureStmt.get(input.slug) as Feature | null;
    if (!feature) {
      throw new NotFoundError(`Feature '${input.slug}' not found`);
    }

    const pathsStmt = db.prepare(`
      SELECT p.id, p.path, p.type, p.description, p.use_when, p.created_at, p.updated_at
      FROM paths p
      JOIN feature_paths fp ON p.id = fp.path_id
      WHERE fp.feature_id = ?
      ORDER BY p.path
    `);
    const pathRows = pathsStmt.all(feature.id) as PathRow[];

    const requirementsStmt = db.prepare(`
      SELECT id, feature_id, text, notes, created_at, updated_at
      FROM requirements WHERE feature_id = ?
      ORDER BY created_at
    `);
    const requirementRows = requirementsStmt.all(
      feature.id,
    ) as RequirementRow[];

    const context: FeatureContext = {
      feature,
      paths: pathRows.map(rowToPath),
      requirements: requirementRows.map(rowToRequirement),
    };

    return createSuccessResponse(context);
  } catch (error) {
    return handleError(error);
  }
}

export function getObjectiveContext(input: GetObjectiveContextInput) {
  try {
    const db = getDb();

    const objectiveStmt = db.prepare(`
      SELECT id, slug, name, description, status, plan_file_path, created_at, updated_at
      FROM objectives WHERE slug = ?
    `);
    const objective = objectiveStmt.get(input.slug) as Objective | null;
    if (!objective) {
      throw new NotFoundError(`Objective '${input.slug}' not found`);
    }

    const tasksStmt = db.prepare(`
      SELECT id, objective_id, text, status, "order", created_at, updated_at
      FROM tasks WHERE objective_id = ?
      ORDER BY "order"
    `);
    const tasks = tasksStmt.all(objective.id) as Task[];

    const featuresStmt = db.prepare(`
      SELECT f.id, f.slug, f.name, f.description, f.created_at, f.updated_at
      FROM features f
      JOIN objective_features of ON f.id = of.feature_id
      WHERE of.objective_id = ?
      ORDER BY f.slug
    `);
    const features = featuresStmt.all(objective.id) as Feature[];

    const ticketsStmt = db.prepare(`
      SELECT t.id, t.key, t.title, t.description, t.created_at, t.updated_at
      FROM tickets t
      JOIN objective_tickets ot ON t.id = ot.ticket_id
      WHERE ot.objective_id = ?
      ORDER BY t.key
    `);
    const tickets = ticketsStmt.all(objective.id) as Ticket[];

    const context: ObjectiveContext = {
      objective,
      tasks,
      features,
      tickets,
    };

    return createSuccessResponse(context);
  } catch (error) {
    return handleError(error);
  }
}

export function findRelevantPaths(input: FindRelevantPathsInput) {
  try {
    const db = getDb();
    const queryLower = input.query.toLowerCase();
    let pathRows: PathRow[];

    if (input.feature_slugs && input.feature_slugs.length > 0) {
      // Get feature IDs
      const featureIds: string[] = [];
      const featureStmt = db.prepare(`SELECT id FROM features WHERE slug = ?`);
      for (const slug of input.feature_slugs) {
        const feature = featureStmt.get(slug) as { id: string } | null;
        if (!feature) {
          throw new NotFoundError(`Feature '${slug}' not found`);
        }
        featureIds.push(feature.id);
      }

      // Query paths linked to these features
      const placeholders = featureIds.map(() => "?").join(",");
      let sql = `
        SELECT DISTINCT p.id, p.path, p.type, p.description, p.use_when, p.created_at, p.updated_at
        FROM paths p
        JOIN feature_paths fp ON p.id = fp.path_id
        WHERE fp.feature_id IN (${placeholders})
      `;
      const params: (string | PathType)[] = [...featureIds];

      if (input.type) {
        sql += ` AND p.type = ?`;
        params.push(input.type);
      }

      sql += ` ORDER BY p.path`;
      const stmt = db.prepare(sql);
      pathRows = stmt.all(...params) as PathRow[];
    } else {
      // Query all paths
      let sql = `
        SELECT id, path, type, description, use_when, created_at, updated_at
        FROM paths
      `;
      const params: PathType[] = [];

      if (input.type) {
        sql += ` WHERE type = ?`;
        params.push(input.type);
      }

      sql += ` ORDER BY path`;
      const stmt = db.prepare(sql);
      pathRows = stmt.all(...params) as PathRow[];
    }

    // Filter by query matching description or use_when
    const matchingPaths = pathRows.map(rowToPath).filter((p) => {
      const descMatch = p.description?.toLowerCase().includes(queryLower);
      const useWhenMatch = p.use_when.some((uw) =>
        uw.toLowerCase().includes(queryLower),
      );
      return descMatch || useWhenMatch;
    });

    return createSuccessResponse({ paths: matchingPaths });
  } catch (error) {
    return handleError(error);
  }
}

export function buildContext(input: BuildContextInput) {
  try {
    const db = getDb();
    const sections: string[] = [];

    // Build objective context
    if (input.objective_slug) {
      const objectiveResult = getObjectiveContext({
        slug: input.objective_slug,
      });
      if (!objectiveResult.success) {
        return objectiveResult;
      }
      const ctx = objectiveResult.data;

      sections.push(`# Objective: ${ctx.objective.name}`);
      sections.push(`**Slug:** ${ctx.objective.slug}`);
      sections.push(`**Status:** ${ctx.objective.status}`);
      if (ctx.objective.description) {
        sections.push(`**Description:** ${ctx.objective.description}`);
      }
      if (ctx.objective.plan_file_path) {
        sections.push(`**Plan:** ${ctx.objective.plan_file_path}`);
      }

      if (ctx.tasks.length > 0) {
        sections.push("\n## Tasks");
        for (const task of ctx.tasks) {
          const statusIcon =
            task.status === "completed"
              ? "[x]"
              : task.status === "in_progress"
                ? "[~]"
                : "[ ]";
          sections.push(`- ${statusIcon} ${task.text}`);
        }
      }

      if (ctx.tickets.length > 0) {
        sections.push("\n## Tickets");
        for (const ticket of ctx.tickets) {
          const title = ticket.title ? `: ${ticket.title}` : "";
          sections.push(`- ${ticket.key}${title}`);
        }
      }

      // Add linked features to the feature_slugs for processing
      const linkedFeatureSlugs = ctx.features.map((f) => f.slug);
      if (!input.feature_slugs) {
        input.feature_slugs = linkedFeatureSlugs;
      } else {
        // Merge without duplicates
        for (const slug of linkedFeatureSlugs) {
          if (!input.feature_slugs.includes(slug)) {
            input.feature_slugs.push(slug);
          }
        }
      }
    }

    // Build feature contexts
    if (input.feature_slugs && input.feature_slugs.length > 0) {
      for (const featureSlug of input.feature_slugs) {
        const featureResult = getFeatureContext({ slug: featureSlug });
        if (!featureResult.success) {
          continue; // Skip features that don't exist
        }
        const ctx = featureResult.data;

        sections.push(`\n## Feature: ${ctx.feature.name}`);
        sections.push(`**Slug:** ${ctx.feature.slug}`);
        if (ctx.feature.description) {
          sections.push(`**Description:** ${ctx.feature.description}`);
        }

        if (ctx.requirements.length > 0) {
          sections.push("\n### Requirements");
          for (const req of ctx.requirements) {
            sections.push(`- ${req.text}`);
            if (req.notes.length > 0) {
              for (const note of req.notes) {
                sections.push(`  - ${note}`);
              }
            }
          }
        }

        if (ctx.paths.length > 0) {
          sections.push("\n### Paths");
          for (const p of ctx.paths) {
            const typeIcon = p.type === "directory" ? "/" : "";
            let line = `- \`${p.path}${typeIcon}\``;
            if (p.description) {
              line += ` - ${p.description}`;
            }
            sections.push(line);
            if (p.use_when.length > 0) {
              sections.push(`  - Use when: ${p.use_when.join("; ")}`);
            }
          }
        }
      }
    }

    const context = sections.join("\n");
    return createSuccessResponse({ context });
  } catch (error) {
    return handleError(error);
  }
}
