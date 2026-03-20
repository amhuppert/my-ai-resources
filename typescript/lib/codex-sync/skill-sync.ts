import { cpSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseFrontmatter, stringifyFrontmatter } from "./frontmatter.ts";
import { SkillFrontmatterSchema } from "./schemas.ts";
import { CODEX_MAX_DESCRIPTION_LENGTH, truncateDescription } from "./description-limits.ts";
import type { DiscoveredSkill, SyncItemResult } from "./types.ts";

const STRIPPED_FIELDS = ["allowed-tools", "argument-hint"];

export function convertSkillFrontmatter(content: string): { content: string; warnings: string[] } {
  const { data, content: body } = parseFrontmatter(content);
  const warnings: string[] = [];

  for (const field of STRIPPED_FIELDS) {
    delete data[field];
  }

  if (typeof data.description === "string" && data.description.length > CODEX_MAX_DESCRIPTION_LENGTH) {
    const originalLength = data.description.length;
    data.description = truncateDescription(data.description);
    warnings.push(
      `Description truncated from ${originalLength} to ${CODEX_MAX_DESCRIPTION_LENGTH} characters`,
    );
  }

  return { content: stringifyFrontmatter(body, data), warnings };
}

export function syncSkills(
  skills: DiscoveredSkill[],
  destDir: string,
): SyncItemResult[] {
  const results: SyncItemResult[] = [];

  for (const skill of skills) {
    const result = syncSingleSkill(skill, destDir);
    results.push(result);
  }

  return results;
}

function syncSingleSkill(
  skill: DiscoveredSkill,
  destDir: string,
): SyncItemResult {
  const artifactName = `skill:${skill.name}`;

  let raw: string;
  try {
    raw = readFileSync(skill.skillMdPath, "utf-8");
  } catch {
    return {
      artifact: artifactName,
      status: "failed",
      reason: `Could not read ${skill.skillMdPath}`,
    };
  }

  const { data } = parseFrontmatter(raw);
  const validation = SkillFrontmatterSchema.safeParse(data);
  if (!validation.success) {
    return {
      artifact: artifactName,
      status: "failed",
      reason: `Invalid frontmatter in ${skill.skillMdPath}: ${validation.error.message}`,
    };
  }

  const skillDest = join(destDir, skill.name);
  cpSync(skill.sourceDir, skillDest, { recursive: true });

  const { content: convertedContent, warnings } = convertSkillFrontmatter(raw);
  writeFileSync(join(skillDest, "SKILL.md"), convertedContent);

  return {
    artifact: artifactName,
    status: "synced",
    destPath: skillDest,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
