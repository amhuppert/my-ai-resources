import { spawn } from "node:child_process";

export interface CursorInsertService {
  insertAtCursor(text: string): Promise<void>;
}

type Platform = "macos" | "linux-x11" | "linux-wayland" | "unsupported";

function detectPlatform(): Platform {
  if (process.platform === "darwin") {
    return "macos";
  }

  if (process.platform === "linux") {
    const sessionType = process.env.XDG_SESSION_TYPE;
    if (sessionType === "wayland" || process.env.WAYLAND_DISPLAY) {
      return "linux-wayland";
    }
    return "linux-x11";
  }

  return "unsupported";
}

function spawnInsertCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      timeout: 10000,
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (err: Error) => {
      console.warn(
        `Cursor insert failed (${command} not found): ${err.message}`,
      );
      resolve();
    });

    child.on("close", (code: number | null) => {
      if (code !== 0) {
        console.warn(
          `Cursor insert failed (${command} exited ${code}): ${stderr}`,
        );
      }
      resolve();
    });
  });
}

export function createCursorInsertService(): CursorInsertService {
  const platform = detectPlatform();

  return {
    async insertAtCursor(_text: string): Promise<void> {
      // Text is already on the clipboard from the prior copyToClipboard call.
      // Simulate a paste keystroke instead of typing character-by-character,
      // which avoids newlines being interpreted as Enter key submissions.
      switch (platform) {
        case "linux-x11":
          return spawnInsertCommand("xdotool", [
            "key",
            "--clearmodifiers",
            "ctrl+v",
          ]);

        case "linux-wayland":
          return spawnInsertCommand("wtype", ["-M", "ctrl", "-k", "v"]);

        case "macos": {
          const script = `tell application "System Events" to keystroke "v" using command down`;
          return spawnInsertCommand("osascript", ["-e", script]);
        }

        case "unsupported":
          console.warn("Cursor insert not supported on this platform");
          return;
      }
    },
  };
}
