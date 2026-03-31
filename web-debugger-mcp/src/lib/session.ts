import path from "node:path";
import crypto from "node:crypto";

export interface Session {
  id: string;
  logFile: string;
  startedAt: string;
}

let currentSession: Session | null = null;

function generateSessionId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const suffix = crypto.randomBytes(2).toString("hex");
  return `${date}-${time}-${suffix}`;
}

export function createSession(outputDir: string): Session {
  const id = generateSessionId();
  currentSession = {
    id,
    logFile: path.join(outputDir, "logs", `session-${id}.jsonl`),
    startedAt: new Date().toISOString(),
  };
  return currentSession;
}

export function getCurrentSession(): Session | null {
  return currentSession;
}

export function resetSession(): void {
  currentSession = null;
}

export function getOutputDir(): string {
  return path.resolve(process.env.WEB_DEBUGGER_DIR ?? ".web-debugger");
}
