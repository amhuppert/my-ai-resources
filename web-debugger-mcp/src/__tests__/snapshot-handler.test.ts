import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  requestSnapshot,
  handleSnapshotResponse,
  resetPendingRequests,
} from "../lib/snapshot-handler.js";
import {
  registerProvider,
  resetRegistry,
  type MessageSender,
} from "../lib/provider-registry.js";

function createFakeWs(): MessageSender & { sentMessages: string[] } {
  const sentMessages: string[] = [];
  return {
    sentMessages,
    send(data: string) {
      sentMessages.push(data);
    },
  };
}

describe("snapshot-handler", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "web-debugger-snap-"));
    resetRegistry();
    resetPendingRequests();
  });

  afterEach(async () => {
    resetPendingRequests();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("sends a snapshot_request message to the provider's WebSocket", async () => {
    const ws = createFakeWs();
    registerProvider("auth-state", "server", ws);

    const snapshotPromise = requestSnapshot("auth-state", tmpDir);

    // Verify the request was sent
    expect(ws.sentMessages).toHaveLength(1);
    const request = JSON.parse(ws.sentMessages[0]);
    expect(request.type).toBe("snapshot_request");
    expect(request.name).toBe("auth-state");
    expect(typeof request.requestId).toBe("string");

    // Simulate the response
    handleSnapshotResponse({
      type: "snapshot_response",
      requestId: request.requestId,
      name: "auth-state",
      data: { user: "alice" },
    });

    const filePath = await snapshotPromise;
    expect(path.isAbsolute(filePath)).toBe(true);
    const content = JSON.parse(await readFile(filePath, "utf-8"));
    expect(content).toEqual({ user: "alice" });
  });

  it("rejects with provider_not_found for unknown provider", async () => {
    await expect(requestSnapshot("nonexistent", tmpDir)).rejects.toThrow(
      "Provider 'nonexistent' not found",
    );
  });

  it("rejects with snapshot_error when response contains error", async () => {
    const ws = createFakeWs();
    registerProvider("broken", "browser", ws);

    const snapshotPromise = requestSnapshot("broken", tmpDir);
    const request = JSON.parse(ws.sentMessages[0]);

    handleSnapshotResponse({
      type: "snapshot_response",
      requestId: request.requestId,
      name: "broken",
      data: null,
      error: "Provider threw: Cannot read property 'x' of null",
    });

    await expect(snapshotPromise).rejects.toThrow(
      "Provider threw: Cannot read property 'x' of null",
    );
  });

  it("rejects with snapshot_timeout after timeout period", async () => {
    const ws = createFakeWs();
    registerProvider("slow", "server", ws);

    // Use a very short timeout for testing
    const snapshotPromise = requestSnapshot("slow", tmpDir, 50);

    await expect(snapshotPromise).rejects.toThrow(
      "Snapshot timed out for provider 'slow'",
    );
  });

  it("ignores responses for unknown request IDs", () => {
    // Should not throw
    handleSnapshotResponse({
      type: "snapshot_response",
      requestId: "unknown-id",
      name: "test",
      data: {},
    });
  });
});
