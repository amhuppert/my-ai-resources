import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { createDebugger, type WebDebugger } from "../index.js";

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

describe("createDebugger", () => {
  let port: number;
  let testServer: ReturnType<typeof startTestServer> | null = null;
  let debuggerInstance: WebDebugger | null = null;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    port = 18700 + Math.floor(Math.random() * 1000);
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    debuggerInstance?.dispose();
    debuggerInstance = null;
    testServer?.server.stop(true);
    testServer = null;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("production safety", () => {
    it("returns no-op implementation when NODE_ENV is not development", () => {
      process.env.NODE_ENV = "production";
      debuggerInstance = createDebugger({ port, source: "server" });

      // All methods should be callable without error
      debuggerInstance.log("info", "should be ignored");
      debuggerInstance.registerProvider("test", () => ({ data: 1 }));
      debuggerInstance.dispose();
    });

    it("returns active debugger when NODE_ENV is undefined (not explicitly production)", async () => {
      delete process.env.NODE_ENV;
      testServer = startTestServer(port);
      debuggerInstance = createDebugger({ port, source: "server" });
      await delay(100);

      // With NODE_ENV unset, the debugger should be active (not no-op)
      expect(testServer.receivedMessages.length).toBeGreaterThanOrEqual(1);
      const connectMsg = JSON.parse(testServer.receivedMessages[0]);
      expect(connectMsg.type).toBe("connect");
    });
  });

  describe("source auto-detection", () => {
    it("detects server source when window is not defined", async () => {
      testServer = startTestServer(port);
      debuggerInstance = createDebugger({ port });
      await delay(100);

      const connectMsg = JSON.parse(testServer.receivedMessages[0]);
      expect(connectMsg.source).toBe("server");
    });
  });

  describe("logging", () => {
    it("sends log messages via transport with serialized context", async () => {
      testServer = startTestServer(port);
      debuggerInstance = createDebugger({ port, source: "server" });
      await delay(100);

      debuggerInstance.log("warn", "Something happened", {
        items: new Set([1, 2]),
      });
      await delay(50);

      // connect + log = 2 messages
      expect(testServer.receivedMessages.length).toBeGreaterThanOrEqual(2);
      const logMsg = JSON.parse(testServer.receivedMessages[1]);
      expect(logMsg.type).toBe("log");
      expect(logMsg.level).toBe("warn");
      expect(logMsg.message).toBe("Something happened");
      expect(logMsg.context.items).toEqual({
        __type: "Set",
        values: [1, 2],
      });
      expect(typeof logMsg.timestamp).toBe("string");
    });
  });

  describe("provider registration", () => {
    it("sends register_provider message", async () => {
      testServer = startTestServer(port);
      debuggerInstance = createDebugger({ port, source: "browser" });
      await delay(100);

      debuggerInstance.registerProvider("react-query", () => ({
        queries: [],
      }));
      await delay(50);

      const registerMsg = JSON.parse(testServer.receivedMessages[1]);
      expect(registerMsg).toEqual({
        type: "register_provider",
        name: "react-query",
      });
    });
  });

  describe("snapshot handling", () => {
    it("responds to snapshot requests by calling provider callback", async () => {
      testServer = startTestServer(port);
      debuggerInstance = createDebugger({ port, source: "server" });
      await delay(100);

      debuggerInstance.registerProvider("auth", () => ({
        user: "alice",
        roles: new Set(["admin"]),
      }));
      await delay(50);

      // Server sends snapshot_request to the client
      testServer.sendToClient(
        JSON.stringify({
          type: "snapshot_request",
          requestId: "req-1",
          name: "auth",
        }),
      );
      await delay(100);

      // Client should have sent back a snapshot_response
      const responseMsg = testServer.receivedMessages.find((m) => {
        const parsed = JSON.parse(m);
        return parsed.type === "snapshot_response";
      });
      expect(responseMsg).toBeDefined();

      const response = JSON.parse(responseMsg!);
      expect(response.requestId).toBe("req-1");
      expect(response.name).toBe("auth");
      expect(response.data).toEqual({
        user: "alice",
        roles: { __type: "Set", values: ["admin"] },
      });
    });

    it("handles async provider callbacks", async () => {
      testServer = startTestServer(port);
      debuggerInstance = createDebugger({ port, source: "server" });
      await delay(100);

      debuggerInstance.registerProvider("async-state", async () => {
        await delay(10);
        return { loaded: true };
      });
      await delay(50);

      testServer.sendToClient(
        JSON.stringify({
          type: "snapshot_request",
          requestId: "req-2",
          name: "async-state",
        }),
      );
      await delay(150);

      const responseMsg = testServer.receivedMessages.find((m) => {
        const parsed = JSON.parse(m);
        return parsed.type === "snapshot_response";
      });
      expect(responseMsg).toBeDefined();
      const response = JSON.parse(responseMsg!);
      expect(response.data).toEqual({ loaded: true });
      expect(response.error).toBeUndefined();
    });

    it("sends error response when provider throws", async () => {
      testServer = startTestServer(port);
      debuggerInstance = createDebugger({ port, source: "server" });
      await delay(100);

      debuggerInstance.registerProvider("broken", () => {
        throw new Error("Provider crashed");
      });
      await delay(50);

      testServer.sendToClient(
        JSON.stringify({
          type: "snapshot_request",
          requestId: "req-3",
          name: "broken",
        }),
      );
      await delay(100);

      const responseMsg = testServer.receivedMessages.find((m) => {
        const parsed = JSON.parse(m);
        return parsed.type === "snapshot_response";
      });
      expect(responseMsg).toBeDefined();
      const response = JSON.parse(responseMsg!);
      expect(response.requestId).toBe("req-3");
      expect(response.error).toBe("Provider crashed");
    });
  });

  describe("reconnect", () => {
    it("re-registers providers after WebSocket reconnect", async () => {
      testServer = startTestServer(port);
      debuggerInstance = createDebugger({ port, source: "server" });
      await delay(100);

      debuggerInstance.registerProvider("my-state", () => ({ ok: true }));
      await delay(50);

      // Verify initial registration
      const initialRegister = testServer.receivedMessages.find((m) =>
        JSON.parse(m).type === "register_provider",
      );
      expect(initialRegister).toBeDefined();

      // Force disconnect and restart server
      testServer.server.stop(true);
      testServer = null;
      await delay(100);

      testServer = startTestServer(port);
      // Wait for reconnect (1s delay + connection)
      await delay(1500);

      // After reconnect, expect connect + re-register_provider
      const messages = testServer.receivedMessages.map((m) => JSON.parse(m));
      const connectMsg = messages.find((m: Record<string, unknown>) => m.type === "connect");
      const reRegisterMsg = messages.find((m: Record<string, unknown>) => m.type === "register_provider");
      expect(connectMsg).toBeDefined();
      expect(reRegisterMsg).toBeDefined();
      expect((reRegisterMsg as Record<string, unknown>).name).toBe("my-state");
    });
  });

  describe("exception safety", () => {
    it("log never throws even if transport is broken", () => {
      debuggerInstance = createDebugger({ port: 19997, source: "server" });
      // Should not throw
      debuggerInstance.log("info", "safe message");
      debuggerInstance.log("error", "another safe message", { key: "value" });
    });

    it("registerProvider never throws", () => {
      debuggerInstance = createDebugger({ port: 19997, source: "server" });
      debuggerInstance.registerProvider("test", () => ({}));
    });
  });
});
