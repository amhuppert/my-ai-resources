import type { ServerWebSocket } from "bun";
import { ClientMessageSchema, type Source } from "../schemas/messages.js";
import { createSession, getCurrentSession } from "./session.js";
import { appendLogEntry } from "./file-writer.js";
import {
  registerProvider,
  removeProvidersByConnection,
} from "./provider-registry.js";
import { handleSnapshotResponse } from "./snapshot-handler.js";

interface ConnectionData {
  source: Source | null;
}

let server: ReturnType<typeof Bun.serve<ConnectionData>> | null = null;

const connectionMap = new Map<ServerWebSocket<ConnectionData>, WebSocketWrapper>();

class WebSocketWrapper {
  constructor(private serverWs: ServerWebSocket<ConnectionData>) {}

  send(data: string): void {
    this.serverWs.send(data);
  }

  get readyState(): number {
    return this.serverWs.readyState;
  }
}

export function startWsServer(port: number, outputDir: string): void {
  server = Bun.serve<ConnectionData>({
    port,
    fetch(req, server) {
      const upgraded = server.upgrade(req, {
        data: { source: null },
      });
      if (!upgraded) {
        return new Response("Expected WebSocket", { status: 426 });
      }
      return undefined;
    },
    websocket: {
      open(ws) {
        const wrapper = new WebSocketWrapper(ws);
        connectionMap.set(ws, wrapper);
      },

      message(ws, messageRaw) {
        const wrapper = connectionMap.get(ws);
        if (!wrapper) return;

        let parsed: unknown;
        try {
          parsed = JSON.parse(typeof messageRaw === "string" ? messageRaw : messageRaw.toString());
        } catch {
          console.error("[web-debugger] Invalid JSON received, ignoring");
          return;
        }

        const result = ClientMessageSchema.safeParse(parsed);
        if (!result.success) {
          console.error("[web-debugger] Invalid message schema, ignoring");
          return;
        }

        const msg = result.data;

        // Enforce connect-first protocol: reject all messages until connect is received
        if (msg.type !== "connect" && ws.data.source === null) {
          console.error("[web-debugger] Message received before connect handshake, ignoring");
          return;
        }

        switch (msg.type) {
          case "connect": {
            ws.data.source = msg.source;
            if (msg.source === "server") {
              createSession(outputDir);
            } else if (!getCurrentSession()) {
              createSession(outputDir);
            }
            break;
          }

          case "log": {
            const session = getCurrentSession();
            if (!session) {
              console.error("[web-debugger] Log received but no active session");
              return;
            }
            appendLogEntry(session.logFile, {
              timestamp: msg.timestamp,
              level: msg.level,
              source: ws.data.source!,
              message: msg.message,
              context: msg.context as Record<string, unknown> | undefined,
            }).catch((err) => {
              console.error("[web-debugger] Failed to write log entry:", err);
            });
            break;
          }

          case "register_provider": {
            registerProvider(
              msg.name,
              ws.data.source!,
              wrapper,
            );
            break;
          }

          case "snapshot_response": {
            handleSnapshotResponse({
              type: msg.type,
              requestId: msg.requestId,
              name: msg.name,
              data: msg.data,
              error: msg.error,
            });
            break;
          }
        }
      },

      close(ws) {
        const wrapper = connectionMap.get(ws);
        if (wrapper) {
          removeProvidersByConnection(wrapper);
          connectionMap.delete(ws);
        }
      },
    },
  });

  console.error(`[web-debugger] WebSocket server listening on port ${port}`);
}

export function stopWsServer(): void {
  if (server) {
    server.stop(true);
    server = null;
  }
  connectionMap.clear();
}
