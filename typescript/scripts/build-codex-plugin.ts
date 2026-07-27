#!/usr/bin/env bun

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import YAML from "yaml";

const CODEX_MAX_DESCRIPTION_LENGTH = 1024;
const STRIPPED_FIELDS = [
  "allowed-tools",
  "argument-hint",
  "disable-model-invocation",
];
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  ai: "AI",
  kb: "KB",
  ts: "TS",
};

const matterOptions: Parameters<typeof matter>[1] = {
  engines: {
    yaml: {
      parse: (value: string) =>
        YAML.parse(value, { strict: false, logLevel: "silent" }) as Record<
          string,
          unknown
        >,
      stringify: (data: object) => YAML.stringify(data),
    },
  },
};

interface SourceSkill {
  name: string;
  sourceDir: string;
  skillMdPath: string;
}

function getRepoRoot(): string {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  return join(scriptDir, "..", "..");
}

function discoverSkills(sourcePluginDir: string): SourceSkill[] {
  const skillsDir = join(sourcePluginDir, "skills");
  if (!existsSync(skillsDir)) return [];

  return readdirSync(skillsDir)
    .sort()
    .flatMap((name) => {
      const sourceDir = join(skillsDir, name);
      const skillMdPath = join(sourceDir, "SKILL.md");
      if (!statSync(sourceDir).isDirectory() || !existsSync(skillMdPath)) {
        return [];
      }
      return [{ name, sourceDir, skillMdPath }];
    });
}

export function convertSkillFrontmatter(content: string): string {
  const parsed = matter(content, matterOptions);
  for (const field of STRIPPED_FIELDS) {
    delete parsed.data[field];
  }

  if (
    typeof parsed.data.description === "string" &&
    parsed.data.description.length > CODEX_MAX_DESCRIPTION_LENGTH
  ) {
    parsed.data.description = parsed.data.description.slice(
      0,
      CODEX_MAX_DESCRIPTION_LENGTH,
    );
  }

  return matter.stringify(parsed.content, parsed.data, matterOptions);
}

export function createOpenAiYaml(
  name: string,
  description: string,
  explicitInvocationOnly: boolean,
): string {
  const displayName = name
    .split("-")
    .map(
      (part) =>
        DISPLAY_NAME_OVERRIDES[part] ??
        `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`,
    )
    .join(" ");
  const firstSentence = description.split(/(?<=[.!?])\s/u, 1)[0] ?? description;
  const shortDescription = fitShortDescription(firstSentence, displayName);
  const action = defaultPromptAction(firstSentence, displayName);
  const payload: Record<string, unknown> = {
    interface: {
      display_name: displayName,
      short_description: shortDescription,
      default_prompt: `Use $${name} to ${action}.`,
    },
  };

  if (explicitInvocationOnly) {
    payload.policy = { allow_implicit_invocation: false };
  }

  return YAML.stringify(payload, {
    lineWidth: 0,
    defaultStringType: "QUOTE_DOUBLE",
    defaultKeyType: "PLAIN",
  });
}

function fitShortDescription(description: string, displayName: string): string {
  const compact = description.replace(/\s+/gu, " ").trim();
  if (compact.length >= 25 && compact.length <= 64) return compact;
  if (compact.length < 25) {
    return `Use ${displayName} workflows in Codex`.slice(0, 64);
  }

  const shortened = compact.slice(0, 61);
  const wordBoundary = shortened.lastIndexOf(" ");
  const prefix =
    wordBoundary >= 25 ? shortened.slice(0, wordBoundary) : shortened;
  return `${prefix}...`;
}

function defaultPromptAction(description: string, displayName: string): string {
  const action = description.replace(/[.!?]+$/u, "");
  if (
    /^This skill should be used when\b/iu.test(action) ||
    /^Use when\b/iu.test(action)
  ) {
    return `apply the ${displayName} workflow to this request`;
  }
  return `${action[0]?.toLowerCase() ?? ""}${action.slice(1)}`;
}

function buildSkill(skill: SourceSkill, destinationSkillsDir: string): void {
  const raw = readFileSync(skill.skillMdPath, "utf-8");
  const parsed = matter(raw, matterOptions);
  if (
    typeof parsed.data.name !== "string" ||
    typeof parsed.data.description !== "string"
  ) {
    throw new Error(
      `Skill frontmatter must contain string name and description: ${skill.skillMdPath}`,
    );
  }

  const skillDest = join(destinationSkillsDir, skill.name);
  cpSync(skill.sourceDir, skillDest, { recursive: true });
  writeFileSync(join(skillDest, "SKILL.md"), convertSkillFrontmatter(raw));
  const agentsDir = join(skillDest, "agents");
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(
    join(agentsDir, "openai.yaml"),
    createOpenAiYaml(
      parsed.data.name,
      parsed.data.description,
      parsed.data["disable-model-invocation"] === true,
    ),
  );
}

export function buildCodexPlugin(
  sourcePluginDir: string,
  codexPluginDir: string,
): void {
  const sourceManifestPath = join(
    sourcePluginDir,
    ".claude-plugin",
    "plugin.json",
  );
  const codexManifestPath = join(
    codexPluginDir,
    ".codex-plugin",
    "plugin.json",
  );

  if (!existsSync(sourceManifestPath)) {
    throw new Error(`Claude plugin manifest not found: ${sourceManifestPath}`);
  }
  if (!existsSync(codexManifestPath)) {
    throw new Error(`Codex plugin manifest not found: ${codexManifestPath}`);
  }

  const sourceManifest = JSON.parse(
    readFileSync(sourceManifestPath, "utf-8"),
  ) as { version?: unknown };
  const codexManifest = JSON.parse(
    readFileSync(codexManifestPath, "utf-8"),
  ) as Record<string, unknown>;
  if (typeof sourceManifest.version !== "string") {
    throw new Error("Claude plugin manifest must contain a string version");
  }

  codexManifest.version = sourceManifest.version;
  writeFileSync(
    codexManifestPath,
    `${JSON.stringify(codexManifest, null, 2)}\n`,
  );

  const destinationSkillsDir = join(codexPluginDir, "skills");
  rmSync(destinationSkillsDir, { recursive: true, force: true });
  mkdirSync(destinationSkillsDir, { recursive: true });

  const skills = discoverSkills(sourcePluginDir);
  for (const skill of skills) {
    buildSkill(skill, destinationSkillsDir);
  }

  console.log(`Built ${skills.length} Codex skills in ${codexPluginDir}`);
}

if (import.meta.main) {
  const repoRoot = getRepoRoot();
  buildCodexPlugin(
    join(repoRoot, "claude", "ai-resources-plugin"),
    join(repoRoot, "plugins", "ai-resources"),
  );
  buildCodexPlugin(
    join(repoRoot, "claude", "agentic-engineering-principles-plugin"),
    join(repoRoot, "plugins", "agentic-engineering-principles"),
  );
}
