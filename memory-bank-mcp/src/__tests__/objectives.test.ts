import { describe, expect, it } from "bun:test";
import { setupTestDb } from "./setup.js";
import { createFeatures } from "../tools/features.js";
import { createTickets } from "../tools/tickets.js";
import {
  createObjective,
  deleteObjective,
  getObjective,
  linkObjectiveToFeatures,
  linkObjectiveToTickets,
  listObjectives,
  unlinkObjectiveFromFeature,
  unlinkObjectiveFromTicket,
  updateObjective,
} from "../tools/objectives.js";

describe("Objectives", () => {
  setupTestDb();

  describe("createObjective", () => {
    it("should create an objective", () => {
      const result = createObjective({
        slug: "implement-auth",
        name: "Implement Authentication",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.objective.slug).toBe("implement-auth");
      expect(result.data.objective.name).toBe("Implement Authentication");
      expect(result.data.objective.status).toBe("pending");
      expect(result.data.objective.id).toBeDefined();
    });

    it("should create objective with all fields", () => {
      const result = createObjective({
        slug: "implement-auth",
        name: "Implement Authentication",
        description: "Add user authentication to the app",
        status: "in_progress",
        plan_file_path:
          "memory-bank/objectives/implement-auth/2024-01-01_plan.md",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.objective.description).toBe(
        "Add user authentication to the app",
      );
      expect(result.data.objective.status).toBe("in_progress");
      expect(result.data.objective.plan_file_path).toBe(
        "memory-bank/objectives/implement-auth/2024-01-01_plan.md",
      );
    });

    it("should fail on duplicate slug", () => {
      createObjective({ slug: "auth", name: "Auth" });

      const result = createObjective({ slug: "auth", name: "Auth 2" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("constraint_violation");
    });
  });

  describe("getObjective", () => {
    it("should get objective by slug", () => {
      createObjective({
        slug: "implement-auth",
        name: "Implement Auth",
        description: "Add auth",
      });

      const result = getObjective({ slug: "implement-auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.objective.slug).toBe("implement-auth");
      expect(result.data.objective.name).toBe("Implement Auth");
    });

    it("should return not_found for non-existent objective", () => {
      const result = getObjective({ slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("listObjectives", () => {
    it("should list all objectives", () => {
      createObjective({ slug: "obj-1", name: "Objective 1" });
      createObjective({ slug: "obj-2", name: "Objective 2" });
      createObjective({ slug: "obj-3", name: "Objective 3" });

      const result = listObjectives({});

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.objectives).toHaveLength(3);
    });

    it("should list objectives filtered by status", () => {
      createObjective({ slug: "obj-1", name: "Obj 1", status: "pending" });
      createObjective({ slug: "obj-2", name: "Obj 2", status: "in_progress" });
      createObjective({ slug: "obj-3", name: "Obj 3", status: "completed" });
      createObjective({ slug: "obj-4", name: "Obj 4", status: "in_progress" });

      const result = listObjectives({ status: "in_progress" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.objectives).toHaveLength(2);
      expect(
        result.data.objectives.every((o) => o.status === "in_progress"),
      ).toBe(true);
    });
  });

  describe("updateObjective", () => {
    it("should update objective name", () => {
      createObjective({ slug: "auth", name: "Auth" });

      const result = updateObjective({ slug: "auth", name: "Authentication" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.objective.name).toBe("Authentication");
    });

    it("should update objective status", () => {
      createObjective({ slug: "auth", name: "Auth" });

      const result = updateObjective({ slug: "auth", status: "in_progress" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.objective.status).toBe("in_progress");
    });

    it("should update objective plan_file_path", () => {
      createObjective({ slug: "auth", name: "Auth" });

      const result = updateObjective({
        slug: "auth",
        plan_file_path: "plans/auth.md",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.objective.plan_file_path).toBe("plans/auth.md");
    });

    it("should return not_found for non-existent objective", () => {
      const result = updateObjective({ slug: "nonexistent", name: "Test" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("deleteObjective", () => {
    it("should delete objective", () => {
      createObjective({ slug: "auth", name: "Auth" });

      const result = deleteObjective({ slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.deleted).toBe(true);

      // Verify it's gone
      const getResult = getObjective({ slug: "auth" });
      expect(getResult.success).toBe(false);
    });

    it("should return not_found for non-existent objective", () => {
      const result = deleteObjective({ slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("linkObjectiveToFeatures", () => {
    it("should link objective to features", () => {
      createObjective({ slug: "auth-objective", name: "Auth Objective" });
      createFeatures({
        features: [
          { slug: "auth", name: "Auth" },
          { slug: "user", name: "User" },
        ],
      });

      const result = linkObjectiveToFeatures({
        objective_slug: "auth-objective",
        feature_slugs: ["auth", "user"],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.linked).toBe(2);
    });

    it("should ignore duplicate links", () => {
      createObjective({ slug: "auth-objective", name: "Auth Objective" });
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      linkObjectiveToFeatures({
        objective_slug: "auth-objective",
        feature_slugs: ["auth"],
      });
      const result = linkObjectiveToFeatures({
        objective_slug: "auth-objective",
        feature_slugs: ["auth"],
      });

      expect(result.success).toBe(true);
    });

    it("should return not_found for non-existent objective", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = linkObjectiveToFeatures({
        objective_slug: "nonexistent",
        feature_slugs: ["auth"],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });

    it("should return not_found for non-existent feature", () => {
      createObjective({ slug: "auth-objective", name: "Auth Objective" });

      const result = linkObjectiveToFeatures({
        objective_slug: "auth-objective",
        feature_slugs: ["nonexistent"],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("unlinkObjectiveFromFeature", () => {
    it("should unlink objective from feature", () => {
      createObjective({ slug: "auth-objective", name: "Auth Objective" });
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      linkObjectiveToFeatures({
        objective_slug: "auth-objective",
        feature_slugs: ["auth"],
      });

      const result = unlinkObjectiveFromFeature({
        objective_slug: "auth-objective",
        feature_slug: "auth",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.unlinked).toBe(true);
    });

    it("should return not_found for non-existent objective", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = unlinkObjectiveFromFeature({
        objective_slug: "nonexistent",
        feature_slug: "auth",
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });

    it("should return not_found for non-existent link", () => {
      createObjective({ slug: "auth-objective", name: "Auth Objective" });
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      // Don't link, try to unlink

      const result = unlinkObjectiveFromFeature({
        objective_slug: "auth-objective",
        feature_slug: "auth",
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("linkObjectiveToTickets", () => {
    it("should link objective to tickets", () => {
      createObjective({ slug: "auth-objective", name: "Auth Objective" });
      createTickets({
        tickets: [
          { key: "JIRA-123", title: "Auth Feature" },
          { key: "JIRA-456", title: "User Feature" },
        ],
      });

      const result = linkObjectiveToTickets({
        objective_slug: "auth-objective",
        ticket_keys: ["JIRA-123", "JIRA-456"],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.linked).toBe(2);
    });

    it("should return not_found for non-existent objective", () => {
      createTickets({ tickets: [{ key: "JIRA-123" }] });

      const result = linkObjectiveToTickets({
        objective_slug: "nonexistent",
        ticket_keys: ["JIRA-123"],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });

    it("should return not_found for non-existent ticket", () => {
      createObjective({ slug: "auth-objective", name: "Auth Objective" });

      const result = linkObjectiveToTickets({
        objective_slug: "auth-objective",
        ticket_keys: ["NONEXISTENT-999"],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("unlinkObjectiveFromTicket", () => {
    it("should unlink objective from ticket", () => {
      createObjective({ slug: "auth-objective", name: "Auth Objective" });
      createTickets({ tickets: [{ key: "JIRA-123" }] });
      linkObjectiveToTickets({
        objective_slug: "auth-objective",
        ticket_keys: ["JIRA-123"],
      });

      const result = unlinkObjectiveFromTicket({
        objective_slug: "auth-objective",
        ticket_key: "JIRA-123",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.unlinked).toBe(true);
    });

    it("should return not_found for non-existent link", () => {
      createObjective({ slug: "auth-objective", name: "Auth Objective" });
      createTickets({ tickets: [{ key: "JIRA-123" }] });
      // Don't link, try to unlink

      const result = unlinkObjectiveFromTicket({
        objective_slug: "auth-objective",
        ticket_key: "JIRA-123",
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });
});
