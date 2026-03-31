import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  createSession,
  getCurrentSession,
  resetSession,
  getOutputDir,
} from "../lib/session.js";

describe("session", () => {
  beforeEach(() => {
    resetSession();
  });

  afterEach(() => {
    delete process.env.WEB_DEBUGGER_DIR;
  });

  describe("createSession", () => {
    it("creates a session with a unique ID matching YYYYMMDD-HHmmss-XXXX format", () => {
      const session = createSession("/tmp/test-debugger");
      expect(session.id).toMatch(/^\d{8}-\d{6}-[0-9a-f]{4}$/);
    });

    it("creates a session with the correct log file path", () => {
      const session = createSession("/tmp/test-debugger");
      expect(session.logFile).toBe(
        `/tmp/test-debugger/logs/session-${session.id}.jsonl`,
      );
    });

    it("creates a session with a startedAt ISO timestamp", () => {
      const session = createSession("/tmp/test-debugger");
      expect(() => new Date(session.startedAt)).not.toThrow();
      expect(new Date(session.startedAt).toISOString()).toBe(session.startedAt);
    });

    it("generates different IDs for successive sessions", () => {
      const session1 = createSession("/tmp/test-debugger");
      resetSession();
      const session2 = createSession("/tmp/test-debugger");
      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe("getCurrentSession", () => {
    it("returns null when no session exists", () => {
      expect(getCurrentSession()).toBeNull();
    });

    it("returns the session after creation", () => {
      const session = createSession("/tmp/test-debugger");
      expect(getCurrentSession()).toEqual(session);
    });

    it("returns the latest session after multiple creates", () => {
      createSession("/tmp/test-debugger");
      const session2 = createSession("/tmp/test-debugger");
      expect(getCurrentSession()).toEqual(session2);
    });
  });

  describe("getOutputDir", () => {
    it("resolves to .web-debugger relative to CWD by default", () => {
      const dir = getOutputDir();
      expect(dir).toMatch(/\.web-debugger$/);
      expect(dir.startsWith("/")).toBe(true);
    });

    it("uses WEB_DEBUGGER_DIR env var when set", () => {
      process.env.WEB_DEBUGGER_DIR = "/custom/output";
      const dir = getOutputDir();
      expect(dir).toBe("/custom/output");
    });

    it("resolves relative WEB_DEBUGGER_DIR to absolute path", () => {
      process.env.WEB_DEBUGGER_DIR = "custom-dir";
      const dir = getOutputDir();
      expect(dir.startsWith("/")).toBe(true);
      expect(dir).toMatch(/custom-dir$/);
    });
  });
});
