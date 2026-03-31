import { describe, expect, it } from "bun:test";
import {
  ClientMessageSchema,
  SnapshotRequestMessageSchema,
} from "../schemas/messages.js";

describe("ClientMessageSchema", () => {
  describe("connect message", () => {
    it("parses a valid browser connect message", () => {
      const result = ClientMessageSchema.safeParse({
        type: "connect",
        source: "browser",
      });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data).toEqual({ type: "connect", source: "browser" });
    });

    it("parses a valid server connect message", () => {
      const result = ClientMessageSchema.safeParse({
        type: "connect",
        source: "server",
      });
      expect(result.success).toBe(true);
    });

    it("rejects connect with invalid source", () => {
      const result = ClientMessageSchema.safeParse({
        type: "connect",
        source: "unknown",
      });
      expect(result.success).toBe(false);
    });

    it("rejects connect with missing source", () => {
      const result = ClientMessageSchema.safeParse({ type: "connect" });
      expect(result.success).toBe(false);
    });
  });

  describe("log message", () => {
    it("parses a valid log message with all fields", () => {
      const result = ClientMessageSchema.safeParse({
        type: "log",
        level: "info",
        message: "User logged in",
        context: { userId: "123" },
        timestamp: "2026-03-30T14:30:00.000Z",
      });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.type).toBe("log");
    });

    it("parses a log message without optional context", () => {
      const result = ClientMessageSchema.safeParse({
        type: "log",
        level: "error",
        message: "Something failed",
        timestamp: "2026-03-30T14:30:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("rejects log with invalid level", () => {
      const result = ClientMessageSchema.safeParse({
        type: "log",
        level: "trace",
        message: "msg",
        timestamp: "2026-03-30T14:30:00.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("rejects log with missing message", () => {
      const result = ClientMessageSchema.safeParse({
        type: "log",
        level: "info",
        timestamp: "2026-03-30T14:30:00.000Z",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("register_provider message", () => {
    it("parses a valid register_provider message", () => {
      const result = ClientMessageSchema.safeParse({
        type: "register_provider",
        name: "react-query-cache",
      });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data).toEqual({
        type: "register_provider",
        name: "react-query-cache",
      });
    });

    it("rejects register_provider with missing name", () => {
      const result = ClientMessageSchema.safeParse({
        type: "register_provider",
      });
      expect(result.success).toBe(false);
    });

    it("rejects provider names with path separators", () => {
      expect(ClientMessageSchema.safeParse({
        type: "register_provider",
        name: "../escape",
      }).success).toBe(false);

      expect(ClientMessageSchema.safeParse({
        type: "register_provider",
        name: "dir/name",
      }).success).toBe(false);
    });

    it("rejects empty provider name", () => {
      expect(ClientMessageSchema.safeParse({
        type: "register_provider",
        name: "",
      }).success).toBe(false);
    });
  });

  describe("snapshot_response message", () => {
    it("parses a valid snapshot_response with data", () => {
      const result = ClientMessageSchema.safeParse({
        type: "snapshot_response",
        requestId: "abc-123",
        name: "react-query-cache",
        data: { queries: [] },
      });
      expect(result.success).toBe(true);
    });

    it("parses a snapshot_response with error", () => {
      const result = ClientMessageSchema.safeParse({
        type: "snapshot_response",
        requestId: "abc-123",
        name: "react-query-cache",
        data: null,
        error: "Provider threw an exception",
      });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");
      expect(result.data.type).toBe("snapshot_response");
    });

    it("rejects snapshot_response with missing requestId", () => {
      const result = ClientMessageSchema.safeParse({
        type: "snapshot_response",
        name: "react-query-cache",
        data: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe("invalid messages", () => {
    it("rejects unknown type", () => {
      const result = ClientMessageSchema.safeParse({
        type: "unknown_type",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-object input", () => {
      const result = ClientMessageSchema.safeParse("not an object");
      expect(result.success).toBe(false);
    });

    it("rejects null", () => {
      const result = ClientMessageSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});

describe("SnapshotRequestMessageSchema", () => {
  it("parses a valid snapshot_request", () => {
    const result = SnapshotRequestMessageSchema.safeParse({
      type: "snapshot_request",
      requestId: "uuid-1234",
      name: "auth-state",
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected success");
    expect(result.data).toEqual({
      type: "snapshot_request",
      requestId: "uuid-1234",
      name: "auth-state",
    });
  });

  it("rejects snapshot_request with missing name", () => {
    const result = SnapshotRequestMessageSchema.safeParse({
      type: "snapshot_request",
      requestId: "uuid-1234",
    });
    expect(result.success).toBe(false);
  });
});
