import { appendFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  context?: Record<string, unknown>;
}

export async function appendLogEntry(logFile: string, entry: LogEntry): Promise<void> {
  await mkdir(path.dirname(logFile), { recursive: true });
  const line = JSON.stringify(entry) + "\n";
  await appendFile(logFile, line);
}

function generateTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const suffix = crypto.randomBytes(2).toString("hex");
  return `${date}-${time}-${suffix}`;
}

function sanitizeProviderName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function writeSnapshot(
  outputDir: string,
  providerName: string,
  data: unknown,
): Promise<string> {
  const snapshotsDir = path.join(outputDir, "snapshots");
  await mkdir(snapshotsDir, { recursive: true });
  const safeName = sanitizeProviderName(providerName);
  const filename = `${safeName}-${generateTimestamp()}.json`;
  const filePath = path.join(snapshotsDir, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}
