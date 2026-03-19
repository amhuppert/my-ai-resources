import matter from "gray-matter";
import { cpSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { SkillFrontmatterSchema } from "./schemas.ts";
import type { DiscoveredSkill, SyncItemResult } from "./types.ts";

const STRIPPED_FIELDS = ["allowed-tools", "argument-hint"];

export function convertSkillFrontmatter(content: string): string {
  const { data, content: body } = matter(content);

  for (const field of STRIPPED_FIELDS) {
    delete data[field];
  }

  return matter.stringify(body, data);
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
  let raw: string;
  try {
    raw = readFileSync(skill.skillMdPath, "utf-8");
  } catch {
    return {
      artifact: `skill:${skill.name}`,
      status: "failed",
      reason: `Could not read ${skill.skillMdPath}`,
    };
  }

  const { data } = matter(raw);
  const validation = SkillFrontmatterSchema.safeParse(data);
  if (!validation.success) {
    return {
      artifact: `skill:${skill.name}`,
      status: "failed",
      reason: `Invalid frontmatter in ${skill.skillMdPath}: ${validation.error.message}`,
    };
  }

  const skillDest = join(destDir, skill.name);
  cpSync(skill.sourceDir, skillDest, { recursive: true });

  const convertedContent = convertSkillFrontmatter(raw);
  writeFileSync(join(skillDest, "SKILL.md"), convertedContent);

  return {
    artifact: `skill:${skill.name}`,
    status: "synced",
    destPath: skillDest,
  };
}
