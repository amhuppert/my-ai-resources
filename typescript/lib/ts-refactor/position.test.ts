import { describe, expect, test } from "bun:test";
import { offsetToPosition, positionToOffset } from "./position";

describe("positionToOffset (1-based line+column, UTF-16 code units)", () => {
  test("first character on first line", () => {
    expect(positionToOffset("abc", 1, 1)).toBe(0);
  });

  test("column advances along a line", () => {
    expect(positionToOffset("abc", 1, 3)).toBe(2);
  });

  test("LF line endings", () => {
    const text = "abc\ndef\nghi";
    expect(positionToOffset(text, 2, 1)).toBe(4);
    expect(positionToOffset(text, 3, 2)).toBe(9);
  });

  test("CRLF line endings count both \\r and \\n", () => {
    const text = "abc\r\ndef\r\nghi";
    // line 2 col 1 sits just past "abc\r\n" => offset 5
    expect(positionToOffset(text, 2, 1)).toBe(5);
    // line 3 col 1 sits just past "abc\r\ndef\r\n" => offset 10
    expect(positionToOffset(text, 3, 1)).toBe(10);
  });

  test("astral chars count as two UTF-16 code units in the column", () => {
    // "a😀b" — the emoji is a surrogate pair (2 code units).
    const text = "a😀b";
    // column 4 (after a + surrogate pair) addresses "b".
    expect(positionToOffset(text, 1, 4)).toBe(3);
  });

  test("multibyte BMP chars count as one code unit", () => {
    const text = "héllo";
    expect(positionToOffset(text, 1, 3)).toBe(2);
  });
});

describe("offsetToPosition (UTF-16 code units, 1-based)", () => {
  test("offset 0 is line 1 column 1", () => {
    expect(offsetToPosition("abc", 0)).toEqual({ line: 1, column: 1, offset: 0 });
  });

  test("offset within first line", () => {
    expect(offsetToPosition("abc", 2)).toEqual({ line: 1, column: 3, offset: 2 });
  });

  test("LF line endings", () => {
    const text = "abc\ndef\nghi";
    expect(offsetToPosition(text, 4)).toEqual({ line: 2, column: 1, offset: 4 });
    expect(offsetToPosition(text, 9)).toEqual({ line: 3, column: 2, offset: 9 });
  });

  test("CRLF line endings", () => {
    const text = "abc\r\ndef\r\nghi";
    expect(offsetToPosition(text, 5)).toEqual({ line: 2, column: 1, offset: 5 });
    expect(offsetToPosition(text, 10)).toEqual({ line: 3, column: 1, offset: 10 });
  });

  test("astral chars advance the column by two", () => {
    const text = "a😀b";
    // offset 3 (after the surrogate pair) addresses "b" at column 4.
    expect(offsetToPosition(text, 3)).toEqual({ line: 1, column: 4, offset: 3 });
  });

  test("round-trips with positionToOffset for CRLF + astral fixture", () => {
    const text = "x😀\r\nyz\r\n€end";
    for (let offset = 0; offset <= text.length; offset++) {
      const pos = offsetToPosition(text, offset);
      expect(positionToOffset(text, pos.line, pos.column)).toBe(offset);
    }
  });
});
