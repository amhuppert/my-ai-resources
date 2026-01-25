import { describe, expect, it } from "bun:test";
import { setupTestDb } from "./setup.js";
import { createFeatures } from "../tools/features.js";
import { createPaths, linkPathsToFeature } from "../tools/paths.js";
import { createRequirements } from "../tools/requirements.js";
import {
  createObjective,
  linkObjectiveToFeatures,
  linkObjectiveToTickets,
} from "../tools/objectives.js";
import { createTasks } from "../tools/tasks.js";
import { createTickets } from "../tools/tickets.js";
import {
  buildContext,
  findRelevantPaths,
  getFeatureContext,
  getObjectiveContext,
} from "../tools/context.js";

describe("Context Tools", () => {
  setupTestDb();

  describe("getFeatureContext", () => {
    it("should get feature context with paths and requirements", () => {
      createFeatures({
        features: [
          { slug: "auth", name: "Auth", description: "Authentication" },
        ],
      });
      const pathsResult = createPaths({
        paths: [
          {
            path: "src/auth/login.ts",
            type: "file",
            description: "Login handler",
            use_when: ["implementing login"],
          },
          { path: "src/auth", type: "directory", description: "Auth module" },
        ],
      });
      if (!pathsResult.success) throw new Error("Expected success");
      linkPathsToFeature({
        feature_slug: "auth",
        path_ids: pathsResult.data.paths.map((p) => p.id),
      });
      createRequirements({
        feature_slug: "auth",
        requirements: [
          { text: "Users can login", notes: ["Support SSO"] },
          { text: "Users can logout" },
        ],
      });

      const result = getFeatureContext({ slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.feature.slug).toBe("auth");
      expect(result.data.feature.name).toBe("Auth");
      expect(result.data.paths).toHaveLength(2);
      expect(result.data.requirements).toHaveLength(2);
      // Paths are ordered by path string: src/auth comes before src/auth/login.ts
      const loginPath = result.data.paths.find(
        (p) => p.path === "src/auth/login.ts",
      );
      expect(loginPath?.use_when).toEqual(["implementing login"]);
      expect(result.data.requirements[0].notes).toEqual(["Support SSO"]);
    });

    it("should return empty arrays when no paths or requirements", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = getFeatureContext({ slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(0);
      expect(result.data.requirements).toHaveLength(0);
    });

    it("should return not_found for non-existent feature", () => {
      const result = getFeatureContext({ slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("getObjectiveContext", () => {
    it("should get objective context with tasks, features, and tickets", () => {
      createObjective({
        slug: "implement-auth",
        name: "Implement Auth",
        status: "in_progress",
      });
      createFeatures({
        features: [
          { slug: "auth", name: "Auth" },
          { slug: "user", name: "User" },
        ],
      });
      createTickets({
        tickets: [
          { key: "JIRA-123", title: "Auth Feature" },
          { key: "JIRA-456", title: "User Feature" },
        ],
      });
      createTasks({
        objective_slug: "implement-auth",
        tasks: [
          { text: "Task 1", status: "completed" },
          { text: "Task 2", status: "in_progress" },
          { text: "Task 3" },
        ],
      });
      linkObjectiveToFeatures({
        objective_slug: "implement-auth",
        feature_slugs: ["auth", "user"],
      });
      linkObjectiveToTickets({
        objective_slug: "implement-auth",
        ticket_keys: ["JIRA-123", "JIRA-456"],
      });

      const result = getObjectiveContext({ slug: "implement-auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.objective.slug).toBe("implement-auth");
      expect(result.data.objective.status).toBe("in_progress");
      expect(result.data.tasks).toHaveLength(3);
      expect(result.data.features).toHaveLength(2);
      expect(result.data.tickets).toHaveLength(2);
    });

    it("should return empty arrays when no linked items", () => {
      createObjective({ slug: "solo", name: "Solo Objective" });

      const result = getObjectiveContext({ slug: "solo" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.tasks).toHaveLength(0);
      expect(result.data.features).toHaveLength(0);
      expect(result.data.tickets).toHaveLength(0);
    });

    it("should return not_found for non-existent objective", () => {
      const result = getObjectiveContext({ slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("findRelevantPaths", () => {
    it("should find paths matching query in description", () => {
      createPaths({
        paths: [
          {
            path: "src/auth.ts",
            type: "file",
            description: "Authentication handler",
          },
          { path: "src/user.ts", type: "file", description: "User management" },
          {
            path: "src/payment.ts",
            type: "file",
            description: "Payment processing",
          },
        ],
      });

      const result = findRelevantPaths({ query: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(1);
      expect(result.data.paths[0].path).toBe("src/auth.ts");
    });

    it("should find paths matching query in use_when", () => {
      createPaths({
        paths: [
          {
            path: "src/login.ts",
            type: "file",
            use_when: ["debugging authentication issues"],
          },
          { path: "src/user.ts", type: "file", use_when: ["managing users"] },
        ],
      });

      const result = findRelevantPaths({ query: "authentication" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(1);
      expect(result.data.paths[0].path).toBe("src/login.ts");
    });

    it("should find paths matching in both description and use_when", () => {
      createPaths({
        paths: [
          { path: "src/auth.ts", type: "file", description: "auth module" },
          { path: "src/login.ts", type: "file", use_when: ["auth issues"] },
          { path: "src/other.ts", type: "file", description: "other" },
        ],
      });

      const result = findRelevantPaths({ query: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(2);
    });

    it("should filter by feature_slugs", () => {
      createFeatures({
        features: [
          { slug: "auth", name: "Auth" },
          { slug: "user", name: "User" },
        ],
      });
      const pathsResult = createPaths({
        paths: [
          { path: "src/auth.ts", type: "file", description: "auth module" },
          { path: "src/user.ts", type: "file", description: "user auth" },
        ],
      });
      if (!pathsResult.success) throw new Error("Expected success");
      linkPathsToFeature({
        feature_slug: "auth",
        path_ids: [pathsResult.data.paths[0].id],
      });
      linkPathsToFeature({
        feature_slug: "user",
        path_ids: [pathsResult.data.paths[1].id],
      });

      const result = findRelevantPaths({
        query: "auth",
        feature_slugs: ["auth"],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(1);
      expect(result.data.paths[0].path).toBe("src/auth.ts");
    });

    it("should filter by type", () => {
      createPaths({
        paths: [
          { path: "src/auth.ts", type: "file", description: "auth file" },
          { path: "src/auth", type: "directory", description: "auth dir" },
        ],
      });

      const result = findRelevantPaths({ query: "auth", type: "directory" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(1);
      expect(result.data.paths[0].type).toBe("directory");
    });

    it("should be case-insensitive", () => {
      createPaths({
        paths: [
          { path: "src/auth.ts", type: "file", description: "AUTHENTICATION" },
        ],
      });

      const result = findRelevantPaths({ query: "authentication" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(1);
    });

    it("should return not_found for non-existent feature_slug", () => {
      const result = findRelevantPaths({
        query: "test",
        feature_slugs: ["nonexistent"],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("buildContext", () => {
    it("should build context for objective", () => {
      createObjective({
        slug: "implement-auth",
        name: "Implement Auth",
        description: "Add auth",
        status: "in_progress",
        plan_file_path: "plans/auth.md",
      });
      createTasks({
        objective_slug: "implement-auth",
        tasks: [
          { text: "Task 1", status: "completed" },
          { text: "Task 2", status: "in_progress" },
          { text: "Task 3" },
        ],
      });
      createTickets({ tickets: [{ key: "JIRA-123", title: "Auth" }] });
      linkObjectiveToTickets({
        objective_slug: "implement-auth",
        ticket_keys: ["JIRA-123"],
      });

      const result = buildContext({ objective_slug: "implement-auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      const ctx = result.data.context;
      expect(ctx).toContain("# Objective: Implement Auth");
      expect(ctx).toContain("**Status:** in_progress");
      expect(ctx).toContain("**Plan:** plans/auth.md");
      expect(ctx).toContain("[x] Task 1"); // completed
      expect(ctx).toContain("[~] Task 2"); // in_progress
      expect(ctx).toContain("[ ] Task 3"); // pending
      expect(ctx).toContain("JIRA-123: Auth");
    });

    it("should build context for features", () => {
      createFeatures({
        features: [{ slug: "auth", name: "Auth", description: "Auth module" }],
      });
      const pathsResult = createPaths({
        paths: [
          {
            path: "src/auth.ts",
            type: "file",
            description: "Auth handler",
            use_when: ["login issues"],
          },
        ],
      });
      if (!pathsResult.success) throw new Error("Expected success");
      linkPathsToFeature({
        feature_slug: "auth",
        path_ids: pathsResult.data.paths.map((p) => p.id),
      });
      createRequirements({
        feature_slug: "auth",
        requirements: [{ text: "Users can login", notes: ["SSO required"] }],
      });

      const result = buildContext({ feature_slugs: ["auth"] });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      const ctx = result.data.context;
      expect(ctx).toContain("## Feature: Auth");
      expect(ctx).toContain("**Description:** Auth module");
      expect(ctx).toContain("### Requirements");
      expect(ctx).toContain("- Users can login");
      expect(ctx).toContain("  - SSO required");
      expect(ctx).toContain("### Paths");
      expect(ctx).toContain("`src/auth.ts`");
      expect(ctx).toContain("Use when: login issues");
    });

    it("should build context for objective with linked features", () => {
      createObjective({ slug: "auth-obj", name: "Auth Objective" });
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      linkObjectiveToFeatures({
        objective_slug: "auth-obj",
        feature_slugs: ["auth"],
      });

      const result = buildContext({ objective_slug: "auth-obj" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      const ctx = result.data.context;
      expect(ctx).toContain("# Objective: Auth Objective");
      expect(ctx).toContain("## Feature: Auth");
    });

    it("should merge additional feature_slugs with objective linked features", () => {
      createObjective({ slug: "auth-obj", name: "Auth Objective" });
      createFeatures({
        features: [
          { slug: "auth", name: "Auth" },
          { slug: "user", name: "User" },
        ],
      });
      linkObjectiveToFeatures({
        objective_slug: "auth-obj",
        feature_slugs: ["auth"],
      });

      const result = buildContext({
        objective_slug: "auth-obj",
        feature_slugs: ["user"],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      const ctx = result.data.context;
      expect(ctx).toContain("## Feature: Auth");
      expect(ctx).toContain("## Feature: User");
    });

    it("should skip non-existent features gracefully", () => {
      const result = buildContext({ feature_slugs: ["nonexistent"] });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.context).toBe("");
    });

    it("should return not_found for non-existent objective", () => {
      const result = buildContext({ objective_slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });
});
