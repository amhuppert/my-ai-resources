import { describe, expect, it } from "bun:test";
import { setupTestDb } from "./setup.js";
import { createObjective, deleteObjective } from "../tools/objectives.js";
import {
  createTasks,
  deleteTask,
  getTask,
  listTasks,
  reorderTasks,
  updateTask,
} from "../tools/tasks.js";

describe("Tasks", () => {
  setupTestDb();

  describe("createTasks", () => {
    it("should create a task for an objective", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });

      const result = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Implement login form" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tasks).toHaveLength(1);
      expect(result.data.tasks[0].text).toBe("Implement login form");
      expect(result.data.tasks[0].status).toBe("pending");
      expect(result.data.tasks[0].order).toBe(0);
      expect(result.data.tasks[0].id).toBeDefined();
    });

    it("should create task with custom status", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });

      const result = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Implement login form", status: "in_progress" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tasks[0].status).toBe("in_progress");
    });

    it("should create multiple tasks with auto-ordering", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });

      const result = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Task 1" }, { text: "Task 2" }, { text: "Task 3" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tasks).toHaveLength(3);
      expect(result.data.tasks[0].order).toBe(0);
      expect(result.data.tasks[1].order).toBe(1);
      expect(result.data.tasks[2].order).toBe(2);
    });

    it("should continue ordering from existing tasks", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Task 1" }, { text: "Task 2" }],
      });

      const result = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Task 3" }, { text: "Task 4" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tasks[0].order).toBe(2);
      expect(result.data.tasks[1].order).toBe(3);
    });

    it("should return not_found for non-existent objective", () => {
      const result = createTasks({
        objective_slug: "nonexistent",
        tasks: [{ text: "Task 1" }],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("getTask", () => {
    it("should get task by id", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      const createResult = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Implement login" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const taskId = createResult.data.tasks[0].id;

      const result = getTask({ id: taskId });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.task.id).toBe(taskId);
      expect(result.data.task.text).toBe("Implement login");
    });

    it("should return not_found for non-existent task", () => {
      const result = getTask({ id: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("listTasks", () => {
    it("should list tasks for an objective", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Task 1" }, { text: "Task 2" }, { text: "Task 3" }],
      });

      const result = listTasks({ objective_slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tasks).toHaveLength(3);
      // Should be ordered by order
      expect(result.data.tasks[0].text).toBe("Task 1");
      expect(result.data.tasks[1].text).toBe("Task 2");
      expect(result.data.tasks[2].text).toBe("Task 3");
    });

    it("should list tasks filtered by status", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      createTasks({
        objective_slug: "auth",
        tasks: [
          { text: "Task 1", status: "pending" },
          { text: "Task 2", status: "in_progress" },
          { text: "Task 3", status: "completed" },
          { text: "Task 4", status: "pending" },
        ],
      });

      const result = listTasks({ objective_slug: "auth", status: "pending" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tasks).toHaveLength(2);
      expect(result.data.tasks.every((t) => t.status === "pending")).toBe(true);
    });

    it("should return not_found for non-existent objective", () => {
      const result = listTasks({ objective_slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("updateTask", () => {
    it("should update task text", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      const createResult = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Original" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const taskId = createResult.data.tasks[0].id;

      const result = updateTask({ id: taskId, text: "Updated text" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.task.text).toBe("Updated text");
    });

    it("should update task status", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      const createResult = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Task" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const taskId = createResult.data.tasks[0].id;

      const result = updateTask({ id: taskId, status: "completed" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.task.status).toBe("completed");
    });

    it("should return not_found for non-existent task", () => {
      const result = updateTask({ id: "nonexistent", text: "Test" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("deleteTask", () => {
    it("should delete task", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      const createResult = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Task" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const taskId = createResult.data.tasks[0].id;

      const result = deleteTask({ id: taskId });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.deleted).toBe(true);

      // Verify it's gone
      const getResult = getTask({ id: taskId });
      expect(getResult.success).toBe(false);
    });

    it("should return not_found for non-existent task", () => {
      const result = deleteTask({ id: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("reorderTasks", () => {
    it("should reorder tasks", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      const createResult = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Task 1" }, { text: "Task 2" }, { text: "Task 3" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const taskIds = createResult.data.tasks.map((t) => t.id);

      // Reverse the order
      const result = reorderTasks({
        objective_slug: "auth",
        task_ids: [taskIds[2], taskIds[1], taskIds[0]],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tasks[0].id).toBe(taskIds[2]);
      expect(result.data.tasks[0].order).toBe(0);
      expect(result.data.tasks[1].id).toBe(taskIds[1]);
      expect(result.data.tasks[1].order).toBe(1);
      expect(result.data.tasks[2].id).toBe(taskIds[0]);
      expect(result.data.tasks[2].order).toBe(2);
    });

    it("should return not_found for non-existent objective", () => {
      const result = reorderTasks({
        objective_slug: "nonexistent",
        task_ids: ["task1"],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });

    it("should return validation_error for task not belonging to objective", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      createObjective({ slug: "other", name: "Other Objective" });
      createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Task 1" }],
      });
      const otherResult = createTasks({
        objective_slug: "other",
        tasks: [{ text: "Other Task" }],
      });
      if (!otherResult.success) throw new Error("Expected success");
      const otherTaskId = otherResult.data.tasks[0].id;

      // Try to use other objective's task in auth's reorder
      const result = reorderTasks({
        objective_slug: "auth",
        task_ids: [otherTaskId],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("validation_error");
    });
  });

  describe("cascade delete", () => {
    it("should delete tasks when objective is deleted", () => {
      createObjective({ slug: "auth", name: "Auth Objective" });
      const createResult = createTasks({
        objective_slug: "auth",
        tasks: [{ text: "Task 1" }, { text: "Task 2" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const taskIds = createResult.data.tasks.map((t) => t.id);

      // Delete the objective
      deleteObjective({ slug: "auth" });

      // Tasks should be gone
      for (const taskId of taskIds) {
        const result = getTask({ id: taskId });
        expect(result.success).toBe(false);
      }
    });
  });
});
