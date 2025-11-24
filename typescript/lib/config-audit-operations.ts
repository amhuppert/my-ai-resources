import { existsSync, readdirSync, statSync, readFileSync } from "fs";
import { join, basename, extname } from "path";

export interface ClaudeCodeResource {
  type: "command" | "skill" | "agent";
  name: string;
  path: string;
  description?: string;
}

export interface CursorResource {
  type: "rule" | "command";
  name: string;
  path: string;
  description?: string;
  ruleType?: "always" | "auto-attached" | "agent-requested" | "manual";
  globs?: string[];
}

export interface ConfigAuditReport {
  claudeCode: {
    commands: ClaudeCodeResource[];
    skills: ClaudeCodeResource[];
    agents: ClaudeCodeResource[];
    total: number;
  };
  cursor: {
    rules: CursorResource[];
    commands: CursorResource[];
    total: number;
  };
  gaps: {
    claudeCodeWithoutCursorEquivalent: ClaudeCodeResource[];
    cursorWithoutClaudeCodeEquivalent: CursorResource[];
  };
  suggestions: string[];
}

/**
 * Extract frontmatter from a markdown file
 */
function extractFrontmatter(
  content: string,
): Record<string, string | boolean | string[]> {
  const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
  if (!frontmatterMatch || !frontmatterMatch[1]) {
    return {};
  }

  const frontmatter: Record<string, string | boolean | string[]> = {};
  const lines = frontmatterMatch[1].split("\n");

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();

      // Handle boolean values
      if (value === "true") {
        frontmatter[key] = true;
      } else if (value === "false") {
        frontmatter[key] = false;
      }
      // Handle array values in brackets (e.g., ["*.js", "*.ts"])
      else if (value.startsWith("[") && value.endsWith("]")) {
        frontmatter[key] = value
          .slice(1, -1)
          .split(",")
          .map((v) => v.trim().replace(/^["']|["']$/g, ""));
      }
      // Handle globs field specifically (can be comma-separated without brackets or single value)
      else if (key === "globs") {
        frontmatter[key] = value.includes(",")
          ? value.split(",").map((v) => v.trim())
          : [value];
      }
      // Handle string values
      else {
        frontmatter[key] = value;
      }
    }
  }

  return frontmatter;
}

/**
 * Scan a directory for markdown files
 */
function scanDirectory(dirPath: string): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const files: string[] = [];

  function scan(currentPath: string): void {
    const entries = readdirSync(currentPath);

    for (const entry of entries) {
      const fullPath = join(currentPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (
        stat.isFile() &&
        (entry.endsWith(".md") || entry.endsWith(".mdc"))
      ) {
        files.push(fullPath);
      }
    }
  }

  scan(dirPath);
  return files;
}

/**
 * Determine Cursor rule type from frontmatter
 */
function determineCursorRuleType(frontmatter: Record<string, unknown>): string {
  const alwaysApply = frontmatter.alwaysApply;
  const globs = frontmatter.globs;

  if (alwaysApply === true) {
    return "always";
  }

  if (Array.isArray(globs) && globs.length > 0) {
    return "auto-attached";
  }

  // If description exists, it's likely agent-requested
  // Otherwise it's manual
  if (frontmatter.description) {
    return "agent-requested";
  }

  return "manual";
}

/**
 * Scan Claude Code resources in the claude/ directory
 */
export function scanClaudeCodeResources(
  claudeDir: string,
): Pick<ConfigAuditReport["claudeCode"], "commands" | "skills" | "agents"> {
  const commands: ClaudeCodeResource[] = [];
  const skills: ClaudeCodeResource[] = [];
  const agents: ClaudeCodeResource[] = [];

  // Scan commands
  const commandsDir = join(claudeDir, "ai-resources-plugin", "commands");
  const commandFiles = scanDirectory(commandsDir);

  for (const filePath of commandFiles) {
    const content = readFileSync(filePath, "utf-8");
    const frontmatter = extractFrontmatter(content);
    const name = basename(filePath, extname(filePath));

    commands.push({
      type: "command",
      name,
      path: filePath,
      description: frontmatter.description as string | undefined,
    });
  }

  // Scan skills
  const skillsDir = join(claudeDir, "ai-resources-plugin", "skills");
  if (existsSync(skillsDir)) {
    const skillDirs = readdirSync(skillsDir);

    for (const skillDir of skillDirs) {
      const skillPath = join(skillsDir, skillDir);
      const skillMdPath = join(skillPath, "SKILL.md");

      if (existsSync(skillMdPath) && statSync(skillPath).isDirectory()) {
        const content = readFileSync(skillMdPath, "utf-8");
        const frontmatter = extractFrontmatter(content);

        skills.push({
          type: "skill",
          name: frontmatter.name as string,
          path: skillPath,
          description: frontmatter.description as string | undefined,
        });
      }
    }
  }

  // Scan agents
  const agentsDir = join(claudeDir, "ai-resources-plugin", "agents");
  const agentFiles = scanDirectory(agentsDir);

  for (const filePath of agentFiles) {
    const content = readFileSync(filePath, "utf-8");
    const frontmatter = extractFrontmatter(content);
    const name = basename(filePath, extname(filePath));

    agents.push({
      type: "agent",
      name,
      path: filePath,
      description: frontmatter.description as string | undefined,
    });
  }

  return { commands, skills, agents };
}

/**
 * Scan Cursor resources in the cursor/ directory
 */
export function scanCursorResources(
  cursorDir: string,
): Pick<ConfigAuditReport["cursor"], "rules" | "commands"> {
  const rules: CursorResource[] = [];
  const commands: CursorResource[] = [];

  // Scan rules
  const rulesDir = join(cursorDir, "rules");
  const ruleFiles = scanDirectory(rulesDir);

  for (const filePath of ruleFiles) {
    if (!filePath.endsWith(".mdc")) continue;

    const content = readFileSync(filePath, "utf-8");
    const frontmatter = extractFrontmatter(content);
    const name = basename(filePath, ".mdc");

    const ruleType = determineCursorRuleType(frontmatter);

    rules.push({
      type: "rule",
      name,
      path: filePath,
      description: frontmatter.description as string | undefined,
      ruleType: ruleType as CursorResource["ruleType"],
      globs: frontmatter.globs as string[] | undefined,
    });
  }

  // Scan commands
  const commandsDir = join(cursorDir, "commands");
  const commandFiles = scanDirectory(commandsDir);

  for (const filePath of commandFiles) {
    if (!filePath.endsWith(".md")) continue;

    const name = basename(filePath, ".md");

    commands.push({
      type: "command",
      name,
      path: filePath,
    });
  }

  return { rules, commands };
}

/**
 * Generate suggestions based on gaps
 */
function generateSuggestions(
  claudeCodeWithoutCursor: ClaudeCodeResource[],
  cursorWithoutClaudeCode: CursorResource[],
): string[] {
  const suggestions: string[] = [];

  // Suggest creating Cursor equivalents
  for (const resource of claudeCodeWithoutCursor) {
    if (resource.type === "skill") {
      suggestions.push(
        `Consider creating a Cursor rule for the "${resource.name}" skill to provide similar functionality in Cursor IDE`,
      );
    } else if (resource.type === "command") {
      suggestions.push(
        `The Claude Code command "${resource.name}" could be replicated as a Cursor command if the functionality is needed`,
      );
    } else if (resource.type === "agent") {
      suggestions.push(
        `The Claude Code agent "${resource.name}" provides specialized functionality that could inform a Cursor rule`,
      );
    }
  }

  // Suggest creating Claude Code equivalents
  for (const resource of cursorWithoutClaudeCode) {
    if (resource.type === "rule" && resource.ruleType === "always") {
      suggestions.push(
        `The Cursor "always" rule "${resource.name}" could be added to CLAUDE.md as project instructions`,
      );
    } else if (resource.type === "rule") {
      suggestions.push(
        `Consider creating a Claude Code skill for the "${resource.name}" Cursor rule if similar functionality is needed`,
      );
    }
  }

  return suggestions;
}

/**
 * Perform a configuration audit
 */
export function auditConfiguration(projectRoot: string): ConfigAuditReport {
  const claudeDir = join(projectRoot, "claude");
  const cursorDir = join(projectRoot, "cursor");

  const claudeResources = scanClaudeCodeResources(claudeDir);
  const cursorResources = scanCursorResources(cursorDir);

  // Identify gaps based on name similarity and purpose
  const claudeNames = new Set([
    ...claudeResources.commands.map((c) => c.name.toLowerCase()),
    ...claudeResources.skills.map((s) => s.name.toLowerCase()),
    ...claudeResources.agents.map((a) => a.name.toLowerCase()),
  ]);

  const cursorNames = new Set([
    ...cursorResources.rules.map((r) => r.name.toLowerCase()),
    ...cursorResources.commands.map((c) => c.name.toLowerCase()),
  ]);

  const allClaudeResources = [
    ...claudeResources.commands,
    ...claudeResources.skills,
    ...claudeResources.agents,
  ];

  const allCursorResources = [
    ...cursorResources.rules,
    ...cursorResources.commands,
  ];

  const claudeCodeWithoutCursorEquivalent = allClaudeResources.filter(
    (resource) => !cursorNames.has(resource.name.toLowerCase()),
  );

  const cursorWithoutClaudeCodeEquivalent = allCursorResources.filter(
    (resource) => !claudeNames.has(resource.name.toLowerCase()),
  );

  const suggestions = generateSuggestions(
    claudeCodeWithoutCursorEquivalent,
    cursorWithoutClaudeCodeEquivalent,
  );

  return {
    claudeCode: {
      ...claudeResources,
      total:
        claudeResources.commands.length +
        claudeResources.skills.length +
        claudeResources.agents.length,
    },
    cursor: {
      ...cursorResources,
      total: cursorResources.rules.length + cursorResources.commands.length,
    },
    gaps: {
      claudeCodeWithoutCursorEquivalent,
      cursorWithoutClaudeCodeEquivalent,
    },
    suggestions,
  };
}

/**
 * Format the audit report for display
 */
export function formatAuditReport(report: ConfigAuditReport): string {
  const lines: string[] = [];

  lines.push("# Configuration Audit Report\n");

  // Claude Code Resources
  lines.push("## Claude Code Resources\n");
  lines.push(`**Total:** ${report.claudeCode.total}\n`);

  lines.push(`### Commands (${report.claudeCode.commands.length})`);
  for (const cmd of report.claudeCode.commands) {
    lines.push(
      `- **${cmd.name}**${cmd.description ? `: ${cmd.description}` : ""}`,
    );
  }
  lines.push("");

  lines.push(`### Skills (${report.claudeCode.skills.length})`);
  for (const skill of report.claudeCode.skills) {
    lines.push(
      `- **${skill.name}**${skill.description ? `: ${skill.description}` : ""}`,
    );
  }
  lines.push("");

  lines.push(`### Agents (${report.claudeCode.agents.length})`);
  for (const agent of report.claudeCode.agents) {
    lines.push(
      `- **${agent.name}**${agent.description ? `: ${agent.description}` : ""}`,
    );
  }
  lines.push("");

  // Cursor Resources
  lines.push("## Cursor Resources\n");
  lines.push(`**Total:** ${report.cursor.total}\n`);

  lines.push(`### Rules (${report.cursor.rules.length})`);
  const rulesByType: Record<string, CursorResource[]> = {
    always: [],
    "auto-attached": [],
    "agent-requested": [],
    manual: [],
  };

  for (const rule of report.cursor.rules) {
    const type = rule.ruleType || "manual";
    rulesByType[type].push(rule);
  }

  for (const [type, rules] of Object.entries(rulesByType)) {
    if (rules.length === 0) continue;
    lines.push(
      `\n#### ${type.charAt(0).toUpperCase() + type.slice(1)} (${rules.length})`,
    );
    for (const rule of rules) {
      const desc = rule.description ? `: ${rule.description}` : "";
      const globs =
        rule.globs && rule.globs.length > 0
          ? ` [${rule.globs.join(", ")}]`
          : "";
      lines.push(`- **${rule.name}**${desc}${globs}`);
    }
  }
  lines.push("");

  lines.push(`### Commands (${report.cursor.commands.length})`);
  for (const cmd of report.cursor.commands) {
    lines.push(`- **${cmd.name}**`);
  }
  lines.push("");

  // Gaps
  lines.push("## Gap Analysis\n");

  lines.push(
    `### Claude Code Resources Without Cursor Equivalents (${report.gaps.claudeCodeWithoutCursorEquivalent.length})`,
  );
  for (const resource of report.gaps.claudeCodeWithoutCursorEquivalent) {
    lines.push(
      `- **${resource.name}** (${resource.type})${resource.description ? `: ${resource.description}` : ""}`,
    );
  }
  lines.push("");

  lines.push(
    `### Cursor Resources Without Claude Code Equivalents (${report.gaps.cursorWithoutClaudeCodeEquivalent.length})`,
  );
  for (const resource of report.gaps.cursorWithoutClaudeCodeEquivalent) {
    lines.push(
      `- **${resource.name}** (${resource.type})${resource.description ? `: ${resource.description}` : ""}`,
    );
  }
  lines.push("");

  // Suggestions
  if (report.suggestions.length > 0) {
    lines.push("## Suggestions\n");
    for (const suggestion of report.suggestions) {
      lines.push(`- ${suggestion}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
