import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "fs";
import { join, basename } from "path";
import { McpConfigSchema, StdioMcpServerSchema, HttpMcpServerSchema } from "./schemas.ts";
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

export function readInstalledPluginDirs(
  pluginsDir: string,
  scope: "user" | "project",
  projectPath?: string,
): string[] {
  const manifestPath = join(pluginsDir, "installed_plugins.json");
  if (!existsSync(manifestPath)) return [];

  let raw: string;
  try {
    raw = readFileSync(manifestPath, "utf-8");
  } catch {
    return [];
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return [];
  }

  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !("plugins" in manifest)
  ) {
    return [];
  }

  const plugins = (manifest as Record<string, unknown>)["plugins"];
  if (typeof plugins !== "object" || plugins === null) return [];

  const seen = new Set<string>();
  const results: string[] = [];

  for (const installations of Object.values(
    plugins as Record<string, unknown>,
  )) {
    if (!Array.isArray(installations)) continue;
    for (const inst of installations) {
      if (typeof inst !== "object" || inst === null) continue;
      const entry = inst as Record<string, unknown>;
      const entryScope = entry["scope"];
      const installPath = entry["installPath"];
      if (typeof installPath !== "string") continue;

      if (scope === "user" && entryScope === "user") {
        if (!seen.has(installPath)) {
          seen.add(installPath);
          results.push(installPath);
        }
      } else if (
        scope === "project" &&
        entryScope === "project" &&
        projectPath &&
        entry["projectPath"] === projectPath
      ) {
        if (!seen.has(installPath)) {
          seen.add(installPath);
          results.push(installPath);
        }
      }
    }
  }

  return results;
}

export function readPluginName(pluginDir: string): string | undefined {
  const pluginJsonPath = join(pluginDir, ".claude-plugin", "plugin.json");
  try {
    const raw = readFileSync(pluginJsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && typeof (parsed as Record<string, unknown>).name === "string") {
      return (parsed as Record<string, unknown>).name as string;
    }
  } catch {
    // Missing or malformed plugin.json
  }
  return undefined;
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
    const stdioResult = StdioMcpServerSchema.safeParse(entry);
    if (stdioResult.success) {
      servers.push({
        transport: "stdio",
        id,
        command: stdioResult.data.command,
        args: stdioResult.data.args ?? [],
        env: stdioResult.data.env ?? {},
      });
      continue;
    }

    const httpResult = HttpMcpServerSchema.safeParse(entry);
    if (httpResult.success) {
      servers.push({
        transport: "http",
        id,
        url: httpResult.data.url,
        headers: httpResult.data.headers ?? {},
      });
      continue;
    }
  }

  return servers;
}
