import { Command } from "commander";
import { join } from "node:path";
import { resolveConfig } from "./utils/config.js";
import { buildTranscriptionPrompt } from "./utils/context.js";
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
import { createFileOutputService } from "./services/file-output.js";
import { createLastTranscriptionService } from "./services/last-transcription.js";
import { startServer } from "./server.js";
import type { AppState, Config, OutputMode } from "./types.js";

const program = new Command();

program
  .name("voice-to-text")
  .description("Capture voice input and convert to AI-ready formatted text")
  .version("1.0.0");

// Listen subcommand — hotkey-driven voice recording (original default behavior)
program
  .command("listen")
  .description("Listen for hotkeys and record voice input")
  .option("--config <path>", "Path to configuration file")
  .option("--hotkey <key>", "Global hotkey to toggle recording")
  .option("--context-file <path>", "Path to context file for Claude cleanup")
  .option(
    "--vocabulary-file <path>",
    "Path to vocabulary file for transcription hints",
  )
  .option(
    "--instructions-file <path>",
    "Path to instructions file for Claude cleanup",
  )
  .option("--claude-model <model>", "Claude model for cleanup step")
  .option("--file-hotkey <key>", "Hotkey to start file-mode recording")
  .option("--output-file <path>", "Path to file for file-mode output")
  .option("--clear-output", "Clear the output file on startup")
  .option("--no-auto-insert", "Disable auto-insert at cursor")
  .option("--no-beep", "Disable audio feedback")
  .option("--no-notification", "Disable desktop notifications")
  .option("--no-terminal-output", "Disable terminal output")
  .option("--verbose", "Enable verbose debug logging")
  .option(
    "--max-duration <seconds>",
    "Maximum recording duration in seconds",
    parseInt,
  )
  .action(listenAction);

// Serve subcommand — HTTP server mode
program
  .command("serve")
  .description("Start the Voice2Text HTTP server")
  .option("-p, --port <port>", "Server port", parseInt, 7880)
  .option("--host <host>", "Server host", "127.0.0.1")
  .option("--verbose", "Enable verbose logging")
  .action((opts) => {
    startServer(
      { port: opts.port, host: opts.host },
      opts.verbose === true,
    );
  });

program.parse();

