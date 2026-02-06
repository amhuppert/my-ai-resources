import { Command } from "commander";
import { loadConfig, mergeConfig } from "./utils/config.js";
import { createHotkeyListener } from "./utils/hotkey.js";
import { createFeedbackService } from "./services/feedback.js";
import {
  createAudioRecorder,
  cleanupAudioFile,
} from "./services/audio-recorder.js";
import { createTranscriber } from "./services/transcriber.js";
import { createCleanupService } from "./services/cleanup.js";
import { copyToClipboard } from "./services/clipboard.js";
import { createCursorInsertService } from "./services/cursor-insert.js";
import type { AppState, Config } from "./types.js";

const program = new Command();

program
  .name("voice-to-text")
  .description("Capture voice input and convert to AI-ready formatted text")
  .version("1.0.0")
  .option("--hotkey <key>", "Global hotkey to toggle recording")
  .option("--context-file <path>", "Path to context file for Claude cleanup")
  .option(
    "--instructions-file <path>",
    "Path to instructions file for Claude cleanup",
  )
  .option("--claude-model <model>", "Claude model for cleanup step")
  .option("--no-auto-insert", "Disable auto-insert at cursor")
  .option("--no-beep", "Disable audio feedback")
  .option("--no-notification", "Disable desktop notifications")
  .option("--no-terminal-output", "Disable terminal output")
  .option(
    "--max-duration <seconds>",
    "Maximum recording duration in seconds",
    parseInt,
  );

program.parse();

async function main() {
  // Validate environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }

  // Load configuration from file, then overlay CLI options
  const fileConfig = loadConfig();
  const opts = program.opts();

  const cliOpts: Partial<Config> = {};
  if (opts.hotkey !== undefined) cliOpts.hotkey = opts.hotkey;
  if (opts.contextFile !== undefined) cliOpts.contextFile = opts.contextFile;
  if (opts.instructionsFile !== undefined)
    cliOpts.instructionsFile = opts.instructionsFile;
  if (opts.claudeModel !== undefined) cliOpts.claudeModel = opts.claudeModel;
  if (opts.autoInsert !== undefined) cliOpts.autoInsert = opts.autoInsert;
  if (opts.beep !== undefined) cliOpts.beepEnabled = opts.beep;
  if (opts.notification !== undefined)
    cliOpts.notificationEnabled = opts.notification;
  if (opts.terminalOutput !== undefined)
    cliOpts.terminalOutputEnabled = opts.terminalOutput;
  if (opts.maxDuration !== undefined)
    cliOpts.maxRecordingDuration = opts.maxDuration;

  const config = mergeConfig(fileConfig, cliOpts);

  // Initialize state
  const state: AppState = {
    status: "idle",
    recordingStartTime: null,
    audioFilePath: null,
  };

  // Create services
  const feedback = createFeedbackService(config);
  const recorder = createAudioRecorder();
  const transcriber = createTranscriber(apiKey);
  const cleanupService = createCleanupService(config.claudeModel);
  const cursorInsert = config.autoInsert ? createCursorInsertService() : null;

  // Max recording duration timer
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

  async function handleHotkey() {
    if (state.status === "idle") {
      // Start recording
      state.status = "recording";
      state.recordingStartTime = Date.now();

      feedback.playStartBeep();
      feedback.showNotification("Voice to Text", "Recording started");
      feedback.log("Recording...");

      recorder.start();

      // Set max duration timer
      maxDurationTimer = setTimeout(() => {
        if (state.status === "recording") {
          feedback.log(
            `Max recording duration (${config.maxRecordingDuration}s) reached`,
          );
          handleHotkey();
        }
      }, config.maxRecordingDuration * 1000);
    } else if (state.status === "recording") {
      // Stop recording and process
      state.status = "processing";

      // Clear max duration timer
      if (maxDurationTimer) {
        clearTimeout(maxDurationTimer);
        maxDurationTimer = null;
      }

      feedback.playStopBeep();
      feedback.showNotification("Voice to Text", "Processing...");
      feedback.log("Processing...");

      let audioFilePath: string | null = null;

      try {
        audioFilePath = await recorder.stop();
        state.audioFilePath = audioFilePath;

        // Transcribe
        const transcription = await transcriber.transcribe(audioFilePath);
        const preview = transcription.slice(0, 50);
        feedback.log(
          `Transcribed: ${preview}${transcription.length > 50 ? "..." : ""}`,
        );

        // Cleanup
        const cleanedText = await cleanupService.cleanup(
          transcription,
          config.contextFile,
          config.instructionsFile,
        );
        const cleanPreview = cleanedText.slice(0, 50);
        feedback.log(
          `Cleaned: ${cleanPreview}${cleanedText.length > 50 ? "..." : ""}`,
        );

        // Copy to clipboard
        await copyToClipboard(cleanedText);
        feedback.log("Text copied to clipboard.");

        // Insert at cursor position
        if (cursorInsert) {
          await cursorInsert.insertAtCursor(cleanedText);
          feedback.log("Text inserted at cursor.");
        }

        await feedback.playReadyBeep();
        feedback.showNotification("Voice to Text", "Done!");
        feedback.log("Done!");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        feedback.showNotification("Voice to Text", `Error: ${message}`);
        feedback.log(`Error: ${message}`);
      } finally {
        // Cleanup temp file
        if (audioFilePath) {
          cleanupAudioFile(audioFilePath);
        }
        state.status = "idle";
        state.recordingStartTime = null;
        state.audioFilePath = null;
      }
    } else if (state.status === "processing") {
      feedback.log("Still processing, please wait...");
    }
  }

  // Setup hotkey listener
  const hotkeyListener = await createHotkeyListener(
    config.hotkey,
    handleHotkey,
  );

  // Graceful shutdown
  function shutdown() {
    feedback.log("Shutting down...");
    hotkeyListener.stop();

    if (maxDurationTimer) {
      clearTimeout(maxDurationTimer);
    }

    if (state.audioFilePath) {
      cleanupAudioFile(state.audioFilePath);
    }

    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start listening
  hotkeyListener.start();

  // Show startup message based on actual input mode
  if (hotkeyListener.isGlobalHotkey()) {
    feedback.log(
      `Voice-to-text ready. Press ${config.hotkey} to start recording.`,
    );
  } else {
    feedback.log(
      `Voice-to-text ready. Press Enter or Space to toggle recording. (Ctrl+C to exit)`,
    );
  }
}

main();
