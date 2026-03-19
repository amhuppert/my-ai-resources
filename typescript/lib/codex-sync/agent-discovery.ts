import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "fs";
import { join, basename } from "path";
import { parseFrontmatter } from "./frontmatter.ts";
import { AgentFrontmatterSchema } from "./schemas.ts";
import type { DiscoveredAgent } from "./types.ts";

const EXCLUDED_SUBDIRS = new Set(["references", "assets", "scripts"]);

export function discoverAgents(
  pluginDirs: string[],
  standaloneAgentsDir: string,
): DiscoveredAgent[] {
  const agents: DiscoveredAgent[] = [];

  for (const pluginDir of pluginDirs) {
    const agentsDir = join(pluginDir, "agents");
    collectAgentsFromDir(agentsDir, "plugin", agents);
  }

  collectAgentsFromDir(standaloneAgentsDir, "standalone", agents);

  return agents;
}

function collectAgentsFromDir(
  agentsDir: string,
  source: "plugin" | "standalone",
  results: DiscoveredAgent[],
): void {
  if (!existsSync(agentsDir)) return;

  let entries: string[];
  try {
    entries = readdirSync(agentsDir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(agentsDir, entry);

    if (entry.endsWith(".md") && isAgentCandidate(fullPath)) {
      results.push({ name: basename(entry, ".md"), sourcePath: fullPath, source });
      continue;
    }

    try {
      if (!statSync(fullPath).isDirectory()) continue;
    } catch {
      continue;
    }

    if (EXCLUDED_SUBDIRS.has(entry)) continue;

    let subEntries: string[];
    try {
      subEntries = readdirSync(fullPath);
    } catch {
      continue;
    }

    for (const subEntry of subEntries) {
      if (!subEntry.endsWith(".md")) continue;
      const subPath = join(fullPath, subEntry);
      if (isAgentCandidate(subPath)) {
        results.push({ name: basename(subEntry, ".md"), sourcePath: subPath, source });
      }
    }
  }
}

function isAgentCandidate(filePath: string): boolean {
  try {
    if (!statSync(filePath).isFile()) return false;
  } catch {
    return false;
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    return false;
  }

  let parsed: ReturnType<typeof parseFrontmatter>;
  try {
    parsed = parseFrontmatter(raw);
  } catch {
    return false;
  }

  if (!parsed.data || typeof parsed.data !== "object") return false;

  const result = AgentFrontmatterSchema.safeParse(parsed.data);
  return result.success;
}
