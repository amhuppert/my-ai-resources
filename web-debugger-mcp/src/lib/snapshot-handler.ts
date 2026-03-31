import crypto from "node:crypto";
import { getProvider } from "./provider-registry.js";
import { writeSnapshot } from "./file-writer.js";
import { WebDebuggerError } from "./errors.js";
import type { SnapshotRequestMessage } from "../schemas/messages.js";

const DEFAULT_TIMEOUT_MS = 10_000;

interface PendingRequest {
  providerName: string;
  outputDir: string;
  resolve: (filePath: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pendingRequests = new Map<string, PendingRequest>();

export async function requestSnapshot(
  providerName: string,
  outputDir: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const provider = getProvider(providerName);
  if (!provider) {
    throw new WebDebuggerError(
      "provider_not_found",
      `Provider '${providerName}' not found`,
    );
  }

  const requestId = crypto.randomUUID();
  const message: SnapshotRequestMessage = {
    type: "snapshot_request",
    requestId,
    name: providerName,
  };

  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(
        new WebDebuggerError(
          "snapshot_timeout",
          `Snapshot timed out for provider '${providerName}'`,
        ),
      );
    }, timeoutMs);

    pendingRequests.set(requestId, {
      providerName,
      outputDir,
      resolve,
      reject,
      timer,
    });

    provider.ws.send(JSON.stringify(message));
  });
}

export function handleSnapshotResponse(response: {
  type: "snapshot_response";
  requestId: string;
  name: string;
  data: unknown;
  error?: string;
}): void {
  const pending = pendingRequests.get(response.requestId);
  if (!pending) return;

  clearTimeout(pending.timer);
  pendingRequests.delete(response.requestId);

  if (response.error) {
    pending.reject(new WebDebuggerError("snapshot_error", response.error));
    return;
  }

  writeSnapshot(pending.outputDir, pending.providerName, response.data)
    .then(pending.resolve)
    .catch(pending.reject);
}

export function resetPendingRequests(): void {
  for (const [, pending] of pendingRequests) {
    clearTimeout(pending.timer);
  }
  pendingRequests.clear();
}
