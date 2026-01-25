import { describe, expect, it } from "bun:test";
import { setupTestDb } from "./setup.js";
import { createFeatures, deleteFeature } from "../tools/features.js";
import {
  createRequirements,
  deleteRequirement,
  getRequirement,
  listRequirements,
  updateRequirement,
} from "../tools/requirements.js";

describe("Requirements", () => {
  setupTestDb();

  describe("createRequirements", () => {
    it("should create a requirement for a feature", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = createRequirements({
        feature_slug: "auth",
        requirements: [{ text: "User must be able to login" }],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.requirements).toHaveLength(1);
      expect(result.data.requirements[0].text).toBe(
        "User must be able to login",
      );
      expect(result.data.requirements[0].notes).toEqual([]);
      expect(result.data.requirements[0].id).toBeDefined();
    });

    it("should create requirement with notes", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = createRequirements({
        feature_slug: "auth",
        requirements: [
          {
            text: "User must be able to login",
            notes: ["Must support SSO", "Rate limit to 5 attempts"],
          },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.requirements[0].notes).toEqual([
        "Must support SSO",
        "Rate limit to 5 attempts",
      ]);
    });

    it("should create multiple requirements in batch", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = createRequirements({
        feature_slug: "auth",
        requirements: [
          { text: "User must be able to login" },
          { text: "User must be able to logout" },
          { text: "User must be able to reset password" },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.requirements).toHaveLength(3);
    });

    it("should return not_found for non-existent feature", () => {
      const result = createRequirements({
        feature_slug: "nonexistent",
        requirements: [{ text: "Test" }],
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("getRequirement", () => {
    it("should get requirement by id", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const createResult = createRequirements({
        feature_slug: "auth",
        requirements: [{ text: "User must be able to login" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const reqId = createResult.data.requirements[0].id;

      const result = getRequirement({ id: reqId });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.requirement.id).toBe(reqId);
      expect(result.data.requirement.text).toBe("User must be able to login");
    });

    it("should return not_found for non-existent requirement", () => {
      const result = getRequirement({ id: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("listRequirements", () => {
    it("should list requirements for a feature", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      createRequirements({
        feature_slug: "auth",
        requirements: [{ text: "Req 1" }, { text: "Req 2" }, { text: "Req 3" }],
      });

      const result = listRequirements({ feature_slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.requirements).toHaveLength(3);
    });

    it("should return empty list for feature with no requirements", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });

      const result = listRequirements({ feature_slug: "auth" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.requirements).toHaveLength(0);
    });

    it("should return not_found for non-existent feature", () => {
      const result = listRequirements({ feature_slug: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("updateRequirement", () => {
    it("should update requirement text", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const createResult = createRequirements({
        feature_slug: "auth",
        requirements: [{ text: "Original" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const reqId = createResult.data.requirements[0].id;

      const result = updateRequirement({ id: reqId, text: "Updated text" });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.requirement.text).toBe("Updated text");
    });

    it("should update requirement notes", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const createResult = createRequirements({
        feature_slug: "auth",
        requirements: [{ text: "Req" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const reqId = createResult.data.requirements[0].id;

      const result = updateRequirement({
        id: reqId,
        notes: ["Note 1", "Note 2"],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.requirement.notes).toEqual(["Note 1", "Note 2"]);
    });

    it("should return not_found for non-existent requirement", () => {
      const result = updateRequirement({ id: "nonexistent", text: "Test" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("deleteRequirement", () => {
    it("should delete requirement", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const createResult = createRequirements({
        feature_slug: "auth",
        requirements: [{ text: "Req" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const reqId = createResult.data.requirements[0].id;

      const result = deleteRequirement({ id: reqId });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.deleted).toBe(true);

      // Verify it's gone
      const getResult = getRequirement({ id: reqId });
      expect(getResult.success).toBe(false);
    });

    it("should return not_found for non-existent requirement", () => {
      const result = deleteRequirement({ id: "nonexistent" });

      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.type).toBe("not_found");
    });
  });

  describe("cascade delete", () => {
    it("should delete requirements when feature is deleted", () => {
      createFeatures({ features: [{ slug: "auth", name: "Auth" }] });
      const createResult = createRequirements({
        feature_slug: "auth",
        requirements: [{ text: "Req 1" }, { text: "Req 2" }],
      });
      if (!createResult.success) throw new Error("Expected success");
      const reqIds = createResult.data.requirements.map((r) => r.id);

      // Delete the feature
      deleteFeature({ slug: "auth" });

      // Requirements should be gone
      for (const reqId of reqIds) {
        const result = getRequirement({ id: reqId });
        expect(result.success).toBe(false);
      }
    });
  });
});
