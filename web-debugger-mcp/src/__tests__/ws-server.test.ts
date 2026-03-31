import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { startWsServer, stopWsServer } from "../lib/ws-server.js";
import { getCurrentSession, resetSession } from "../lib/session.js";
import { resetRegistry, listProviders } from "../lib/provider-registry.js";
import { resetPendingRequests } from "../lib/snapshot-handler.js";

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    ws.addEventListener("open", () => resolve());
    ws.addEventListener("error", reject);
  });
}

function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    ws.addEventListener("message", (event) => {
      resolve(typeof event.data === "string" ? event.data : "");
    }, { once: true });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("ws-server", () => {
  let tmpDir: string;
  let port: number;
  const connections: WebSocket[] = [];

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "web-debugger-ws-"));
    resetSession();
    resetRegistry();
    resetPendingRequests();
    port = 17600 + Math.floor(Math.random() * 1000);
  });

  afterEach(async () => {
    for (const ws of connections) {
      ws.close();
    }
    connections.length = 0;
    stopWsServer();
    resetPendingRequests();
    await rm(tmpDir, { recursive: true, force: true });
  });

  function connect(): WebSocket {
    const ws = new WebSocket(`ws://localhost:${port}`);
    connections.push(ws);
    return ws;
  }

  it("starts and accepts WebSocket connections", async () => {
    startWsServer(port, tmpDir);
    const ws = connect();
    await waitForOpen(ws);
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it("creates a session on server source connect", async () => {
    startWsServer(port, tmpDir);
    expect(getCurrentSession()).toBeNull();

    const ws = connect();
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "connect", source: "server" }));
    await delay(50);

    const session = getCurrentSession();
    expect(session).not.toBeNull();
    expect(session!.logFile).toContain("session-");
  });

  it("creates a session on browser connect when no session exists", async () => {
    startWsServer(port, tmpDir);
    const ws = connect();
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "connect", source: "browser" }));
    await delay(50);

    expect(getCurrentSession()).not.toBeNull();
  });

  it("writes log entries to session log file", async () => {
    startWsServer(port, tmpDir);
    const ws = connect();
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "connect", source: "server" }));
    await delay(50);

    ws.send(JSON.stringify({
      type: "log",
      level: "info",
      message: "Test log message",
      timestamp: "2026-03-30T14:30:00.000Z",
    }));
    await delay(50);

    const session = getCurrentSession()!;
    const content = await readFile(session.logFile, "utf-8");
    const entry = JSON.parse(content.trim());
    expect(entry.message).toBe("Test log message");
    expect(entry.source).toBe("server");
  });

  it("registers providers from register_provider messages", async () => {
    startWsServer(port, tmpDir);
    const ws = connect();
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "connect", source: "browser" }));
    await delay(50);

    ws.send(JSON.stringify({ type: "register_provider", name: "react-query" }));
    await delay(50);

    const providers = listProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0]).toEqual({ name: "react-query", source: "browser" });
  });

  it("handles snapshot request/response round-trip", async () => {
    startWsServer(port, tmpDir);

    // Connect client and register provider
    const ws = connect();
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "connect", source: "server" }));
    await delay(50);
    ws.send(JSON.stringify({ type: "register_provider", name: "auth-state" }));
    await delay(50);

    // Set up listener for snapshot_request
    const requestPromise = waitForMessage(ws);

    // Import requestSnapshot to trigger from server side
    const { requestSnapshot } = await import("../lib/snapshot-handler.js");
    const snapshotPromise = requestSnapshot("auth-state", tmpDir);

    // Client receives request and sends response
    const requestMsg = JSON.parse(await requestPromise);
    expect(requestMsg.type).toBe("snapshot_request");

    ws.send(JSON.stringify({
      type: "snapshot_response",
      requestId: requestMsg.requestId,
      name: "auth-state",
      data: { user: "alice", role: "admin" },
    }));

    const filePath = await snapshotPromise;
    const content = JSON.parse(await readFile(filePath, "utf-8"));
    expect(content).toEqual({ user: "alice", role: "admin" });
  });

  it("removes providers when connection closes", async () => {
    startWsServer(port, tmpDir);
    const ws = connect();
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "connect", source: "browser" }));
    await delay(50);
    ws.send(JSON.stringify({ type: "register_provider", name: "my-provider" }));
    await delay(50);

    expect(listProviders()).toHaveLength(1);

    ws.close();
    await delay(50);

    expect(listProviders()).toHaveLength(0);
  });

  it("ignores invalid messages without crashing", async () => {
    startWsServer(port, tmpDir);
    const ws = connect();
    await waitForOpen(ws);
    ws.send(JSON.stringify({ type: "connect", source: "server" }));
    await delay(50);

    ws.send("not valid json {{{");
    ws.send(JSON.stringify({ type: "unknown_type" }));
    await delay(50);

    // Server should still be running
    expect(getCurrentSession()).not.toBeNull();
  });

  it("rejects messages sent before connect handshake", async () => {
    startWsServer(port, tmpDir);
    const ws = connect();
    await waitForOpen(ws);

    // Send log and register_provider BEFORE connect
    ws.send(JSON.stringify({
      type: "log",
      level: "info",
      message: "premature log",
      timestamp: "2026-03-30T00:00:00Z",
    }));
    ws.send(JSON.stringify({ type: "register_provider", name: "premature-provider" }));
    await delay(50);

    // No session should have been created, no providers registered
    expect(getCurrentSession()).toBeNull();
    expect(listProviders()).toHaveLength(0);

    // Now send connect — this should work
    ws.send(JSON.stringify({ type: "connect", source: "server" }));
    await delay(50);
    expect(getCurrentSession()).not.toBeNull();

    // Now register_provider should work
    ws.send(JSON.stringify({ type: "register_provider", name: "valid-provider" }));
    await delay(50);
    expect(listProviders()).toHaveLength(1);
    expect(listProviders()[0].name).toBe("valid-provider");
  });
});
