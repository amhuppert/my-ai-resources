import { describe, test, expect } from "bun:test";
import { createCleanupService } from "../../src/services/cleanup.js";

describe("cleanup integration", () => {
  test(
    "invokes claude CLI and returns cleaned text",
    async () => {
      const service = createCleanupService();
      const result = await service.cleanup(
        "hello world this is a test",
        [],
        [],
      );

      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(0);
    },
    { timeout: 30000 },
  );

  test(
    "invokes claude CLI with model flag",
    async () => {
      const service = createCleanupService("haiku");
      const result = await service.cleanup(
        "hello world this is a test",
        [],
        [],
      );

      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(0);
    },
    { timeout: 30000 },
  );

  test(
    "returns prompt used for cleanup",
    async () => {
      const service = createCleanupService();
      const result = await service.cleanup("test transcription", [], []);

      expect(result.prompt).toContain("<transcription>");
      expect(result.prompt).toContain("test transcription");
    },
    { timeout: 30000 },
  );
});
