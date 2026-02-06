import { platform } from "node:os";
import {
  readFileSync,
  openSync,
  readSync,
  closeSync,
  accessSync,
  constants,
} from "node:fs";

export interface HotkeyListener {
  start(): void;
  stop(): void;
  isGlobalHotkey(): boolean;
}

function isX11Available(): boolean {
  if (process.env.WAYLAND_DISPLAY) {
    console.log(
      "Wayland detected. Global hotkey requires X11. Falling back to terminal input.",
    );
  }
  return Boolean(process.env.DISPLAY);
}

/**
 * Create a hotkey listener that works cross-platform.
 * On macOS: Uses node-global-key-listener for global hotkey support
 * On Linux: Falls back to stdin-based Enter key listener (terminal must be focused)
 */
export async function createHotkeyListener(
  key: string,
  callback: () => void,
): Promise<HotkeyListener> {
  const os = platform();

  // macOS: use node-global-key-listener
  if (os === "darwin") {
    try {
      const listener = createGlobalHotkeyListener(key, callback);
      await listener.start();
      return listener;
    } catch {
      // Fall through to stdin
    }
  }

  // Linux: use /dev/input for global hotkey (requires input group membership)
  if (os === "linux") {
    try {
      const listener = createLinuxInputHotkeyListener(key, callback);
      listener.start();
      return listener;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("EACCES")) {
        console.log(
          "Global hotkey unavailable: permission denied on /dev/input. Add yourself to the 'input' group:",
        );
        console.log("  sudo usermod -a -G input $USER");
        console.log("  (then log out and back in)");
      } else {
        console.log(`Global hotkey unavailable: ${msg}`);
      }
      console.log("Falling back to terminal input mode.");
    }
  }

  return createStdinHotkeyListener(callback);
}

/**
 * Global hotkey listener using node-global-key-listener (macOS, Linux X11)
 */
function createGlobalHotkeyListener(
  key: string,
  callback: () => void,
): HotkeyListener {
  // Dynamic import to avoid loading the library on unsupported platforms
  let listener: ReturnType<
    typeof import("node-global-key-listener").GlobalKeyboardListener
  > | null = null;
  let isStarted = false;
  const normalizedKey = normalizeKeyName(key);

  const handler = (e: { name: string; state: "DOWN" | "UP" }) => {
    if (e.state !== "DOWN") return;
    const eventKey = normalizeKeyName(e.name);
    if (eventKey === normalizedKey) {
      callback();
    }
  };

  return {
    async start() {
      if (isStarted) return;
      const { GlobalKeyboardListener } =
        await import("node-global-key-listener");
      listener = new GlobalKeyboardListener();
      listener.addListener(handler);
      isStarted = true;
    },
    stop() {
      if (!isStarted || !listener) return;
      listener.removeListener(handler);
      listener.kill();
      isStarted = false;
    },
    isGlobalHotkey: () => true,
  };
}

/**
 * Linux/other: Use stdin-based listener (press Enter to toggle recording)
 */
function createStdinHotkeyListener(callback: () => void): HotkeyListener {
  let isStarted = false;

  const onData = (data: Buffer) => {
    // Ctrl+C in raw mode: emit SIGINT so shutdown handler runs
    if (data[0] === 0x03) {
      process.emit("SIGINT");
      return;
    }
    // Check for Enter key (newline) or space
    const char = data.toString();
    if (char === "\n" || char === "\r" || char === " ") {
      callback();
    }
  };

  return {
    start() {
      if (isStarted) return;

      // Enable raw mode to capture keypresses immediately
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.on("data", onData);
      isStarted = true;
    },
    stop() {
      if (!isStarted) return;
      process.stdin.off("data", onData);
      process.stdin.pause();
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      isStarted = false;
    },
    isGlobalHotkey: () => false,
  };
}

/**
 * Linux: Global hotkey via /dev/input kernel input subsystem.
 * Requires user to be in the 'input' group.
 */
