import os from "os";
import path from "path";
import { KeybindingsError } from "./types.js";

export function getKeybindingsPath(): string {
  const home = os.homedir();
  const platform = os.platform();

  switch (platform) {
    case "darwin":
      return path.join(
        home,
        "Library/Application Support/Cursor/User/keybindings.json",
      );
    case "win32":
      const appData = process.env.APPDATA;
      if (!appData) {
        throw new KeybindingsError(
          "APPDATA environment variable not found on Windows",
        );
      }
      return path.join(appData, "Cursor/User/keybindings.json");
    case "linux":
      return path.join(home, ".config/Cursor/User/keybindings.json");
    default:
      throw new KeybindingsError(`Unsupported platform: ${platform}`);
  }
}

export function getOperatingSystemName(
  platform: string = os.platform(),
): string {
  switch (platform) {
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    default:
      return platform;
  }
}
