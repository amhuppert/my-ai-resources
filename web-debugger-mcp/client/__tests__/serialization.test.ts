import { describe, expect, it } from "bun:test";
import { serialize } from "../serialization.js";

describe("serialize", () => {
  describe("primitives", () => {
    it("passes through strings unchanged", () => {
      expect(serialize("hello")).toBe("hello");
    });

    it("passes through numbers unchanged", () => {
      expect(serialize(42)).toBe(42);
    });

    it("passes through booleans unchanged", () => {
      expect(serialize(true)).toBe(true);
      expect(serialize(false)).toBe(false);
    });

    it("passes through null unchanged", () => {
      expect(serialize(null)).toBeNull();
    });
  });

  describe("Set", () => {
    it("serializes a Set to tagged object with values array", () => {
      const result = serialize(new Set([1, 2, 3]));
      expect(result).toEqual({ __type: "Set", values: [1, 2, 3] });
    });

    it("serializes an empty Set", () => {
      const result = serialize(new Set());
      expect(result).toEqual({ __type: "Set", values: [] });
    });

    it("recursively serializes Set elements", () => {
      const result = serialize(new Set([new Map([["a", 1]])]));
      expect(result).toEqual({
        __type: "Set",
        values: [{ __type: "Map", entries: [["a", 1]] }],
      });
    });
  });

  describe("Map", () => {
    it("serializes a Map to tagged object with entries array", () => {
      const result = serialize(
        new Map([
          ["a", 1],
          ["b", 2],
        ]),
      );
      expect(result).toEqual({
        __type: "Map",
        entries: [
          ["a", 1],
          ["b", 2],
        ],
      });
    });

    it("serializes an empty Map", () => {
      const result = serialize(new Map());
      expect(result).toEqual({ __type: "Map", entries: [] });
    });

    it("recursively serializes Map keys and values", () => {
      const result = serialize(new Map([[new Set([1]), new Date("2026-01-01T00:00:00.000Z")]]));
      expect(result).toEqual({
        __type: "Map",
        entries: [
          [
            { __type: "Set", values: [1] },
            { __type: "Date", value: "2026-01-01T00:00:00.000Z" },
          ],
        ],
      });
    });
  });

  describe("Date", () => {
    it("serializes a Date to tagged object with ISO string", () => {
      const date = new Date("2026-03-30T14:30:00.000Z");
      const result = serialize(date);
      expect(result).toEqual({
        __type: "Date",
        value: "2026-03-30T14:30:00.000Z",
      });
    });
  });

  describe("RegExp", () => {
    it("serializes a RegExp to tagged object with source and flags", () => {
      const result = serialize(/hello/gi);
      expect(result).toEqual({
        __type: "RegExp",
        source: "hello",
        flags: "gi",
      });
    });

    it("serializes a RegExp with no flags", () => {
      const result = serialize(/test/);
      expect(result).toEqual({
        __type: "RegExp",
        source: "test",
        flags: "",
      });
    });
  });

  describe("Error", () => {
    it("serializes an Error to tagged object", () => {
      const error = new TypeError("something failed");
      const result = serialize(error) as Record<string, unknown>;
      expect(result.__type).toBe("Error");
      expect(result.name).toBe("TypeError");
      expect(result.message).toBe("something failed");
      expect(typeof result.stack).toBe("string");
    });
  });

  describe("BigInt", () => {
    it("serializes a BigInt to tagged object with string value", () => {
      const result = serialize(BigInt(123));
      expect(result).toEqual({ __type: "BigInt", value: "123" });
    });
  });

  describe("undefined", () => {
    it("serializes undefined as object value to tagged object", () => {
      const result = serialize({ a: undefined });
      expect(result).toEqual({ a: { __type: "undefined" } });
    });

    it("passes through top-level undefined", () => {
      expect(serialize(undefined)).toEqual({ __type: "undefined" });
    });
  });

  describe("Function", () => {
    it("serializes a function to tagged object with name", () => {
      function myFunc() {}
      const result = serialize(myFunc);
      expect(result).toEqual({ __type: "Function", name: "myFunc" });
    });

    it("serializes an anonymous function", () => {
      const result = serialize(() => {});
      expect(result).toEqual({ __type: "Function", name: "" });
    });
  });

  describe("circular references", () => {
    it("detects circular references in objects", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;
      const result = serialize(obj) as Record<string, unknown>;
      expect(result.a).toBe(1);
      expect(result.self).toEqual({ __type: "circular" });
    });

    it("detects circular references in arrays", () => {
      const arr: unknown[] = [1, 2];
      arr.push(arr);
      const result = serialize(arr) as unknown[];
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(2);
      expect(result[2]).toEqual({ __type: "circular" });
    });

    it("does not mark shared (non-circular) references as circular", () => {
      const shared = { x: 1 };
      const result = serialize({ a: shared, b: shared }) as Record<string, unknown>;
      expect(result.a).toEqual({ x: 1 });
      expect(result.b).toEqual({ x: 1 });
    });

    it("handles shared references in arrays", () => {
      const shared = [1, 2, 3];
      const result = serialize([shared, shared]) as unknown[];
      expect(result[0]).toEqual([1, 2, 3]);
      expect(result[1]).toEqual([1, 2, 3]);
    });
  });

  describe("nested structures", () => {
    it("recursively serializes nested objects", () => {
      const result = serialize({
        name: "test",
        data: new Set([1, 2]),
        meta: { created: new Date("2026-01-01T00:00:00.000Z") },
      });
      expect(result).toEqual({
        name: "test",
        data: { __type: "Set", values: [1, 2] },
        meta: { created: { __type: "Date", value: "2026-01-01T00:00:00.000Z" } },
      });
    });

    it("recursively serializes arrays", () => {
      const result = serialize([new Set([1]), new Map([["a", 2]])]);
      expect(result).toEqual([
        { __type: "Set", values: [1] },
        { __type: "Map", entries: [["a", 2]] },
      ]);
    });

    it("handles deeply nested mixed types", () => {
      const result = serialize(
        new Map([["items", new Set([{ re: /abc/g, big: BigInt(99) }])]]),
      );
      expect(result).toEqual({
        __type: "Map",
        entries: [
          [
            "items",
            {
              __type: "Set",
              values: [
                {
                  re: { __type: "RegExp", source: "abc", flags: "g" },
                  big: { __type: "BigInt", value: "99" },
                },
              ],
            },
          ],
        ],
      });
    });
  });
});
