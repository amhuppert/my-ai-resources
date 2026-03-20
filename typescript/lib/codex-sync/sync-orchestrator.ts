import type { SyncPaths, SyncConfig, SyncResult, SyncItemResult } from "./types.ts";
import { scanPlugins, readInstalledPluginDirs, readPluginName, extractSkills, discoverStandaloneSkills, discoverCommands } from "./artifact-discovery.ts";
import { discoverAgents } from "./agent-discovery.ts";
import { syncInstructions } from "./instructions-sync.ts";
import { syncSkills } from "./skill-sync.ts";
import { syncCommands } from "./command-sync.ts";
import { syncAgents } from "./agent-sync.ts";
import { syncMcpServers } from "./mcp-sync.ts";

export function runSync(paths: SyncPaths, config: SyncConfig): SyncResult {
  const items: SyncItemResult[] = [];

  // Instructions
  const instrResult = syncInstructions(paths.claudeMdSource, paths.agentsOverrideDest);
  items.push(instrResult);

  // Discover plugins — user scope reads installed_plugins.json for exact paths,
  // project scope scans the directory tree for .claude-plugin/plugin.json
  let pluginDirs: string[];
  if (paths.scope === "user") {
    pluginDirs = readInstalledPluginDirs(paths.pluginScanRoot, "user");
  } else {
    pluginDirs = scanPlugins(paths.pluginScanRoot);

    // Exclude plugins already installed at user scope to avoid duplicates
    // when both user-level and project-level syncs run
    if (paths.installedPluginsDir) {
      const userPluginDirs = readInstalledPluginDirs(paths.installedPluginsDir, "user");
      const userPluginNames = new Set(
        userPluginDirs.map(readPluginName).filter((n): n is string => n !== undefined),
      );
      if (userPluginNames.size > 0) {
        pluginDirs = pluginDirs.filter((dir) => {
          const name = readPluginName(dir);
          return name === undefined || !userPluginNames.has(name);
        });
      }
    }
  }

  // Apply explicit exclude list from config
  if (config.exclude && config.exclude.length > 0) {
    const excludeSet = new Set(config.exclude);
    pluginDirs = pluginDirs.filter((dir) => {
      const name = readPluginName(dir);
      return name === undefined || !excludeSet.has(name);
    });
  }

  const pluginSkills = pluginDirs.flatMap(extractSkills);
  const standaloneSkills = discoverStandaloneSkills(paths.standaloneSkillsDir);
  const allSkills = [...pluginSkills, ...standaloneSkills];
  const commands = discoverCommands(paths.commandsDir);
  const { agents, skipped: skippedAgents } = discoverAgents(pluginDirs, paths.standaloneAgentsDir);

  // Skills (plugin + standalone)
  const skillResults = syncSkills(allSkills, paths.codexSkillsDir);
  items.push(...skillResults);

  // Commands (converted to skills)
  const commandResults = syncCommands(commands, paths.codexSkillsDir);
  items.push(...commandResults);

  // Agents
  const agentResults = syncAgents(agents, paths.codexAgentsDir, config.modelMapping);
  items.push(...agentResults);

  for (const skip of skippedAgents) {
    items.push({
      artifact: `agent:${skip.name}`,
      status: "skipped",
      reason: skip.reason,
    });
  }

  // MCP servers
  const mcpResults = syncMcpServers(paths.mcpConfigSource, paths.codexConfigDir);
  items.push(...mcpResults);

  const hasErrors = items.some((i) => i.status === "failed");

  return { items, hasErrors };
}
