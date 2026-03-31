import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getLogs } from "../tools/get-logs.js";
import { getSnapshotTool } from "../tools/get-snapshot.js";
import { listProvidersTool } from "../tools/list-providers.js";
import { createSession, resetSession } from "../lib/session.js";
import {
  registerProvider,
  resetRegistry,
  type MessageSender,
} from "../lib/provider-registry.js";
import { handleSnapshotResponse, resetPendingRequests } from "../lib/snapshot-handler.js";

function fakeWs(): MessageSender & { sentMessages: string[] } {
  const sentMessages: string[] = [];
  return {
    sentMessages,
    send(data: string) {
      sentMessages.push(data);
    },
  };
}

describe("MCP tool handlers", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "web-debugger-tools-"));
    resetSession();
    resetRegistry();
    resetPendingRequests();
  });

  afterEach(async () => {
    resetPendingRequests();
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("get_logs", () => {
    it("returns log file path when session is active", () => {
      const session = createSession(tmpDir);
      const result = getLogs();
      expect(result).toEqual({ logFile: session.logFile });
    });

    it("returns error when no session is active", () => {
      const result = getLogs();
      expect(result).toEqual({
        error: { type: "no_session", message: "No active session. Is the web app running?" },
      });
    });
  });

  describe("get_snapshot", () => {
    it("returns snapshot file path on success", async () => {
      const ws = fakeWs();
      registerProvider("auth", "server", ws);

      const resultPromise = getSnapshotTool("auth", tmpDir);

      const request = JSON.parse(ws.sentMessages[0]);
      handleSnapshotResponse({
        type: "snapshot_response",
        requestId: request.requestId,
        name: "auth",
        data: { user: "alice" },
      });

      const result = await resultPromise;
      expect(result).toHaveProperty("snapshotFile");
      expect(result).toHaveProperty("provider", "auth");
    });

    it("returns error for unknown provider", async () => {
      const result = await getSnapshotTool("nonexistent", tmpDir);
      expect(result).toEqual({
        error: {
          type: "provider_not_found",
          message: "Provider 'nonexistent' not found",
        },
      });
    });
  });

  describe("list_providers", () => {
    it("returns empty array when no providers registered", () => {
      const result = listProvidersTool();
      expect(result).toEqual({ providers: [] });
    });

    it("returns all registered providers", () => {
      const ws = fakeWs();
      registerProvider("react-query", "browser", ws);
      registerProvider("auth-state", "server", ws);

      const result = listProvidersTool();
      expect(result.providers).toHaveLength(2);
      expect(result.providers).toContainEqual({
        name: "react-query",
        source: "browser",
      });
      expect(result.providers).toContainEqual({
        name: "auth-state",
        source: "server",
      });
    });
  });
});
