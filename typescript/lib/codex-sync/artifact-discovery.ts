import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "fs";
import { join, basename } from "path";
import { McpConfigSchema } from "./schemas.ts";
import type { DiscoveredSkill, DiscoveredMcpServer } from "./types.ts";

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

export function scanPlugins(scanRoot: string): string[] {
  if (!existsSync(scanRoot)) return [];

  const results: string[] = [];
  walkForPlugins(scanRoot, results);
  return results;
}

function walkForPlugins(dir: string, results: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  if (entries.includes(".claude-plugin")) {
    const pluginJson = join(dir, ".claude-plugin", "plugin.json");
    if (existsSync(pluginJson)) {
      results.push(dir);
      return;
    }
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    if (entry.startsWith(".")) continue;

    const fullPath = join(dir, entry);
    try {
      if (statSync(fullPath).isDirectory()) {
        walkForPlugins(fullPath, results);
      }
    } catch {
      // Skip unreadable entries
    }
  }
}

export function extractSkills(pluginDir: string): DiscoveredSkill[] {
  const skillsDir = join(pluginDir, "skills");
  if (!existsSync(skillsDir)) return [];

  const skills: DiscoveredSkill[] = [];
  let entries: string[];
  try {
    entries = readdirSync(skillsDir);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const skillDir = join(skillsDir, entry);
    const skillMdPath = join(skillDir, "SKILL.md");
    try {
      if (statSync(skillDir).isDirectory() && existsSync(skillMdPath)) {
        skills.push({
          name: entry,
          sourceDir: skillDir,
          skillMdPath,
        });
      }
    } catch {
      // Skip unreadable
    }
  }

  return skills;
}

export function discoverMcpServers(configPath: string): DiscoveredMcpServer[] {
  if (!existsSync(configPath)) return [];

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const result = McpConfigSchema.safeParse(parsed);
  if (!result.success || !result.data.mcpServers) return [];

  const servers: DiscoveredMcpServer[] = [];
  for (const [id, entry] of Object.entries(result.data.mcpServers)) {
    servers.push({
      id,
      command: entry.command,
      args: entry.args ?? [],
      env: entry.env ?? {},
    });
  }

  return servers;
}
