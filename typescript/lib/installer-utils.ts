import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from "fs";
import { dirname, join } from "path";
import { platform } from "os";

/**
 * Execute a shell command and return the result
 */
export async function execCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: Record<string, string> },
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
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

/**
 * Check if a command is available in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await execCommand("which", [command]);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Sync directory using rsync
 */
export async function syncDirectory(
  srcDir: string,
  destDir: string,
): Promise<void> {
  if (!existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  // Ensure destination directory exists
  mkdirSync(destDir, { recursive: true });

  // Use rsync to sync
  const result = await execCommand("rsync", [
    "-a",
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
export async function copyFile(src: string, dest: string): Promise<void> {
  if (!existsSync(src)) {
    throw new Error(`Source file not found: ${src}`);
  }

  // Ensure destination directory exists
  mkdirSync(dirname(dest), { recursive: true });

  // Use rsync for file copy
  const result = await execCommand("rsync", ["-a", src, dest]);

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
): Promise<void> {
  if (existsSync(srcDir)) {
    console.log(description);
    await syncDirectory(srcDir, destDir);
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
  makeExecutable: boolean = false,
): Promise<void> {
  if (existsSync(srcFile)) {
    console.log(description);
    await copyFile(srcFile, destFile);
    if (makeExecutable) {
      chmodSync(destFile, 0o755);
    }
  } else {
    console.log(`Warning: ${srcFile} not found`);
  }
}

/**
 * Install CLAUDE.md with XML tag handling
 */
export async function installClaudeMd(
  srcFile: string,
  destFile: string,
  description: string,
  xmlTag: string = "user-level-instructions",
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
  const openTag = `<${xmlTag}>`;
  const closeTag = `</${xmlTag}>`;

  // Check if destination file contains the specified XML tag
  if (destContent.includes(openTag)) {
    // Replace the existing XML tag section
    // Remove everything between and including the tags, plus any trailing newlines
    const tagRegex = new RegExp(
      `${openTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${closeTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n*`,
      "g",
    );
    const withoutOldTag = destContent.replace(tagRegex, "");
    const merged = withoutOldTag + sourceContent;
    writeFileSync(destFile, merged, "utf-8");
  } else {
    // Append the new content to the existing file
    const merged = destContent + sourceContent;
    writeFileSync(destFile, merged, "utf-8");
  }
}
