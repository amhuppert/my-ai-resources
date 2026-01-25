import { getDb } from "../db/connection.js";
import {
  type CreateTicketsInput,
  type DeleteTicketInput,
  type GetTicketInput,
  type ListTicketsInput,
  type Ticket,
  type UpdateTicketInput,
} from "../schemas/tickets.js";
import { createSuccessResponse } from "../schemas/common.js";
import {
  ConstraintViolationError,
  handleError,
  NotFoundError,
} from "../utils/errors.js";
import { generateId } from "../utils/id.js";

export function createTickets(input: CreateTicketsInput) {
  try {
    const db = getDb();
    const createdTickets: Ticket[] = [];

    const insertStmt = db.prepare(`
      INSERT INTO tickets (id, key, title, description)
      VALUES (?, ?, ?, ?)
    `);

    const selectStmt = db.prepare(`
      SELECT id, key, title, description, created_at, updated_at
      FROM tickets WHERE id = ?
    `);

    db.transaction(() => {
      for (const ticket of input.tickets) {
        const id = generateId();
        try {
          insertStmt.run(
            id,
            ticket.key,
            ticket.title ?? null,
            ticket.description ?? null,
          );
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("UNIQUE constraint")
          ) {
            throw new ConstraintViolationError(
              `Ticket with key '${ticket.key}' already exists`,
            );
          }
          throw error;
        }
        const created = selectStmt.get(id) as Ticket;
        createdTickets.push(created);
      }
    })();

    return createSuccessResponse({ tickets: createdTickets });
  } catch (error) {
    return handleError(error);
  }
}

export function getTicket(input: GetTicketInput) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, key, title, description, created_at, updated_at
      FROM tickets WHERE key = ?
    `);
    const ticket = stmt.get(input.key) as Ticket | null;

    if (!ticket) {
      throw new NotFoundError(`Ticket '${input.key}' not found`);
    }

    return createSuccessResponse({ ticket });
  } catch (error) {
    return handleError(error);
  }
}

export function listTickets(_input: ListTicketsInput) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, key, title, description, created_at, updated_at
      FROM tickets
      ORDER BY key
    `);
    const tickets = stmt.all() as Ticket[];

    return createSuccessResponse({ tickets });
  } catch (error) {
    return handleError(error);
  }
}

export function updateTicket(input: UpdateTicketInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM tickets WHERE key = ?`);
    const existing = existingStmt.get(input.key);
    if (!existing) {
      throw new NotFoundError(`Ticket '${input.key}' not found`);
    }

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (input.title !== undefined) {
      updates.push("title = ?");
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push("description = ?");
      values.push(input.description);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(input.key);

      const updateStmt = db.prepare(`
        UPDATE tickets SET ${updates.join(", ")} WHERE key = ?
      `);
      updateStmt.run(...values);
    }

    const selectStmt = db.prepare(`
      SELECT id, key, title, description, created_at, updated_at
      FROM tickets WHERE key = ?
    `);
    const ticket = selectStmt.get(input.key) as Ticket;

    return createSuccessResponse({ ticket });
  } catch (error) {
    return handleError(error);
  }
}

export function deleteTicket(input: DeleteTicketInput) {
  try {
    const db = getDb();

    const existingStmt = db.prepare(`SELECT id FROM tickets WHERE key = ?`);
    const existing = existingStmt.get(input.key);
    if (!existing) {
      throw new NotFoundError(`Ticket '${input.key}' not found`);
    }

    const deleteStmt = db.prepare(`DELETE FROM tickets WHERE key = ?`);
    deleteStmt.run(input.key);

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
