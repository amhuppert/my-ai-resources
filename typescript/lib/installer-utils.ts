import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from "fs";
import { dirname, join } from "path";
import { platform } from "os";
import {
  type CommandExecutor,
  type CommandResult,
  type InstallConfig,
  createDefaultExecutor,
  createDefaultConfig,
} from "./install-types";

/**
 * Execute a shell command and return the result
 */
export async function execCommand(
  command: string,
  args: string[],
  executor: CommandExecutor,
  options?: { cwd?: string; env?: Record<string, string> },
): Promise<CommandResult> {
  return executor.exec(command, args, options);
}

/**
 * Check if a command is available in PATH
 */
export async function commandExists(
  command: string,
  executor: CommandExecutor,
): Promise<boolean> {
  return executor.exists(command);
}

/**
 * Sync directory using rsync
 */
export async function syncDirectory(
  srcDir: string,
  destDir: string,
  config: InstallConfig,
  executor: CommandExecutor,
): Promise<void> {
  if (!existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  // Ensure destination directory exists
  mkdirSync(destDir, { recursive: true });

  // Use rsync to sync
  const result = await executor.exec("rsync", [
    ...config.commands.rsyncFlags,
    `${srcDir}/`,
    `${destDir}/`,
  ]);

  if (!result.success) {
    throw new Error(`Failed to sync directory: ${result.stderr}`);
  }
}

/**
 * Copy single file
 */
export async function copyFile(
  src: string,
  dest: string,
  config: InstallConfig,
  executor: CommandExecutor,
): Promise<void> {
  if (!existsSync(src)) {
    throw new Error(`Source file not found: ${src}`);
  }

  // Ensure destination directory exists
  mkdirSync(dirname(dest), { recursive: true });

  // Use rsync for file copy
  const result = await executor.exec("rsync", [
    ...config.commands.rsyncFlags,
    src,
    dest,
  ]);

  if (!result.success) {
    throw new Error(`Failed to copy file: ${result.stderr}`);
  }
}

/**
 * Print installation header
 */
export function printInstallationHeader(
  installType: "user-level" | "project-level",
  scriptDir: string,
): void {
  console.log(`Starting AI tooling ${installType} installation...`);
  console.log(`Script directory: ${scriptDir}`);
  if (installType === "project-level") {
    console.log(`Target directory: ${process.cwd()}`);
  }
}

/**
 * Print installation footer
 */
export function printInstallationFooter(
  installType: "user-level" | "project-level",
): void {
  console.log("");
  console.log(`${installType} installation complete!`);
}

/**
 * Install directory with optional check
 */
export async function installDirectory(
  srcDir: string,
  destDir: string,
  description: string,
  config: InstallConfig,
  executor: CommandExecutor,
): Promise<void> {
  if (existsSync(srcDir)) {
    console.log(description);
    await syncDirectory(srcDir, destDir, config, executor);
  } else {
    console.log(`Warning: ${srcDir} directory not found`);
  }
}

/**
 * Install file with optional executable permission
 */
export async function installFile(
  srcFile: string,
  destFile: string,
  description: string,
  config: InstallConfig,
  executor: CommandExecutor,
  makeExecutable: boolean = false,
): Promise<void> {
  if (existsSync(srcFile)) {
    console.log(description);
    await copyFile(srcFile, destFile, config, executor);
    if (makeExecutable) {
      chmodSync(destFile, config.commands.chmodExecutable);
    }
  } else {
    console.log(`Warning: ${srcFile} not found`);
  }
}

/**
 * Pure function to merge content with comment marker replacement
 * If destContent contains the markers, replaces that section with sourceContent
 * Otherwise, appends sourceContent to destContent
 */
export function replaceMarkedSection(
  destContent: string,
  sourceContent: string,
): string {
  const BEGIN_MARKER = "<!-- Begin standard instructions -->";
  const END_MARKER = "<!-- End of standard instructions -->";

  if (destContent.includes(BEGIN_MARKER)) {
    const pattern = new RegExp(
      `${BEGIN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n*`,
      "g",
    );
    const withoutOldSection = destContent.replace(pattern, "");
    return withoutOldSection + sourceContent;
  } else {
    return destContent + sourceContent;
  }
}

/**
 * Install all files from a source directory to a destination directory
 */
export async function installDirectoryFiles(
  srcDir: string,
  destDir: string,
  description: string,
  config: InstallConfig,
  executor: CommandExecutor,
  makeExecutable: boolean = false,
): Promise<void> {
  if (!existsSync(srcDir)) {
    console.log(`Warning: ${srcDir} directory not found`);
    return;
  }

  console.log(description);

  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const srcFile = join(srcDir, entry.name);
    const destFile = join(destDir, entry.name);
    await copyFile(srcFile, destFile, config, executor);
    if (makeExecutable) {
      chmodSync(destFile, config.commands.chmodExecutable);
    }
    console.log(`  Installed ${entry.name}`);
  }
}

/**
 * Install CLAUDE.md with comment marker handling
 */
export async function installClaudeMd(
  srcFile: string,
  destFile: string,
  description: string,
): Promise<void> {
  if (!existsSync(srcFile)) {
    console.log(`Warning: ${srcFile} not found`);
    return;
  }

  console.log(description);

  // Create destination directory if it doesn't exist
  mkdirSync(dirname(destFile), { recursive: true });

  const sourceContent = readFileSync(srcFile, "utf-8");

  // If destination file doesn't exist, simply copy the source
  if (!existsSync(destFile)) {
    writeFileSync(destFile, sourceContent, "utf-8");
    return;
  }

  const destContent = readFileSync(destFile, "utf-8");
  const merged = replaceMarkedSection(destContent, sourceContent);
  writeFileSync(destFile, merged, "utf-8");
}
