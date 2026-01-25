import { getDb } from "../db/connection.js";
import {
  type CreateTasksInput,
  type DeleteTaskInput,
  type GetTaskInput,
  type ListTasksInput,
  type ReorderTasksInput,
  type Task,
  type UpdateTaskInput,
} from "../schemas/tasks.js";
import { createSuccessResponse } from "../schemas/common.js";
import {
  handleError,
  NotFoundError,
  ValidationError,
} from "../utils/errors.js";
import { generateId } from "../utils/id.js";

export function createTasks(input: CreateTasksInput) {
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

    const maxOrderStmt = db.prepare(`
      SELECT COALESCE(MAX("order"), -1) as max_order FROM tasks WHERE objective_id = ?
    `);
    const { max_order } = maxOrderStmt.get(objective.id) as {
      max_order: number;
    };

    const createdTasks: Task[] = [];

    const insertStmt = db.prepare(`
      INSERT INTO tasks (id, objective_id, text, status, "order")
      VALUES (?, ?, ?, ?, ?)
    `);

    const selectStmt = db.prepare(`
      SELECT id, objective_id, text, status, "order", created_at, updated_at
      FROM tasks WHERE id = ?
    `);

    db.transaction(() => {
      let currentOrder = max_order + 1;
      for (const task of input.tasks) {
        const id = generateId();
        insertStmt.run(
          id,
          objective.id,
          task.text,
          task.status ?? "pending",
          currentOrder,
        );
        const created = selectStmt.get(id) as Task;
        createdTasks.push(created);
        currentOrder++;
      }
    })();

    return createSuccessResponse({ tasks: createdTasks });
  } catch (error) {
    return handleError(error);
  }
}

export function getTask(input: GetTaskInput) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, objective_id, text, status, "order", created_at, updated_at
      FROM tasks WHERE id = ?
    `);
    const task = stmt.get(input.id) as Task | null;

    if (!task) {
      throw new NotFoundError(`Task '${input.id}' not found`);
    }

    return createSuccessResponse({ task });
  } catch (error) {
    return handleError(error);
  }
}

export function listTasks(input: ListTasksInput) {
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

    let tasks: Task[];

    if (input.status) {
      const stmt = db.prepare(`
        SELECT id, objective_id, text, status, "order", created_at, updated_at
        FROM tasks WHERE objective_id = ? AND status = ?
        ORDER BY "order"
      `);
      tasks = stmt.all(objective.id, input.status) as Task[];
    } else {
      const stmt = db.prepare(`
        SELECT id, objective_id, text, status, "order", created_at, updated_at
        FROM tasks WHERE objective_id = ?
        ORDER BY "order"
      `);
      tasks = stmt.all(objective.id) as Task[];
    }

    return createSuccessResponse({ tasks });
  } catch (error) {
    return handleError(error);
  }
}

export function updateTask(input: UpdateTaskInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM tasks WHERE id = ?`);
    const existing = existingStmt.get(input.id);
    if (!existing) {
      throw new NotFoundError(`Task '${input.id}' not found`);
    }

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (input.text !== undefined) {
      updates.push("text = ?");
      values.push(input.text);
    }
    if (input.status !== undefined) {
      updates.push("status = ?");
      values.push(input.status);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(input.id);

      const updateStmt = db.prepare(`
        UPDATE tasks SET ${updates.join(", ")} WHERE id = ?
      `);
      updateStmt.run(...values);
    }

    const selectStmt = db.prepare(`
      SELECT id, objective_id, text, status, "order", created_at, updated_at
      FROM tasks WHERE id = ?
    `);
    const task = selectStmt.get(input.id) as Task;

    return createSuccessResponse({ task });
  } catch (error) {
    return handleError(error);
  }
}

export function deleteTask(input: DeleteTaskInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM tasks WHERE id = ?`);
    const existing = existingStmt.get(input.id);
    if (!existing) {
      throw new NotFoundError(`Task '${input.id}' not found`);
    }

    const deleteStmt = db.prepare(`DELETE FROM tasks WHERE id = ?`);
    deleteStmt.run(input.id);

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}

export function reorderTasks(input: ReorderTasksInput) {
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

    const taskStmt = db.prepare(
      `SELECT id FROM tasks WHERE id = ? AND objective_id = ?`,
    );
    const updateStmt = db.prepare(
      `UPDATE tasks SET "order" = ?, updated_at = datetime('now') WHERE id = ?`,
    );

    db.transaction(() => {
      for (let i = 0; i < input.task_ids.length; i++) {
        const taskId = input.task_ids[i];
        const task = taskStmt.get(taskId, objective.id);
        if (!task) {
          throw new ValidationError(
            `Task '${taskId}' not found or doesn't belong to objective '${input.objective_slug}'`,
          );
        }
        updateStmt.run(i, taskId);
      }
    })();

    const listStmt = db.prepare(`
      SELECT id, objective_id, text, status, "order", created_at, updated_at
      FROM tasks WHERE objective_id = ?
      ORDER BY "order"
    `);
    const tasks = listStmt.all(objective.id) as Task[];

    return createSuccessResponse({ tasks });
  } catch (error) {
    return handleError(error);
  }
}
