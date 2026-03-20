export interface SyncConfig {
  modelMapping: Record<string, string>;
  exclude?: string[];
}

export interface SyncPaths {
  scope: "user" | "project";
  claudeMdSource: string;
  pluginScanRoot: string;
  standaloneSkillsDir: string;
  commandsDir: string;
  standaloneAgentsDir: string;
  mcpConfigSource: string;
  agentsOverrideDest: string;
  codexSkillsDir: string;
  codexAgentsDir: string;
  codexConfigDir: string;
  /** Directory containing installed_plugins.json — used by project scope to exclude user-installed plugins */
  installedPluginsDir?: string;
}

export interface DiscoveredSkill {
  name: string;
  sourceDir: string;
  skillMdPath: string;
}

export interface DiscoveredAgent {
  name: string;
  sourcePath: string;
  source: "plugin" | "standalone";
}

export interface StdioMcpServer {
  transport: "stdio";
  id: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface HttpMcpServer {
  transport: "http";
  id: string;
  url: string;
  headers: Record<string, string>;
}

export type DiscoveredMcpServer = StdioMcpServer | HttpMcpServer;

export interface SkippedAgent {
  name: string;
  sourcePath: string;
  reason: string;
}

export interface DiscoveredCommand {
  name: string;
  sourcePath: string;
}

export interface DiscoveredArtifacts {
  skills: DiscoveredSkill[];
  commands: DiscoveredCommand[];
  agents: DiscoveredAgent[];
  mcpServers: DiscoveredMcpServer[];
  claudeMdExists: boolean;
}

export interface SyncItemResult {
  artifact: string;
  status: "synced" | "skipped" | "failed";
  destPath?: string;
  reason?: string;
  warnings?: string[];
}

export interface SyncResult {
  items: SyncItemResult[];
  hasErrors: boolean;
}

export interface CodexAgentToml {
  name: string;
  description: string;
  developer_instructions: string;
  model?: string;
}
