import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
} from "node:fs";

export interface FileOutputService {
  readTailContent(maxChars: number): string;
  appendText(text: string): void;
  clear(): void;
  readonly filePath: string;
}

export function createFileOutputService(filePath: string): FileOutputService {
  return {
    filePath,

    readTailContent(maxChars: number): string {
      if (!existsSync(filePath)) return "";
      try {
        const content = readFileSync(filePath, "utf-8");
        if (content.length <= maxChars) return content;
        return content.slice(-maxChars);
      } catch {
        return "";
      }
    },

    appendText(text: string): void {
      try {
        if (!existsSync(filePath)) {
          writeFileSync(filePath, text, "utf-8");
          return;
        }
        const existing = readFileSync(filePath, "utf-8");
        if (existing.length === 0) {
          writeFileSync(filePath, text, "utf-8");
        } else {
          appendFileSync(filePath, "\n\n" + text, "utf-8");
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Failed to write output file: ${msg}`);
      }
    },

    clear(): void {
      try {
        writeFileSync(filePath, "", "utf-8");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Failed to clear output file: ${msg}`);
      }
    },
  };
}
