import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "fs";
import { join, basename } from "path";
import { parseFrontmatter } from "./frontmatter.ts";
import { AgentFrontmatterSchema } from "./schemas.ts";
import type { DiscoveredAgent, SkippedAgent } from "./types.ts";

const EXCLUDED_SUBDIRS = new Set(["references", "assets", "scripts"]);

export interface AgentDiscoveryResult {
  agents: DiscoveredAgent[];
  skipped: SkippedAgent[];
}

type CandidateResult =
  | { valid: true }
  | { valid: false; hasFrontmatter: boolean; reason?: string };

export function discoverAgents(
  pluginDirs: string[],
  standaloneAgentsDir: string,
): AgentDiscoveryResult {
  const agents: DiscoveredAgent[] = [];
  const skipped: SkippedAgent[] = [];

  for (const pluginDir of pluginDirs) {
    const agentsDir = join(pluginDir, "agents");
    collectAgentsFromDir(agentsDir, "plugin", agents, skipped);
  }

  collectAgentsFromDir(standaloneAgentsDir, "standalone", agents, skipped);

  return { agents, skipped };
}

function collectAgentsFromDir(
  agentsDir: string,
  source: "plugin" | "standalone",
  results: DiscoveredAgent[],
  skipped: SkippedAgent[],
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

    if (entry.endsWith(".md")) {
      const check = checkAgentCandidate(fullPath);
      if (check.valid) {
        results.push({ name: basename(entry, ".md"), sourcePath: fullPath, source });
      } else if (check.hasFrontmatter && check.reason) {
        skipped.push({ name: basename(entry, ".md"), sourcePath: fullPath, reason: check.reason });
      }
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
      const check = checkAgentCandidate(subPath);
      if (check.valid) {
        results.push({ name: basename(subEntry, ".md"), sourcePath: subPath, source });
      } else if (check.hasFrontmatter && check.reason) {
        skipped.push({ name: basename(subEntry, ".md"), sourcePath: subPath, reason: check.reason });
      }
    }
  }
}

function checkAgentCandidate(filePath: string): CandidateResult {
  try {
    if (!statSync(filePath).isFile()) return { valid: false, hasFrontmatter: false };
  } catch {
    return { valid: false, hasFrontmatter: false };
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    return { valid: false, hasFrontmatter: false };
  }

  let parsed: ReturnType<typeof parseFrontmatter>;
  try {
    parsed = parseFrontmatter(raw);
  } catch {
    return { valid: false, hasFrontmatter: false };
  }

  if (!parsed.data || typeof parsed.data !== "object" || Object.keys(parsed.data).length === 0) {
    return { valid: false, hasFrontmatter: false };
  }

  const result = AgentFrontmatterSchema.safeParse(parsed.data);
  if (result.success) {
    return { valid: true };
  }

  const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  return { valid: false, hasFrontmatter: true, reason: `Schema validation failed: ${issues}` };
}
