import { describe, expect, it } from "bun:test";
import { setupTestDb } from "./setup.js";
import {
  createTickets,
  deleteTicket,
  getTicket,
  listTickets,
  updateTicket,
} from "../tools/tickets.js";

describe("Tickets", () => {
  setupTestDb();

  describe("createTickets", () => {
    it("should create a ticket with key only", () => {
      const result = createTickets({
        tickets: [{ key: "JIRA-123" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tickets).toHaveLength(1);
      expect(result.data.tickets[0].key).toBe("JIRA-123");
      expect(result.data.tickets[0].title).toBeNull();
      expect(result.data.tickets[0].description).toBeNull();
      expect(result.data.tickets[0].id).toBeDefined();
    });

    it("should create a ticket with all fields", () => {
      const result = createTickets({
        tickets: [
          {
            key: "JIRA-123",
            title: "Implement Authentication",
            description: "Add user login and logout functionality",
          },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tickets[0].title).toBe("Implement Authentication");
      expect(result.data.tickets[0].description).toBe(
        "Add user login and logout functionality",
      );
    });

    it("should create multiple tickets in batch", () => {
      const result = createTickets({
        tickets: [
          { key: "JIRA-123", title: "Ticket 1" },
          { key: "JIRA-456", title: "Ticket 2" },
          { key: "JIRA-789", title: "Ticket 3" },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tickets).toHaveLength(3);
    });

    it("should fail on duplicate key", () => {
      createTickets({ tickets: [{ key: "JIRA-123" }] });

      const result = createTickets({ tickets: [{ key: "JIRA-123" }] });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("constraint_violation");
    });
  });

  describe("getTicket", () => {
    it("should get ticket by key", () => {
      createTickets({
        tickets: [
          { key: "JIRA-123", title: "Auth", description: "Auth feature" },
        ],
      });

      const result = getTicket({ key: "JIRA-123" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.ticket.key).toBe("JIRA-123");
      expect(result.data.ticket.title).toBe("Auth");
      expect(result.data.ticket.description).toBe("Auth feature");
    });

    it("should return not_found for non-existent ticket", () => {
      const result = getTicket({ key: "NONEXISTENT-999" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("listTickets", () => {
    it("should list all tickets", () => {
      createTickets({
        tickets: [
          { key: "JIRA-123" },
          { key: "JIRA-456" },
          { key: "JIRA-789" },
        ],
      });

      const result = listTickets({});

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tickets).toHaveLength(3);
      // Should be ordered by key
      expect(result.data.tickets[0].key).toBe("JIRA-123");
      expect(result.data.tickets[1].key).toBe("JIRA-456");
      expect(result.data.tickets[2].key).toBe("JIRA-789");
    });

    it("should return empty list when no tickets exist", () => {
      const result = listTickets({});

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tickets).toHaveLength(0);
    });
  });

  describe("updateTicket", () => {
    it("should update ticket title", () => {
      createTickets({ tickets: [{ key: "JIRA-123", title: "Original" }] });

      const result = updateTicket({ key: "JIRA-123", title: "Updated" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.ticket.title).toBe("Updated");
    });

    it("should update ticket description", () => {
      createTickets({ tickets: [{ key: "JIRA-123" }] });

      const result = updateTicket({
        key: "JIRA-123",
        description: "New description",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.ticket.description).toBe("New description");
    });

    it("should update both title and description", () => {
      createTickets({ tickets: [{ key: "JIRA-123" }] });

      const result = updateTicket({
        key: "JIRA-123",
        title: "New Title",
        description: "New Description",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.ticket.title).toBe("New Title");
      expect(result.data.ticket.description).toBe("New Description");
    });

    it("should return not_found for non-existent ticket", () => {
      const result = updateTicket({ key: "NONEXISTENT-999", title: "Test" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("deleteTicket", () => {
    it("should delete ticket", () => {
      createTickets({ tickets: [{ key: "JIRA-123" }] });

      const result = deleteTicket({ key: "JIRA-123" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.deleted).toBe(true);

      // Verify it's gone
      const getResult = getTicket({ key: "JIRA-123" });
      expect(getResult.success).toBe(false);
    });

    it("should return not_found for non-existent ticket", () => {
      const result = deleteTicket({ key: "NONEXISTENT-999" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });
});
