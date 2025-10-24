/**
 * Read file and format contents as XML for LLM context
 * TypeScript equivalent of the bash read-file utility
 */

import * as fs from "fs";
import * as path from "path";

export interface ReadFileOptions {
  description?: string;
}

/**
 * Read a file and return its contents formatted as XML
 * @param filePath Path to the file to read
 * @param options Optional configuration (description)
 * @returns XML-formatted string with file contents
 */
export function readFile(
  filePath: string,
  options: ReadFileOptions = {}
): string {
  const { description } = options;

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    const attrs = description
      ? `path="${filePath}" exists="false" description="${description}"`
      : `path="${filePath}" exists="false"`;
    return `<file ${attrs} />`;
  }

  // Check if file is readable (not a directory, etc.)
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    const attrs = description
      ? `path="${filePath}" exists="false" description="${description}"`
      : `path="${filePath}" exists="false"`;
    return `<file ${attrs} />`;
  }

  // Read file contents
  const content = fs.readFileSync(filePath, "utf-8");

  // Format as XML
  const attrs = description
    ? `path="${filePath}" exists="true" description="${description}"`
    : `path="${filePath}" exists="true"`;

  return `<file ${attrs}>\n${content}\n</file>\n`;
}
