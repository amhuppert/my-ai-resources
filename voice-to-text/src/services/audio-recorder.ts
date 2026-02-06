import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir, platform } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { encodeWav } from "../utils/wav-encoder.js";

const SAMPLE_RATE = 16000;
const NUM_CHANNELS = 1;
const BIT_DEPTH = 16;

export interface AudioRecorder {
  start(): void;
  stop(): Promise<string>;
  isRecording(): boolean;
}

/**
 * Create an audio recorder that uses native system tools.
 * - macOS: uses sox (rec command)
 * - Linux: uses arecord (ALSA)
 */
export function createAudioRecorder(): AudioRecorder {
  let recording = false;
  let audioProcess: ChildProcessWithoutNullStreams | null = null;
  let audioChunks: Buffer[] = [];

  const os = platform();

  function getRecordCommand(): { cmd: string; args: string[] } {
    if (os === "darwin") {
      // macOS: use sox's rec command
      return {
        cmd: "rec",
        args: [
          "-q", // quiet mode
          "-r",
          String(SAMPLE_RATE),
          "-c",
          String(NUM_CHANNELS),
          "-b",
          String(BIT_DEPTH),
          "-e",
          "signed-integer",
          "-t",
          "raw", // output raw PCM
          "-", // output to stdout
        ],
      };
    }
    // Linux: use arecord
    return {
      cmd: "arecord",
      args: [
        "-q", // quiet mode
        "-r",
        String(SAMPLE_RATE),
        "-c",
        String(NUM_CHANNELS),
        "-f",
        "S16_LE", // 16-bit signed little-endian
        "-t",
        "raw", // output raw PCM
        "-", // output to stdout
      ],
    };
  }

  return {
    start(): void {
      if (recording) return;

      audioChunks = [];
      recording = true;

      const { cmd, args } = getRecordCommand();
      audioProcess = spawn(cmd, args);

      audioProcess.stdout.on("data", (chunk: Buffer) => {
        audioChunks.push(chunk);
      });

      audioProcess.stderr.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          console.error(`Recording error: ${msg}`);
        }
      });

      audioProcess.on("error", (err: Error) => {
        console.error(`Failed to start recording: ${err.message}`);
        recording = false;
      });
    },

    stop(): Promise<string> {
      return new Promise((resolve, reject) => {
        if (!recording || !audioProcess) {
          reject(new Error("Not recording"));
          return;
        }

        // Kill the recording process
        audioProcess.kill("SIGTERM");

        // Wait for process to exit and all data to be collected
        audioProcess.on("close", () => {
          recording = false;

          const pcmBuffer = Buffer.concat(audioChunks);
          const wavBuffer = encodeWav(
            pcmBuffer,
            SAMPLE_RATE,
            NUM_CHANNELS,
            BIT_DEPTH,
          );

          const tempPath = join(tmpdir(), `voice-to-text-${Date.now()}.wav`);
          writeFileSync(tempPath, wavBuffer);

          audioProcess = null;
          audioChunks = [];

          resolve(tempPath);
        });

        audioProcess.on("error", (err: Error) => {
          reject(err);
        });
      });
    },

    isRecording(): boolean {
      return recording;
    },
  };
}

export function cleanupAudioFile(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch {
    // Ignore cleanup errors
  }
}
