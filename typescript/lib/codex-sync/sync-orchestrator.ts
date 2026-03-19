import type { SyncPaths, SyncConfig, SyncResult, SyncItemResult } from "./types.ts";
import { scanPlugins, extractSkills, discoverMcpServers } from "./artifact-discovery.ts";
import { discoverAgents } from "./agent-discovery.ts";
import { syncInstructions } from "./instructions-sync.ts";
import { syncSkills } from "./skill-sync.ts";
import { syncAgents } from "./agent-sync.ts";
import { syncMcpServers } from "./mcp-sync.ts";

export function runSync(paths: SyncPaths, config: SyncConfig): SyncResult {
  const items: SyncItemResult[] = [];

  // Instructions
  const instrResult = syncInstructions(paths.claudeMdSource, paths.agentsOverrideDest);
  items.push(instrResult);

  // Discover plugins, skills, agents
  const pluginDirs = scanPlugins(paths.pluginScanRoot);
  const skills = pluginDirs.flatMap(extractSkills);
  const agents = discoverAgents(pluginDirs, paths.standaloneAgentsDir);

  // Skills
  const skillResults = syncSkills(skills, paths.codexSkillsDir);
  items.push(...skillResults);

  // Agents
  const agentResults = syncAgents(agents, paths.codexAgentsDir, config.modelMapping);
  items.push(...agentResults);

  // MCP servers
  const mcpResults = syncMcpServers(paths.mcpConfigSource, paths.codexConfigDir);
  items.push(...mcpResults);

  const hasErrors = items.some((i) => i.status === "failed");

  return { items, hasErrors };
}
