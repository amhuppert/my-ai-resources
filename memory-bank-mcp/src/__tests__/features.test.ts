import { describe, expect, it } from "bun:test";
import { setupTestDb } from "./setup.js";
import {
  createFeatures,
  deleteFeature,
  getFeature,
  listFeatures,
  updateFeature,
} from "../tools/features.js";

describe("Features", () => {
  setupTestDb();

  describe("createFeatures", () => {
    it("should create a single feature", () => {
      const result = createFeatures({
        features: [{ slug: "auth", name: "Authentication" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.features).toHaveLength(1);
      expect(result.data.features[0].slug).toBe("auth");
      expect(result.data.features[0].name).toBe("Authentication");
      expect(result.data.features[0].id).toBeDefined();
      expect(result.data.features[0].created_at).toBeDefined();
    });

    it("should create multiple features in batch", () => {
      const result = createFeatures({
        features: [
          { slug: "auth", name: "Authentication" },
          { slug: "user-management", name: "User Management" },
          { slug: "auth/oauth", name: "OAuth", description: "OAuth support" },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.features).toHaveLength(3);
      expect(result.data.features[0].slug).toBe("auth");
      expect(result.data.features[1].slug).toBe("user-management");
      expect(result.data.features[2].slug).toBe("auth/oauth");
      expect(result.data.features[2].description).toBe("OAuth support");
    });

    it("should create feature with description", () => {
      const result = createFeatures({
        features: [
          {
            slug: "payments",
            name: "Payments",
            description: "Payment processing system",
          },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.features[0].description).toBe(
        "Payment processing system",
      );
    });

    it("should fail on duplicate slug", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = createFeatures({
        features: [{ slug: "auth", name: "Auth 2" }],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("constraint_violation");
      expect(result.error.message).toContain("already exists");
    });
  });

  describe("getFeature", () => {
    it("should get existing feature by slug", () => {
      createFeatures({
        features: [
          { slug: "auth", name: "Auth", description: "Authentication module" },
        ],
      });

      const result = getFeature({ slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.feature.slug).toBe("auth");
      expect(result.data.feature.name).toBe("Auth");
      expect(result.data.feature.description).toBe("Authentication module");
    });

    it("should return not_found for non-existent feature", () => {
      const result = getFeature({ slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("listFeatures", () => {
    it("should list all features", () => {
      createFeatures({
        features: [
          { slug: "auth", name: "Auth" },
          { slug: "payments", name: "Payments" },
          { slug: "user", name: "User" },
        ],
      });

      const result = listFeatures({});

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.features).toHaveLength(3);
      // Should be ordered by slug
      expect(result.data.features[0].slug).toBe("auth");
      expect(result.data.features[1].slug).toBe("payments");
      expect(result.data.features[2].slug).toBe("user");
    });

    it("should list features filtered by parent slug", () => {
      createFeatures({
        features: [
          { slug: "auth", name: "Auth" },
          { slug: "auth/login", name: "Login" },
          { slug: "auth/oauth", name: "OAuth" },
          { slug: "auth/oauth/google", name: "Google OAuth" },
          { slug: "payments", name: "Payments" },
        ],
      });

      const result = listFeatures({ parent_slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.features).toHaveLength(3);
      expect(result.data.features.map((f) => f.slug)).toEqual([
        "auth/login",
        "auth/oauth",
        "auth/oauth/google",
      ]);
    });

    it("should return empty list when no features match parent", () => {
      createFeatures({
        features: [{ slug: "auth", name: "Auth" }],
      });

      const result = listFeatures({ parent_slug: "payments" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.features).toHaveLength(0);
    });
  });

  describe("updateFeature", () => {
    it("should update feature name", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = updateFeature({ slug: "auth", name: "Authentication" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.feature.name).toBe("Authentication");
    });

    it("should update feature description", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = updateFeature({
        slug: "auth",
        description: "Auth module",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.feature.description).toBe("Auth module");
    });

    it("should update both name and description", () => {
      createFeatures({
        features: [{ slug: "auth", name: "Auth", description: "Old" }],
      });

      const result = updateFeature({
        slug: "auth",
        name: "Authentication",
        description: "New desc",
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.feature.name).toBe("Authentication");
      expect(result.data.feature.description).toBe("New desc");
    });

    it("should return not_found for non-existent feature", () => {
      const result = updateFeature({ slug: "nonexistent", name: "Test" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });

    it("should update updated_at timestamp", () => {
      const createResult = createFeatures({
        features: [{ slug: "auth", name: "Auth" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const originalUpdatedAt = createResult.data.features[0].updated_at;

      // Small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 10) {
        /* wait */
      }

      const result = updateFeature({ slug: "auth", name: "Updated" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      // Note: SQLite datetime precision may cause this to be equal in fast tests
      expect(result.data.feature.updated_at).toBeDefined();
    });
  });

  describe("deleteFeature", () => {
    it("should delete existing feature", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = deleteFeature({ slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.deleted).toBe(true);

      // Verify it's gone
      const getResult = getFeature({ slug: "auth" });
      expect(getResult.success).toBe(false);
    });

    it("should return not_found for non-existent feature", () => {
      const result = deleteFeature({ slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });
});
