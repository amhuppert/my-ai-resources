import { describe, expect, it } from "bun:test";
import { setupTestDb } from "./setup.js";
import { createFeatures } from "../tools/features.js";
import {
  createPaths,
  deletePath,
  getPath,
  linkPathsToFeature,
  listPaths,
  unlinkPathFromFeature,
  updatePath,
} from "../tools/paths.js";

describe("Paths", () => {
  setupTestDb();

  describe("createPaths", () => {
    it("should create a file path", () => {
      const result = createPaths({
        paths: [
          {
            path: "src/auth/login.ts",
            type: "file",
            description: "Login handler",
          },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(1);
      expect(result.data.paths[0].path).toBe("src/auth/login.ts");
      expect(result.data.paths[0].type).toBe("file");
      expect(result.data.paths[0].description).toBe("Login handler");
      expect(result.data.paths[0].use_when).toEqual([]);
      expect(result.data.paths[0].id).toBeDefined();
    });

    it("should create a directory path", () => {
      const result = createPaths({
        paths: [
          {
            path: "src/auth",
            type: "directory",
            description: "Auth module",
          },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths[0].type).toBe("directory");
    });

    it("should create path with use_when conditions", () => {
      const result = createPaths({
        paths: [
          {
            path: "src/auth/oauth.ts",
            type: "file",
            description: "OAuth handler",
            use_when: ["implementing OAuth", "debugging auth issues"],
          },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths[0].use_when).toEqual([
        "implementing OAuth",
        "debugging auth issues",
      ]);
    });

    it("should create multiple paths in batch", () => {
      const result = createPaths({
        paths: [
          { path: "src/auth/login.ts", type: "file" },
          { path: "src/auth/logout.ts", type: "file" },
          { path: "src/utils", type: "directory" },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(3);
    });

    it("should normalize paths with leading ./", () => {
      const result = createPaths({
        paths: [{ path: "./src/auth/login.ts", type: "file" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths[0].path).toBe("src/auth/login.ts");
    });

    it("should normalize paths with leading /", () => {
      const result = createPaths({
        paths: [{ path: "/src/auth/login.ts", type: "file" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths[0].path).toBe("src/auth/login.ts");
    });

    it("should normalize paths with trailing /", () => {
      const result = createPaths({
        paths: [{ path: "src/auth/", type: "directory" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths[0].path).toBe("src/auth");
    });

    it("should fail on duplicate path", () => {
      createPaths({ paths: [{ path: "src/auth.ts", type: "file" }] });

      const result = createPaths({
        paths: [{ path: "src/auth.ts", type: "file" }],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("constraint_violation");
    });
  });

  describe("getPath", () => {
    it("should get path by id", () => {
      const createResult = createPaths({
        paths: [
          { path: "src/auth.ts", type: "file", description: "Auth file" },
        ],
      });
      if (!createResult.success) throw new Error("Expected success");
      const pathId = createResult.data.paths[0].id;

      const result = getPath({ id: pathId });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.path.id).toBe(pathId);
      expect(result.data.path.path).toBe("src/auth.ts");
    });

    it("should get path by path string", () => {
      createPaths({
        paths: [
          { path: "src/auth.ts", type: "file", description: "Auth file" },
        ],
      });

      const result = getPath({ path: "src/auth.ts" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.path.path).toBe("src/auth.ts");
    });

    it("should normalize path string when getting", () => {
      createPaths({
        paths: [{ path: "src/auth.ts", type: "file" }],
      });

      const result = getPath({ path: "./src/auth.ts" });

      expect(result.success).toBe(true);
    });

    it("should return validation_error when neither id nor path provided", () => {
      const result = getPath({});

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("validation_error");
      expect(result.error.message).toContain("Either 'id' or 'path'");
    });

    it("should return not_found for non-existent id", () => {
      const result = getPath({ id: "nonexistent123" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });

    it("should return not_found for non-existent path", () => {
      const result = getPath({ path: "nonexistent.ts" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("listPaths", () => {
    it("should list all paths", () => {
      createPaths({
        paths: [
          { path: "src/a.ts", type: "file" },
          { path: "src/b.ts", type: "file" },
          { path: "src", type: "directory" },
        ],
      });

      const result = listPaths({});

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(3);
    });

    it("should list paths filtered by type (file)", () => {
      createPaths({
        paths: [
          { path: "src/a.ts", type: "file" },
          { path: "src/b.ts", type: "file" },
          { path: "src", type: "directory" },
        ],
      });

      const result = listPaths({ type: "file" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(2);
      expect(result.data.paths.every((p) => p.type === "file")).toBe(true);
    });

    it("should list paths filtered by type (directory)", () => {
      createPaths({
        paths: [
          { path: "src/a.ts", type: "file" },
          { path: "src", type: "directory" },
          { path: "lib", type: "directory" },
        ],
      });

      const result = listPaths({ type: "directory" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(2);
      expect(result.data.paths.every((p) => p.type === "directory")).toBe(true);
    });

    it("should list paths filtered by feature_slug", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const pathsResult = createPaths({
        paths: [
          { path: "src/auth.ts", type: "file" },
          { path: "src/other.ts", type: "file" },
        ],
      });
      if (!pathsResult.success) throw new Error("Expected success");

      linkPathsToFeature({
        feature_slug: "auth",
        path_ids: [pathsResult.data.paths[0].id],
      });

      const result = listPaths({ feature_slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(1);
      expect(result.data.paths[0].path).toBe("src/auth.ts");
    });

    it("should list paths filtered by feature_slug and type", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const pathsResult = createPaths({
        paths: [
          { path: "src/auth.ts", type: "file" },
          { path: "src/auth", type: "directory" },
        ],
      });
      if (!pathsResult.success) throw new Error("Expected success");

      linkPathsToFeature({
        feature_slug: "auth",
        path_ids: pathsResult.data.paths.map((p) => p.id),
      });

      const result = listPaths({ feature_slug: "auth", type: "file" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.paths).toHaveLength(1);
      expect(result.data.paths[0].type).toBe("file");
    });

    it("should return not_found for non-existent feature_slug", () => {
      const result = listPaths({ feature_slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("updatePath", () => {
    it("should update path description", () => {
      const createResult = createPaths({
        paths: [{ path: "src/auth.ts", type: "file" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const pathId = createResult.data.paths[0].id;

      const result = updatePath({ id: pathId, description: "Auth handler" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.path.description).toBe("Auth handler");
    });

    it("should update path use_when", () => {
      const createResult = createPaths({
        paths: [{ path: "src/auth.ts", type: "file" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const pathId = createResult.data.paths[0].id;

      const result = updatePath({
        id: pathId,
        use_when: ["debugging auth", "adding login"],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.path.use_when).toEqual([
        "debugging auth",
        "adding login",
      ]);
    });

    it("should return not_found for non-existent path", () => {
      const result = updatePath({ id: "nonexistent", description: "Test" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("deletePath", () => {
    it("should delete existing path", () => {
      const createResult = createPaths({
        paths: [{ path: "src/auth.ts", type: "file" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const pathId = createResult.data.paths[0].id;

      const result = deletePath({ id: pathId });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.deleted).toBe(true);

      // Verify it's gone
      const getResult = getPath({ id: pathId });
      expect(getResult.success).toBe(false);
    });

    it("should return not_found for non-existent path", () => {
      const result = deletePath({ id: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("linkPathsToFeature", () => {
    it("should link paths to feature", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const pathsResult = createPaths({
        paths: [
          { path: "src/auth.ts", type: "file" },
          { path: "src/login.ts", type: "file" },
        ],
      });
      if (!pathsResult.success) throw new Error("Expected success");

      const result = linkPathsToFeature({
        feature_slug: "auth",
        path_ids: pathsResult.data.paths.map((p) => p.id),
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.linked).toBe(2);

      // Verify paths are linked
      const listResult = listPaths({ feature_slug: "auth" });
      if (!listResult.success) throw new Error("Expected success");
      expect(listResult.data.paths).toHaveLength(2);
    });

    it("should ignore duplicate links", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const pathsResult = createPaths({
        paths: [{ path: "src/auth.ts", type: "file" }],
      });
      if (!pathsResult.success) throw new Error("Expected success");
      const pathId = pathsResult.data.paths[0].id;

      // Link twice
      linkPathsToFeature({ feature_slug: "auth", path_ids: [pathId] });
      const result = linkPathsToFeature({
        feature_slug: "auth",
        path_ids: [pathId],
      });

      expect(result.success).toBe(true);

      // Should still only have one link
      const listResult = listPaths({ feature_slug: "auth" });
      if (!listResult.success) throw new Error("Expected success");
      expect(listResult.data.paths).toHaveLength(1);
    });

    it("should return not_found for non-existent feature", () => {
      const pathsResult = createPaths({
        paths: [{ path: "src/auth.ts", type: "file" }],
      });
      if (!pathsResult.success) throw new Error("Expected success");

      const result = linkPathsToFeature({
        feature_slug: "nonexistent",
        path_ids: [pathsResult.data.paths[0].id],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });

    it("should return not_found for non-existent path", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = linkPathsToFeature({
        feature_slug: "auth",
        path_ids: ["nonexistent"],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("unlinkPathFromFeature", () => {
    it("should unlink path from feature", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const pathsResult = createPaths({
        paths: [{ path: "src/auth.ts", type: "file" }],
      });
      if (!pathsResult.success) throw new Error("Expected success");
      const pathId = pathsResult.data.paths[0].id;

      linkPathsToFeature({ feature_slug: "auth", path_ids: [pathId] });

      const result = unlinkPathFromFeature({
        feature_slug: "auth",
        path_id: pathId,
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.unlinked).toBe(true);

      // Verify it's unlinked
      const listResult = listPaths({ feature_slug: "auth" });
      if (!listResult.success) throw new Error("Expected success");
      expect(listResult.data.paths).toHaveLength(0);
    });

    it("should return not_found for non-existent feature", () => {
      const result = unlinkPathFromFeature({
        feature_slug: "nonexistent",
        path_id: "someid",
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });

    it("should return not_found for non-existent link", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const pathsResult = createPaths({
        paths: [{ path: "src/auth.ts", type: "file" }],
      });
      if (!pathsResult.success) throw new Error("Expected success");

      // Don't link, try to unlink
      const result = unlinkPathFromFeature({
        feature_slug: "auth",
        path_id: pathsResult.data.paths[0].id,
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });
});