async function listenAction(opts: Record<string, unknown>) {
  // Validate environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }

  // Load configuration: global -> local voice.json -> --config file -> CLI args
  const verbose = opts.verbose === true;

  const cliOpts: Partial<Config> = {};
  if (opts.hotkey !== undefined) cliOpts.hotkey = opts.hotkey as string;
  if (opts.fileHotkey !== undefined) cliOpts.fileHotkey = opts.fileHotkey as string;
  if (opts.contextFile !== undefined) cliOpts.contextFile = opts.contextFile as string;
  if (opts.vocabularyFile !== undefined) cliOpts.vocabularyFile = opts.vocabularyFile as string;
  if (opts.instructionsFile !== undefined)
    cliOpts.instructionsFile = opts.instructionsFile as string;
  if (opts.outputFile !== undefined) cliOpts.outputFile = opts.outputFile as string;
  if (opts.claudeModel !== undefined) cliOpts.claudeModel = opts.claudeModel as string;
  if (opts.autoInsert !== undefined) cliOpts.autoInsert = opts.autoInsert as boolean;
  if (opts.beep !== undefined) cliOpts.beepEnabled = opts.beep as boolean;
  if (opts.notification !== undefined)
    cliOpts.notificationEnabled = opts.notification as boolean;
  if (opts.terminalOutput !== undefined)
    cliOpts.terminalOutputEnabled = opts.terminalOutput as boolean;
  if (opts.maxDuration !== undefined)
    cliOpts.maxRecordingDuration = opts.maxDuration as number;

  const { config, loadedFrom } = resolveConfig({
    configPath: opts.config as string | undefined,
    cliOpts,
  });

  if (verbose) {
    config.terminalOutputEnabled = true;
  }

  // Validate hotkeys are different
  if (config.hotkey.toLowerCase() === config.fileHotkey.toLowerCase()) {
    console.error("Error: hotkey and fileHotkey must be different");
    process.exit(1);
  }

  // Determine output file path (config value or default)
  const outputFilePath =
    config.resolvedOutputFile ?? join(process.cwd(), "voice-output.md");

  // Initialize state
  const state: AppState = {
    status: "idle",
    recordingStartTime: null,
    audioFilePath: null,
    outputMode: null,
  };

  // Create services
  const feedback = createFeedbackService(config, verbose);
  const fileOutput = createFileOutputService(outputFilePath);
  const lastTranscription = createLastTranscriptionService();

  // Handle --clear-output
  if (opts.clearOutput) {
    fileOutput.clear();
    feedback.log(`Output file cleared: ${outputFilePath}`);
  }

  // Verbose: log config resolution
  for (const source of loadedFrom) {
    feedback.verboseLog(
      `Config [${source.layer}]`,
      `${source.path} (${source.found ? "loaded" : "not found"})`,
    );
  }
  const {
    contextFiles,
    vocabularyFiles,
    instructionsFiles,
    resolvedOutputFile,
    ...configValues
  } = config;
  feedback.verboseLog("Resolved config", JSON.stringify(configValues, null, 2));
  feedback.verboseLog("Output file", outputFilePath);
  if (contextFiles.length > 0) {
    const lines = contextFiles
      .map((f) => `  [${f.source}] ${f.path}`)
      .join("\n");
    feedback.verboseLog(`Context files (${contextFiles.length})`, lines);
  } else {
    feedback.verboseLog("Context files", "none");
  }
  if (vocabularyFiles.length > 0) {
    const lines = vocabularyFiles
      .map((f) => `  [${f.source}] ${f.path}`)
      .join("\n");
    feedback.verboseLog(`Vocabulary files (${vocabularyFiles.length})`, lines);
  } else {
    feedback.verboseLog("Vocabulary files", "none");
  }
  if (instructionsFiles.length > 0) {
    const lines = instructionsFiles
      .map((f) => `  [${f.source}] ${f.path}`)
      .join("\n");
    feedback.verboseLog(
      `Instructions files (${instructionsFiles.length})`,
      lines,
    );
  } else {
    feedback.verboseLog("Instructions files", "none");
  }
  const recorder = createAudioRecorder();
  const transcriber = createTranscriber(apiKey);
  const cleanupService = createCleanupService(config.claudeModel, verbose);
  const cursorInsert = config.autoInsert ? createCursorInsertService() : null;

  // Max recording duration timer
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

  async function handleHotkey(triggeredKey: string) {
    if (state.status === "idle") {
      // Determine output mode from which hotkey was pressed
      const mode: OutputMode =
        triggeredKey.toLowerCase() === config.fileHotkey.toLowerCase()
          ? "file"
          : "clipboard";
      state.outputMode = mode;

      // Start recording
      state.status = "recording";
      state.recordingStartTime = Date.now();

      feedback.playStartBeep();
      feedback.showNotification(
        "Voice to Text",
        `Recording started (${mode} mode)`,
      );
      feedback.log(`Recording (${mode} mode)...`);
      feedback.verboseLog("Hotkey pressed", `${triggeredKey} → ${mode} mode`);

      recorder.start();

      // Set max duration timer
      maxDurationTimer = setTimeout(() => {
        if (state.status === "recording") {
          feedback.log(
            `Max recording duration (${config.maxRecordingDuration}s) reached`,
          );
          handleHotkey(triggeredKey);
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
        const transcriptionPrompt = buildTranscriptionPrompt(
          config.vocabularyFiles,
        );
        feedback.verboseLog("Transcription prompt", transcriptionPrompt);
        const transcription = await transcriber.transcribe(
          audioFilePath,
          transcriptionPrompt,
        );
        if (verbose) {
          feedback.verboseLog("Transcription result", transcription);
        } else {
          const preview = transcription.slice(0, 50);
          feedback.log(
            `Transcribed: ${preview}${transcription.length > 50 ? "..." : ""}`,
          );
        }

        // Cleanup — file mode injects prior output as context
        let priorOutput: string | undefined;
        if (state.outputMode === "file") {
          const content = fileOutput.readTailContent(8000);
          if (content) {
            priorOutput = content;
            feedback.verboseLog(
              "Prior output",
              `${content.length} chars from ${fileOutput.filePath}`,
            );
          }
        }

        const { text: cleanedText, prompt: cleanupPrompt } =
          await cleanupService.cleanup(
            transcription,
            config.contextFiles,
            config.vocabularyFiles,
            config.instructionsFiles,
            priorOutput,
          );
        feedback.verboseLog("Cleanup prompt", cleanupPrompt);
        if (verbose) {
          feedback.verboseLog("Cleanup result", cleanedText);
        } else {
          const cleanPreview = cleanedText.slice(0, 50);
          feedback.log(
            `Cleaned: ${cleanPreview}${cleanedText.length > 50 ? "..." : ""}`,
          );
        }

        // Route output based on mode
        if (state.outputMode === "file") {
          fileOutput.appendText(cleanedText);
          feedback.log(`Text appended to ${fileOutput.filePath}`);
          feedback.showNotification(
            "Voice to Text",
            `Appended to ${fileOutput.filePath}`,
          );
        } else {
          await copyToClipboard(cleanedText);
          feedback.log("Text copied to clipboard.");

          if (cursorInsert) {
            await cursorInsert.insertAtCursor(cleanedText);
            feedback.log("Text inserted at cursor.");
          }

          feedback.showNotification("Voice to Text", "Done!");
        }

        // Always save last transcription (both modes)
        lastTranscription.save(cleanedText, state.outputMode ?? "clipboard");
        feedback.verboseLog(
          "Last transcription saved",
          state.outputMode ?? "clipboard",
        );

        await feedback.playReadyBeep();
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
        state.outputMode = null;
      }
    } else if (state.status === "processing") {
      feedback.log("Still processing, please wait...");
    }
  }

  // Setup hotkey listener with both keys
  const hotkeyListener = await createHotkeyListener(
    [config.hotkey, config.fileHotkey],
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
      `Voice-to-text ready. ${config.hotkey}: clipboard, ${config.fileHotkey}: file mode. Output: ${outputFilePath}`,
    );
  } else {
    feedback.log(
      `Voice-to-text ready. Enter/Space: clipboard, F: file mode. (Ctrl+C to exit)`,
    );
  }
}

