export interface TransportConfig {
  port: number;
  source: "browser" | "server";
}

export interface Transport {
  connect(): void;
  send(message: Record<string, unknown>): void;
  onMessage(handler: (message: unknown) => void): void;
  onOpen(handler: (isReconnect: boolean) => void): void;
  dispose(): void;
}

const RECONNECT_DELAYS = [1000, 2000, 4000];

export function createTransport(config: TransportConfig): Transport {
  let ws: WebSocket | null = null;
  let disposed = false;
  let reconnectAttempt = 0;
  let hasConnectedBefore = false;
  let messageHandler: ((message: unknown) => void) | null = null;
  let openHandler: ((isReconnect: boolean) => void) | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function doConnect(): void {
    if (disposed) return;
    reconnectTimer = null;

    try {
      ws = new WebSocket(`ws://localhost:${config.port}`);
    } catch {
      return;
    }

    ws.addEventListener("open", () => {
      const isReconnect = hasConnectedBefore;
      hasConnectedBefore = true;
      reconnectAttempt = 0;
      trySend({ type: "connect", source: config.source });
      if (openHandler) {
        try {
          openHandler(isReconnect);
        } catch {
          // Exception safety
        }
      }
    });

    ws.addEventListener("message", (event) => {
      if (!messageHandler) return;
      try {
        const data = JSON.parse(typeof event.data === "string" ? event.data : "");
        messageHandler(data);
      } catch {
        // Ignore unparseable messages
      }
    });

    ws.addEventListener("close", () => {
      if (disposed) return;
      ws = null;
      attemptReconnect();
    });

    ws.addEventListener("error", () => {
      // Error events are followed by close events; reconnect handled there
    });
  }

  function attemptReconnect(): void {
    if (disposed || reconnectAttempt >= RECONNECT_DELAYS.length) return;
    const delay = RECONNECT_DELAYS[reconnectAttempt];
    reconnectAttempt++;
    reconnectTimer = setTimeout(doConnect, delay);
  }

  function trySend(message: Record<string, unknown>): void {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch {
      // Silently drop
    }
  }

  return {
    connect() {
      doConnect();
    },

    send(message) {
      trySend(message);
    },

    onMessage(handler) {
      messageHandler = handler;
    },

    onOpen(handler) {
      openHandler = handler;
    },

    dispose() {
      disposed = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        try {
          ws.close();
        } catch {
          // Ignore
        }
        ws = null;
      }
    },
  };
}
