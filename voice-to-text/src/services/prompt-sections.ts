import { readFileSync, existsSync } from "node:fs";
import type { ResolvedFileRef } from "../types.js";

const SOURCE_LABELS: Record<ResolvedFileRef["source"], string> = {
  global: "Global",
  local: "Project",
  specified: "Config",
  cli: "Custom",
};

export function buildFileSections(
  files: ResolvedFileRef[],
  type: "context" | "vocabulary" | "additional-instructions",
): string {
  const sections: string[] = [];

  for (const file of files) {
    if (!existsSync(file.path)) continue;
    try {
      const content = readFileSync(file.path, "utf-8");
      const label = SOURCE_LABELS[file.source];
      const tagPrefix = label.toLowerCase();
      const typeLabels = {
        context: "Context",
        vocabulary: "Vocabulary",
        "additional-instructions": "Additional Instructions",
      } as const;
      sections.push(
        `${label} ${typeLabels[type]}:\n<${tagPrefix}-${type}>\n${content}\n</${tagPrefix}-${type}>`,
      );
    } catch {
      // Silently skip unreadable files
    }
  }

  return sections.length > 0 ? sections.join("\n\n") + "\n\n" : "";
}
