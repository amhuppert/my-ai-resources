import { homedir } from "os";
import { join } from "path";

/**
 * Result of a command execution
 */
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Interface for executing shell commands
 */
export interface CommandExecutor {
  exec(
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string> },
  ): Promise<CommandResult>;
  exists(command: string): Promise<boolean>;
}

/**
 * Configuration for installation paths and commands
 */
export interface InstallConfig {
  paths: {
    userHome: string;
    userClaudeDir: string;
    userLocalBin: string;
    projectClaudeDir: string;
    cursorRulesDir: string;
    cursorCommandsDir: string;
  };
  commands: {
    rsyncFlags: string[];
    chmodExecutable: number;
  };
}

/**
 * Default implementation of CommandExecutor using Bun.spawn
 */
export class BunCommandExecutor implements CommandExecutor {
  async exec(
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string> },
  ): Promise<CommandResult> {
    const proc = Bun.spawn([command, ...args], {
      cwd: options?.cwd,
      env: options?.env,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;

    return {
      success: exitCode === 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
    };
  }

  async exists(command: string): Promise<boolean> {
    try {
      const result = await this.exec("which", [command]);
      return result.success;
    } catch {
      return false;
    }
  }
}

/**
 * Create default installation configuration
 */
export function createDefaultConfig(): InstallConfig {
  const userHome = homedir();
  return {
    paths: {
      userHome,
      userClaudeDir: join(userHome, ".claude"),
      userLocalBin: join(userHome, ".local", "bin"),
      projectClaudeDir: join(process.cwd(), ".claude"),
      cursorRulesDir: join(process.cwd(), ".cursor", "rules"),
      cursorCommandsDir: join(process.cwd(), ".cursor", "commands"),
    },
    commands: {
      rsyncFlags: ["-a"],
      chmodExecutable: 0o755,
    },
  };
}

/**
 * Create default command executor
 */
export function createDefaultExecutor(): CommandExecutor {
  return new BunCommandExecutor();
}
