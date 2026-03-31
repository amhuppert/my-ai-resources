import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { createTransport, type Transport } from "../transport.js";

// Minimal Bun WebSocket server for testing
function startTestServer(port: number): {
  server: ReturnType<typeof Bun.serve>;
  receivedMessages: string[];
  sendToClient: (data: string) => void;
} {
  const receivedMessages: string[] = [];
  let clientWs: unknown = null;

  const server = Bun.serve({
    port,
    fetch(req, server) {
      server.upgrade(req);
      return undefined;
    },
    websocket: {
      open(ws) {
        clientWs = ws;
      },
      message(_ws, msg) {
        receivedMessages.push(typeof msg === "string" ? msg : msg.toString());
      },
    },
  });

  return {
    server,
    receivedMessages,
    sendToClient(data: string) {
      if (clientWs) (clientWs as { send(d: string): void }).send(data);
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("transport", () => {
  let port: number;
  let testServer: ReturnType<typeof startTestServer> | null = null;
  let transport: Transport | null = null;

  beforeEach(() => {
    port = 18600 + Math.floor(Math.random() * 1000);
  });

  afterEach(() => {
    transport?.dispose();
    transport = null;
    testServer?.server.stop(true);
    testServer = null;
  });

  it("connects and sends connect message on open", async () => {
    testServer = startTestServer(port);
    transport = createTransport({ port, source: "server" });
    transport.connect();
    await delay(100);

    expect(testServer.receivedMessages).toHaveLength(1);
    const msg = JSON.parse(testServer.receivedMessages[0]);
    expect(msg).toEqual({ type: "connect", source: "server" });
  });

  it("sends messages when connected", async () => {
    testServer = startTestServer(port);
    transport = createTransport({ port, source: "browser" });
    transport.connect();
    await delay(100);

    transport.send({ type: "log", level: "info", message: "test", timestamp: "now" });
    await delay(50);

    expect(testServer.receivedMessages).toHaveLength(2); // connect + log
    const logMsg = JSON.parse(testServer.receivedMessages[1]);
    expect(logMsg.type).toBe("log");
    expect(logMsg.message).toBe("test");
  });

  it("silently drops messages when not connected", () => {
    transport = createTransport({ port: 19999, source: "server" });
    // Don't connect — just try to send
    transport.send({ type: "log", level: "info", message: "dropped", timestamp: "now" });
    // Should not throw
  });

  it("receives messages via onMessage handler", async () => {
    testServer = startTestServer(port);
    transport = createTransport({ port, source: "server" });

    const received: unknown[] = [];
    transport.onMessage((msg) => received.push(msg));

    transport.connect();
    await delay(100);

    testServer.sendToClient(JSON.stringify({
      type: "snapshot_request",
      requestId: "abc",
      name: "auth",
    }));
    await delay(50);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      type: "snapshot_request",
      requestId: "abc",
      name: "auth",
    });
  });

  it("dispose closes the connection", async () => {
    testServer = startTestServer(port);
    transport = createTransport({ port, source: "server" });
    transport.connect();
    await delay(100);

    transport.dispose();
    await delay(50);

    // After dispose, send should not throw
    transport.send({ type: "log", level: "info", message: "after-dispose", timestamp: "now" });
  });

  it("silently degrades when server is not running", async () => {
    transport = createTransport({ port: 19998, source: "server" });
    transport.connect();
    await delay(200);

    // Should not throw, just be disconnected
    transport.send({ type: "log", level: "info", message: "noop", timestamp: "now" });
  });

  it("calls onOpen with isReconnect=false on first connect, true on reconnect", async () => {
    testServer = startTestServer(port);
    transport = createTransport({ port, source: "server" });

    const openCalls: boolean[] = [];
    transport.onOpen((isReconnect) => openCalls.push(isReconnect));

    transport.connect();
    await delay(100);

    expect(openCalls).toEqual([false]);

    // Force disconnect by stopping server, then restart it
    testServer.server.stop(true);
    await delay(100);

    testServer = startTestServer(port);
    // Wait for reconnect (1s delay + connection time)
    await delay(1500);

    expect(openCalls).toEqual([false, true]);
  });

  it("clears reconnect timers on dispose", async () => {
    testServer = startTestServer(port);
    transport = createTransport({ port, source: "server" });
    transport.connect();
    await delay(100);

    // Force disconnect
    testServer.server.stop(true);
    testServer = null;
    await delay(50);

    // Dispose while reconnect timer is pending
    transport.dispose();

    // Start server again — transport should NOT reconnect
    testServer = startTestServer(port);
    await delay(2000);

    // No messages should have been received
    expect(testServer.receivedMessages).toHaveLength(0);
  });
});
