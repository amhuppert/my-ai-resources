import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.ts";
import { CommandFrontmatterSchema } from "./schemas.ts";
import { CODEX_MAX_DESCRIPTION_LENGTH, truncateDescription } from "./description-limits.ts";
import type { DiscoveredCommand, SyncItemResult } from "./types.ts";

const STRIPPED_FIELDS = ["allowed-tools", "argument-hint", "required-context"];

export function convertCommandToSkill(
  content: string,
  derivedName: string,
): { content: string; warnings: string[] } {
  const { data, content: body } = parseFrontmatter(content);
  const warnings: string[] = [];

  for (const field of STRIPPED_FIELDS) {
    delete data[field];
  }

  if (!data["name"]) {
    data["name"] = derivedName;
  }

  if (typeof data["description"] === "string" && data["description"].length > CODEX_MAX_DESCRIPTION_LENGTH) {
    const originalLength = data["description"].length;
    data["description"] = truncateDescription(data["description"]);
    warnings.push(
      `Description truncated from ${originalLength} to ${CODEX_MAX_DESCRIPTION_LENGTH} characters`,
    );
  }

  return { content: stringifyFrontmatter(body, data), warnings };
}

export function syncCommands(
  commands: DiscoveredCommand[],
  destDir: string,
): SyncItemResult[] {
  return commands.map((command) => syncSingleCommand(command, destDir));
}

function syncSingleCommand(
  command: DiscoveredCommand,
  destDir: string,
): SyncItemResult {
  const artifactName = `command:${command.name}`;

  let raw: string;
  try {
    raw = readFileSync(command.sourcePath, "utf-8");
  } catch {
    return {
      artifact: artifactName,
      status: "failed",
      reason: `Could not read ${command.sourcePath}`,
    };
  }

  const { data } = parseFrontmatter(raw);
  const validation = CommandFrontmatterSchema.safeParse(data);
  if (!validation.success) {
    return {
      artifact: artifactName,
      status: "failed",
      reason: `Invalid frontmatter in ${command.sourcePath}: ${validation.error.message}`,
    };
  }

  const { content: convertedContent, warnings } = convertCommandToSkill(raw, command.name);

  const skillDir = join(destDir, command.name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), convertedContent);

  return {
    artifact: artifactName,
    status: "synced",
    destPath: skillDir,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
