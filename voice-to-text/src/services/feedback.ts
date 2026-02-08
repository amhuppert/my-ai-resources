import { join } from "node:path";
import notifier from "node-notifier";
import player from "play-sound";
import type { Config } from "../types.js";
import { getAssetsDir } from "../utils/config.js";

const audioPlayer = player({});

export interface FeedbackService {
  playStartBeep(): Promise<void>;
  playStopBeep(): Promise<void>;
  playReadyBeep(): Promise<void>;
  showNotification(title: string, message: string): void;
  log(message: string): void;
  verboseLog(label: string, content?: string): void;
}

export function createFeedbackService(
  config: Config,
  verbose = false,
): FeedbackService {
  const assetsDir = getAssetsDir();

  function playSound(filename: string): Promise<void> {
    if (!config.beepEnabled) return Promise.resolve();

    const filePath = join(assetsDir, filename);
    return new Promise((resolve, reject) => {
      audioPlayer.play(filePath, (err: Error | null) => {
        if (err) {
          // Don't fail if sound can't play, just log it
          console.error(`Failed to play sound: ${err.message}`);
        }
        resolve();
      });
    });
  }

  return {
    playStartBeep(): Promise<void> {
      return playSound("start.wav");
    },

    playStopBeep(): Promise<void> {
      return playSound("stop.wav");
    },

    playReadyBeep(): Promise<void> {
      return playSound("ready.wav");
    },

    showNotification(title: string, message: string): void {
      if (!config.notificationEnabled) return;

      notifier.notify({
        title,
        message,
        sound: false, // We handle audio separately
      });
    },

    log(message: string): void {
      if (!config.terminalOutputEnabled) return;

      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${message}`);
    },

    verboseLog(label: string, content?: string): void {
      if (!verbose) return;

      const timestamp = new Date().toLocaleTimeString();
      const separator = "─".repeat(40);

      if (content === undefined) {
        console.log(`[${timestamp}] [VERBOSE] ${label}`);
      } else if (!content.includes("\n")) {
        console.log(`[${timestamp}] [VERBOSE] ${label}: ${content}`);
      } else {
        console.log(`[${timestamp}] [VERBOSE] ${label}:`);
        console.log(separator);
        console.log(content);
        console.log(separator);
      }
    },
  };
}
