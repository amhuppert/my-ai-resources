import { stringify } from "smol-toml";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "./frontmatter.ts";
import { AgentFrontmatterSchema } from "./schemas.ts";
import type {
  DiscoveredAgent,
  SyncItemResult,
  CodexAgentToml,
} from "./types.ts";

export function convertAgentToToml(
  agentMdContent: string,
  modelMapping: Record<string, string>,
): { toml: string; warnings: string[] } {
  const { data, content } = parseFrontmatter(agentMdContent);
  const parsed = AgentFrontmatterSchema.parse(data);

  const warnings: string[] = [];
  const agent: CodexAgentToml = {
    name: parsed.name,
    description: parsed.description,
    developer_instructions: content.trim(),
  };

  if (parsed.model !== undefined) {
    const mapped = modelMapping[parsed.model];
    if (mapped) {
      agent.model = mapped;
    } else {
      warnings.push(
        `No model mapping for "${parsed.model}" — model omitted from output`,
      );
    }
  }

  return { toml: stringify(agent), warnings };
}

export function syncAgents(
  agents: DiscoveredAgent[],
  destDir: string,
  modelMapping: Record<string, string>,
): SyncItemResult[] {
  mkdirSync(destDir, { recursive: true });

  return agents.map((agent) => {
    const artifactName = `agent:${agent.name}`;

    try {
      const content = readFileSync(agent.sourcePath, "utf-8");
      const { toml, warnings } = convertAgentToToml(content, modelMapping);

      const destPath = join(destDir, `${agent.name}.toml`);
      writeFileSync(destPath, toml);

      return {
        artifact: artifactName,
        status: "synced" as const,
        destPath,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        artifact: artifactName,
        status: "failed" as const,
        reason: message,
      };
    }
  });
}
