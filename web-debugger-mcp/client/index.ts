import { createTransport, type Transport } from "./transport.js";
import { serialize } from "./serialization.js";

export interface DebuggerConfig {
  port?: number;
  source?: "browser" | "server";
}

export interface WebDebugger {
  log(
    level: "info" | "warn" | "error" | "debug",
    message: string,
    context?: Record<string, unknown>,
  ): void;
  registerProvider(
    name: string,
    getSnapshot: () => unknown | Promise<unknown>,
  ): void;
  dispose(): void;
}

const DEFAULT_PORT = 7600;

const noopDebugger: WebDebugger = {
  log() {},
  registerProvider() {},
  dispose() {},
};

function detectSource(): "browser" | "server" {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "browser";
  }
  return "server";
}

function isProduction(): boolean {
  try {
    // Only return true if NODE_ENV is explicitly set to a non-development value.
    // If process or NODE_ENV is unavailable (e.g. browser without bundler polyfill),
    // default to allowing the debugger — it degrades silently if the server isn't running.
    if (typeof process === "undefined" || !process.env?.NODE_ENV) return false;
    return process.env.NODE_ENV !== "development";
  } catch {
    return false;
  }
}

export function createDebugger(config?: DebuggerConfig): WebDebugger {
  if (isProduction()) return noopDebugger;

  const port = config?.port ?? DEFAULT_PORT;
  const source = config?.source ?? detectSource();
  const providers = new Map<string, () => unknown | Promise<unknown>>();

  let transport: Transport;
  try {
    transport = createTransport({ port, source });
    transport.onMessage((msg) => {
      try {
        handleMessage(msg);
      } catch {
        // Exception safety — never propagate
      }
    });
    transport.onOpen((isReconnect) => {
      if (isReconnect) {
        for (const name of providers.keys()) {
          transport.send({ type: "register_provider", name });
        }
      }
    });
    transport.connect();
  } catch {
    return noopDebugger;
  }

  function handleMessage(msg: unknown): void {
    if (
      typeof msg !== "object" ||
      msg === null ||
      !("type" in msg) ||
      (msg as Record<string, unknown>).type !== "snapshot_request"
    ) {
      return;
    }

    const request = msg as {
      type: "snapshot_request";
      requestId: string;
      name: string;
    };
    const provider = providers.get(request.name);
    if (!provider) return;

    Promise.resolve()
      .then(() => provider())
      .then((data) => {
        transport.send({
          type: "snapshot_response",
          requestId: request.requestId,
          name: request.name,
          data: serialize(data),
        });
      })
      .catch((err) => {
        transport.send({
          type: "snapshot_response",
          requestId: request.requestId,
          name: request.name,
          data: null,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  return {
    log(level, message, context) {
      try {
        transport.send({
          type: "log",
          level,
          message,
          context: context ? (serialize(context) as Record<string, unknown>) : undefined,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Exception safety
      }
    },

    registerProvider(name, getSnapshot) {
      try {
        providers.set(name, getSnapshot);
        transport.send({ type: "register_provider", name });
      } catch {
        // Exception safety
      }
    },

    dispose() {
      try {
        transport.dispose();
      } catch {
        // Exception safety
      }
    },
  };
}
