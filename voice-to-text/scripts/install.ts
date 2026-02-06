import { execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { homedir, platform } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const CONFIG_DIR = join(homedir(), ".config", "voice-to-text");
const ASSETS_DIR = join(CONFIG_DIR, "assets");
const CONFIG_BIN_DIR = join(CONFIG_DIR, "bin");
const BIN_DIR = join(homedir(), ".local", "bin");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function checkCommand(cmd: string): boolean {
  const result = spawnSync("which", [cmd], { encoding: "utf-8" });
  return result.status === 0;
}

function printStep(step: string): void {
  console.log(`\n→ ${step}`);
}

function printWarning(message: string): void {
  console.log(`⚠️  ${message}`);
}

function printError(message: string): void {
  console.error(`❌ ${message}`);
}

function printSuccess(message: string): void {
  console.log(`✓ ${message}`);
}

async function main() {
  console.log("Voice-to-Text Installer");
  console.log("=======================\n");

  const os = platform();
  const isMac = os === "darwin";
  const isLinux = os === "linux";

  if (!isMac && !isLinux) {
    printError(
      `Unsupported platform: ${os}. Only macOS and Linux are supported.`,
    );
    process.exit(1);
  }

  // Check system dependencies
  printStep("Checking system dependencies...");

  if (isMac) {
    if (!checkCommand("sox")) {
      printWarning("sox is not installed. Audio recording requires sox.");
      console.log("  Install with: brew install sox");
      console.log(
        "  Press Ctrl+C to cancel, or the installation will continue...",
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      printSuccess("sox is installed");
    }
  } else if (isLinux) {
    if (!checkCommand("arecord")) {
      printWarning(
        "arecord is not installed. Audio recording requires alsa-utils.",
      );
      console.log("  Install with: sudo apt install alsa-utils");
      console.log(
        "  Press Ctrl+C to cancel, or the installation will continue...",
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      printSuccess("arecord is installed");
    }
  }

  // Check Claude CLI
  if (!checkCommand("claude")) {
    printWarning(
      "Claude Code CLI is not installed. Text cleanup requires 'claude' command.",
    );
    console.log("  Visit: https://docs.anthropic.com/en/docs/claude-code");
  } else {
    printSuccess("Claude Code CLI is installed");
  }

  // Check OPENAI_API_KEY
  if (!process.env.OPENAI_API_KEY) {
    printWarning("OPENAI_API_KEY environment variable is not set.");
    console.log(
      "  Set it in your shell profile: export OPENAI_API_KEY=your-key",
    );
  } else {
    printSuccess("OPENAI_API_KEY is set");
  }

  // Build
  printStep("Building voice-to-text...");
  try {
    execSync("bun run build", { cwd: projectRoot, stdio: "inherit" });
    printSuccess("Build complete");
  } catch {
    printError("Build failed");
    process.exit(1);
  }

  // Create directories
  printStep("Creating directories...");
  mkdirSync(CONFIG_DIR, { recursive: true });
  mkdirSync(ASSETS_DIR, { recursive: true });
  mkdirSync(CONFIG_BIN_DIR, { recursive: true });
  mkdirSync(BIN_DIR, { recursive: true });
  printSuccess(`Created ${CONFIG_DIR}`);
  printSuccess(`Created ${BIN_DIR}`);

  // Copy binary
  printStep("Installing binary...");
  const binarySource = join(projectRoot, "dist", "voice-to-text");
  const binaryDest = join(BIN_DIR, "voice-to-text");

  if (!existsSync(binarySource)) {
    printError(`Binary not found at ${binarySource}`);
    process.exit(1);
  }

  copyFileSync(binarySource, binaryDest);
  execSync(`chmod +x "${binaryDest}"`);
  printSuccess(`Installed to ${binaryDest}`);

  // Compile MacKeyServer from Swift source (macOS only)
  if (isMac) {
    printStep("Compiling MacKeyServer for global hotkey support...");
    const swiftSource = join(projectRoot, "src", "bin", "MacKeyServer.swift");
    const macKeyServerDest = join(CONFIG_BIN_DIR, "MacKeyServer");

    if (!existsSync(swiftSource)) {
      printWarning(
        `MacKeyServer.swift not found at ${swiftSource}. Global hotkey will not work.`,
      );
    } else if (!checkCommand("swiftc")) {
      printWarning(
        "Swift compiler (swiftc) not found. Install Xcode Command Line Tools for global hotkey support.",
      );
      console.log("  Install with: xcode-select --install");
    } else {
      try {
        execSync(`swiftc "${swiftSource}" -o "${macKeyServerDest}"`, {
          stdio: "pipe",
          timeout: 120_000,
        });
        execSync(`chmod +x "${macKeyServerDest}"`);
        printSuccess(`Compiled MacKeyServer to ${macKeyServerDest}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        printWarning(`Failed to compile MacKeyServer: ${msg}`);
        console.log(
          "  Global hotkey will not work. Terminal input mode will be used instead.",
        );
      }
    }
  }

  // Copy assets
  printStep("Copying assets...");
  const assetsSource = join(projectRoot, "assets");
  if (existsSync(assetsSource)) {
    const assets = readdirSync(assetsSource);
    for (const asset of assets) {
      const src = join(assetsSource, asset);
      const dest = join(ASSETS_DIR, asset);
      copyFileSync(src, dest);
      printSuccess(`Copied ${asset}`);
    }
  } else {
    printWarning(
      "No assets directory found. Beep sounds will not be available.",
    );
  }

  // Create default config if not exists
  printStep("Setting up configuration...");
  if (!existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      hotkey: "F9",
      beepEnabled: true,
      notificationEnabled: true,
      terminalOutputEnabled: true,
      maxRecordingDuration: 300,
    };
    writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    printSuccess(`Created default config at ${CONFIG_PATH}`);
  } else {
    printSuccess(`Config already exists at ${CONFIG_PATH}`);
  }

  // Final message
  console.log("\n✅ Installation complete!\n");
  console.log("Usage:");
  console.log("  1. Make sure ~/.local/bin is in your PATH");
  console.log("  2. Run: voice-to-text");
  console.log("  3. Press F9 to start recording, F9 again to stop");
  console.log("  4. The cleaned text will be copied to your clipboard\n");

  if (!process.env.PATH?.includes(".local/bin")) {
    console.log("Note: Add ~/.local/bin to your PATH if not already present:");
    console.log('  export PATH="$HOME/.local/bin:$PATH"\n');
  }
}

main().catch((err) => {
  printError(err.message);
  process.exit(1);
});
