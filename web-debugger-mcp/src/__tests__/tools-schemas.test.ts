import { describe, expect, it } from "bun:test";
import {
  GetLogsInputSchema,
  GetSnapshotInputSchema,
  ListProvidersInputSchema,
} from "../schemas/tools.js";

describe("GetLogsInputSchema", () => {
  it("parses an empty object", () => {
    const result = GetLogsInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("GetSnapshotInputSchema", () => {
  it("parses a valid provider name", () => {
    const result = GetSnapshotInputSchema.safeParse({
      provider: "react-query-cache",
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected success");
    expect(result.data.provider).toBe("react-query-cache");
  });

  it("rejects missing provider", () => {
    const result = GetSnapshotInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty provider string", () => {
    const result = GetSnapshotInputSchema.safeParse({ provider: "" });
    expect(result.success).toBe(false);
  });
});

describe("ListProvidersInputSchema", () => {
  it("parses an empty object", () => {
    const result = ListProvidersInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
