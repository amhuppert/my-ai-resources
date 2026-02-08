import { describe, expect, test } from "bun:test";
import { ConfigSchema } from "../types.js";

describe("ConfigSchema", () => {
  test("parse empty object applies all defaults", () => {
    const result = ConfigSchema.parse({});
    expect(result).toEqual({
      hotkey: "F9",
      autoInsert: true,
      beepEnabled: true,
      notificationEnabled: true,
      terminalOutputEnabled: true,
      maxRecordingDuration: 300,
    });
  });

  test("parse full config preserves all fields", () => {
    const full = {
      hotkey: "F10",
      contextFile: "ctx.md",
      instructionsFile: "instr.md",
      claudeModel: "claude-sonnet-4-5-20250929",
      autoInsert: false,
      beepEnabled: false,
      notificationEnabled: false,
      terminalOutputEnabled: false,
      maxRecordingDuration: 120,
    };
    const result = ConfigSchema.parse(full);
    expect(result).toEqual(full);
  });

  test("parse partial config applies defaults for missing fields", () => {
    const partial = { hotkey: "F12", beepEnabled: false };
    const result = ConfigSchema.parse(partial);
    expect(result.hotkey).toBe("F12");
    expect(result.beepEnabled).toBe(false);
    expect(result.autoInsert).toBe(true);
    expect(result.notificationEnabled).toBe(true);
    expect(result.terminalOutputEnabled).toBe(true);
    expect(result.maxRecordingDuration).toBe(300);
    expect(result.contextFile).toBeUndefined();
    expect(result.claudeModel).toBeUndefined();
  });

  test("rejects number for hotkey", () => {
    expect(() => ConfigSchema.parse({ hotkey: 42 })).toThrow();
  });

  test("rejects string for boolean field", () => {
    expect(() => ConfigSchema.parse({ autoInsert: "yes" })).toThrow();
  });

  test("rejects string for number field", () => {
    expect(() =>
      ConfigSchema.parse({ maxRecordingDuration: "long" }),
    ).toThrow();
  });

  test("strips unknown fields", () => {
    const input = { unknownField: "should be stripped", extraStuff: 123 };
    const result = ConfigSchema.parse(input);
    expect((result as Record<string, unknown>)["unknownField"]).toBeUndefined();
    expect((result as Record<string, unknown>)["extraStuff"]).toBeUndefined();
    expect(result.hotkey).toBe("F9");
  });
});