function createLinuxInputHotkeyListener(
  key: string,
  callback: () => void,
): HotkeyListener {
  const keyCode = keyNameToLinuxCode(key);
  if (keyCode === undefined) {
    throw new Error(`Unsupported hotkey for Linux input: ${key}`);
  }

  const devicePaths = findKeyboardDevices();
  if (devicePaths.length === 0) {
    throw new Error("No keyboard input device found");
  }

  // Verify read access on at least one device
  const accessiblePaths = devicePaths.filter((p) => {
    try {
      accessSync(p, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  });
  if (accessiblePaths.length === 0) {
    throw new Error("EACCES: no readable keyboard input device");
  }

  // input_event struct: 24 bytes on 64-bit (timeval 16 + type 2 + code 2 + value 4)
  const STRUCT_SIZE = 24;
  const fds: number[] = [];
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let isStarted = false;

  function processBuffer(buf: Buffer, bytesRead: number) {
    for (
      let offset = 0;
      offset + STRUCT_SIZE <= bytesRead;
      offset += STRUCT_SIZE
    ) {
      const type = buf.readUInt16LE(offset + 16);
      const code = buf.readUInt16LE(offset + 18);
      const value = buf.readInt32LE(offset + 20);
      // EV_KEY = 1, value 1 = key down (not repeat)
      if (type === 1 && code === keyCode && value === 1) {
        callback();
      }
    }
  }

  return {
    start() {
      if (isStarted) return;
      for (const devicePath of accessiblePaths) {
        try {
          const fd = openSync(
            devicePath,
            constants.O_RDONLY | constants.O_NONBLOCK,
          );
          fds.push(fd);
        } catch {
          // Skip devices that fail to open
        }
      }
      if (fds.length === 0) return;

      // Poll all keyboard fds for events
      const buf = Buffer.alloc(STRUCT_SIZE * 16); // room for 16 events per read
      pollTimer = setInterval(() => {
        for (const fd of fds) {
          try {
            const bytesRead = readSync(fd, buf, 0, buf.length, null);
            if (bytesRead > 0) {
              processBuffer(buf, bytesRead);
            }
          } catch {
            // EAGAIN (no data available) is expected with O_NONBLOCK
          }
        }
      }, 50); // 50ms poll interval - responsive enough for hotkeys
      isStarted = true;
    },
    stop() {
      if (!isStarted) return;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      for (const fd of fds) {
        try {
          closeSync(fd);
        } catch {
          /* ignore */
        }
      }
      fds.length = 0;
      isStarted = false;
    },
    isGlobalHotkey: () => true,
  };
}

/**
 * Find all keyboard input devices by scanning /proc/bus/input/devices.
 * Matches devices with "sysrq" and "kbd" in handlers (full keyboards),
 * to avoid matching power buttons, media controllers, etc.
 */
function findKeyboardDevices(): string[] {
  try {
    const devices = readFileSync("/proc/bus/input/devices", "utf-8");
    const blocks = devices.split("\n\n");
    const paths: string[] = [];
    for (const block of blocks) {
      const handlersLine = block.match(/H: Handlers=(.*)/);
      if (!handlersLine) continue;
      const handlers = handlersLine[1];
      // Full keyboards have both "sysrq" and "kbd" handlers
      if (handlers.includes("sysrq") && handlers.includes("kbd")) {
        const eventMatch = handlers.match(/event\d+/);
        if (eventMatch) {
          paths.push(`/dev/input/${eventMatch[0]}`);
        }
      }
    }
    return paths;
  } catch {
    return [];
  }
}

/**
 * Map key names to Linux kernel key codes (from input-event-codes.h)
 */
function keyNameToLinuxCode(key: string): number | undefined {
  const codeMap: Record<string, number> = {
    f1: 59,
    f2: 60,
    f3: 61,
    f4: 62,
    f5: 63,
    f6: 64,
    f7: 65,
    f8: 66,
    f9: 67,
    f10: 68,
    f11: 87,
    f12: 88,
    space: 57,
    enter: 28,
  };
  return codeMap[key.toLowerCase()];
}

function normalizeKeyName(key: string): string {
  const keyMap: Record<string, string> = {
    f1: "F1",
    f2: "F2",
    f3: "F3",
    f4: "F4",
    f5: "F5",
    f6: "F6",
    f7: "F7",
    f8: "F8",
    f9: "F9",
    f10: "F10",
    f11: "F11",
    f12: "F12",
  };

  const lower = key.toLowerCase();
  return keyMap[lower] ?? key.toUpperCase();
}
