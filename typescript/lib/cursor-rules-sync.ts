import { join } from "path";
import { glob } from "glob";
import { existsSync } from "fs";

/**
 * Find all Cursor Rules in a project
 * Checks .cursor/rules (standard Cursor location)
 * Returns relative paths from project root
 */
export async function findCursorRules(projectRoot: string): Promise<string[]> {
  const rulePaths: string[] = [];

  // Check both possible locations
  const locations = [
    { dir: join(projectRoot, ".cursor/rules"), prefix: ".cursor/rules" },
  ];

  for (const { dir, prefix } of locations) {
    if (!existsSync(dir)) {
      continue;
    }

    const mdcFiles = await glob("**/*.mdc", {
      cwd: dir,
      absolute: false,
    });

    for (const file of mdcFiles) {
      rulePaths.push(join(prefix, file));
    }
  }

  return rulePaths;
}
