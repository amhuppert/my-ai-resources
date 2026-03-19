export interface SyncConfig {
  modelMapping: Record<string, string>;
}

export interface SyncPaths {
  claudeMdSource: string;
  pluginScanRoot: string;
  standaloneAgentsDir: string;
  mcpConfigSource: string;
  agentsOverrideDest: string;
  codexSkillsDir: string;
  codexAgentsDir: string;
  codexConfigDir: string;
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

export interface DiscoveredMcpServer {
  id: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface DiscoveredArtifacts {
  skills: DiscoveredSkill[];
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
