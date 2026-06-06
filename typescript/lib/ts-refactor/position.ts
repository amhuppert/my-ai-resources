import type { Position } from "./types";

// Columns and offsets are UTF-16 code units to match the TypeScript compiler.
// A `\r\n` pair counts as two code units; the line break is attributed to the `\n`.

export function positionToOffset(
  text: string,
  line: number,
  column: number,
): number {
  let currentLine = 1;
  let offset = 0;

  while (currentLine < line && offset < text.length) {
    if (text.charCodeAt(offset) === 10) {
      currentLine += 1;
    }
    offset += 1;
  }

  return offset + (column - 1);
}

export function offsetToPosition(text: string, offset: number): Position {
  let line = 1;
  let lineStart = 0;

  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
      lineStart = i + 1;
    }
  }

  return { line, column: offset - lineStart + 1, offset };
}
