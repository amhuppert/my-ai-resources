import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveConfig } from "./utils/config.js";
import { readContextFilesContent } from "./utils/context.js";
import { createTranscriber } from "./services/transcriber.js";
import { createCleanupService } from "./services/cleanup.js";
import type {
  ServerConfig,
  TranscribeResponse,
  TranscribeErrorResponse,
  HealthResponse,
} from "./types.js";

const VERSION = "1.0.0";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

export function startServer(
  config: ServerConfig,
  verbose: boolean,
): ReturnType<typeof Bun.serve> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }

  const transcriber = createTranscriber(apiKey);
  const cleanupService = createCleanupService(undefined, verbose);

  const server = Bun.serve({
    port: config.port,
    hostname: config.host,

    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);

      // CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }

      // Health endpoint
      if (url.pathname === "/health" && request.method === "GET") {
        const response: HealthResponse = { status: "ok", version: VERSION };
        return jsonResponse(response);
      }

      // Transcribe endpoint
      if (url.pathname === "/transcribe" && request.method === "POST") {
        return handleTranscribe(request, transcriber, cleanupService, verbose);
      }

      // Unknown route
      return jsonResponse({ error: "Not found" } satisfies TranscribeErrorResponse, 404);
    },
  });

  console.log(`Voice2Text server listening on http://${config.host}:${config.port}`);
  return server;
}

async function handleTranscribe(
  request: Request,
  transcriber: ReturnType<typeof createTranscriber>,
  cleanupService: ReturnType<typeof createCleanupService>,
  verbose: boolean,
): Promise<Response> {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const projectPath = formData.get("projectPath");

    if (!audioFile || !(audioFile instanceof File)) {
      return jsonResponse(
        { error: "Missing audio file" } satisfies TranscribeErrorResponse,
        400,
      );
    }

    if (verbose) {
      console.log(`[server] Received audio: ${audioFile.name} (${audioFile.size} bytes)`);
      if (projectPath) console.log(`[server] Project path: ${projectPath}`);
    }

    // Write audio to temp file
    const ext = audioFile.name.includes(".")
      ? audioFile.name.slice(audioFile.name.lastIndexOf("."))
      : ".wav";
    const tempFileName = `v2t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    tempFilePath = join(tmpdir(), tempFileName);
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    writeFileSync(tempFilePath, audioBuffer);

    if (verbose) {
      console.log(`[server] Temp file: ${tempFilePath}`);
    }

    // Resolve config (project-scoped if projectPath provided)
    const projectDir = typeof projectPath === "string" ? projectPath : undefined;
    const { config } = resolveConfig({
      cliOpts: {},
      projectDir,
    });

    // Build transcription prompt from context files
    const transcriptionPrompt = readContextFilesContent(config.contextFiles);

    if (verbose) {
      console.log(`[server] Context files: ${config.contextFiles.length}`);
    }

    // Transcribe via OpenAI
    const startTime = Date.now();
    const transcription = await transcriber.transcribe(tempFilePath, transcriptionPrompt);

    if (verbose) {
      console.log(`[server] Transcription completed in ${Date.now() - startTime}ms`);
    }

    // Cleanup via Claude CLI (fallback to raw transcription on failure)
    let cleanedText: string;
    try {
      const cleanupStart = Date.now();
      const { text } = await cleanupService.cleanup(
        transcription,
        config.contextFiles,
        config.instructionsFiles,
      );
      cleanedText = text;
      if (verbose) {
        console.log(`[server] Cleanup completed in ${Date.now() - cleanupStart}ms`);
      }
    } catch {
      if (verbose) {
        console.log("[server] Cleanup failed, using raw transcription");
      }
      cleanedText = transcription;
    }

    const response: TranscribeResponse = { text: cleanedText };
    return jsonResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error(`[server] Transcription error: ${message}`);
    return jsonResponse(
      { error: message } satisfies TranscribeErrorResponse,
      500,
    );
  } finally {
    // Guaranteed temp file cleanup
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath);
        if (verbose) {
          console.log(`[server] Temp file cleaned up: ${tempFilePath}`);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
