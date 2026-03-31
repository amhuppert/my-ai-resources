import { describe, expect, it } from "bun:test";
import { WebDebuggerError, handleError } from "../lib/errors.js";

describe("WebDebuggerError", () => {
  it("creates an error with type and message", () => {
    const err = new WebDebuggerError("no_session", "No active session");
    expect(err.type).toBe("no_session");
    expect(err.message).toBe("No active session");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WebDebuggerError);
  });

  it("has the correct name", () => {
    const err = new WebDebuggerError("provider_not_found", "Not found");
    expect(err.name).toBe("WebDebuggerError");
  });
});

describe("handleError", () => {
  it("wraps a WebDebuggerError with its type", () => {
    const err = new WebDebuggerError("snapshot_timeout", "Timed out");
    const result = handleError(err);
    expect(result).toEqual({
      error: { type: "snapshot_timeout", message: "Timed out" },
    });
  });

  it("wraps a generic Error as internal_error", () => {
    const err = new Error("something broke");
    const result = handleError(err);
    expect(result).toEqual({
      error: { type: "internal_error", message: "something broke" },
    });
  });

  it("wraps an unknown value as internal_error", () => {
    const result = handleError("string error");
    expect(result).toEqual({
      error: { type: "internal_error", message: "Unknown error" },
    });
  });
});
