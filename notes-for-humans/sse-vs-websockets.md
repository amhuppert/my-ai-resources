# Server-Sent Events vs WebSockets

## The Problem They Solve

Standard HTTP follows a request/response pattern: the client asks, the server answers, the connection closes. This breaks down when the server needs to *push* data to the client — live notifications, stock prices, chat messages, log streams. Both **SSE** and **WebSockets** solve this by keeping a connection open so the server can send data whenever it has something to share. They differ in how that connection works and what it can carry.

## Quick Comparison

| Dimension | SSE | WebSocket |
|---|---|---|
| Direction | Server → client only | Bidirectional (full-duplex) |
| Protocol | Plain HTTP | Custom protocol (HTTP handshake, then upgrade) |
| Data | Text only (UTF-8) | Text or binary |
| Auto-reconnect | Built into browser | Application must implement |
| Browser API | `EventSource` | `WebSocket` |
| URL scheme | `http://` / `https://` | `ws://` / `wss://` |
| Infrastructure | Works with normal HTTP tooling | Often requires special handling |

## Server-Sent Events (SSE)

**SSE** — a standard for a server to push text events to a client over a single, long-lived HTTP response.

The client opens a normal HTTP request. The server responds with `Content-Type: text/event-stream` and *never closes* the connection. It writes messages in a simple text format whenever it has something to send.

### Message Format

Each event is plain text, terminated by a blank line:

```
data: hello world

event: priceUpdate
data: {"ticker":"AAPL","price":175.42}

id: 42
data: a message with an ID
```

`event:` names the event type. `id:` lets the server tag messages so reconnects can resume.

### Browser Usage

```js
const stream = new EventSource('/events');
stream.onmessage = (e) => console.log(e.data);
stream.addEventListener('priceUpdate', (e) => { /* ... */ });
```

### Built-in Reconnection

If the connection drops, the browser reconnects automatically. If the server sent message IDs, the browser includes the last one in a `Last-Event-ID` header so the server can resume from that point.

## WebSockets

**WebSocket** — a protocol for full-duplex communication over a single TCP connection. Once established, either side can send messages at any time.

### Connection Handshake

The client opens a normal HTTP request with an `Upgrade: websocket` header. If the server accepts, the underlying TCP connection switches from HTTP to the WebSocket protocol and stays open.

### Message Format

Messages are sent as **frames**. A frame can carry text or arbitrary binary data. There is no required structure beyond the frame itself — application code decides what to send (typically JSON, MessagePack, or Protocol Buffers).

### Browser Usage

```js
const socket = new WebSocket('wss://example.com/socket');
socket.onmessage = (e) => console.log(e.data);
socket.send('hello server');
```

### No Built-in Reconnection

If the connection drops, the application must detect it (via the `close` event) and reconnect itself, including any resync logic.

## When to Use Each

| Use case | Choose |
|---|---|
| Live feed (notifications, news, prices, logs) | SSE |
| Server pushing updates from a database | SSE |
| Chat / collaborative editing | WebSocket |
| Multiplayer games | WebSocket |
| High-frequency client-to-server messages | WebSocket |
| Binary data (audio, video, files) | WebSocket |

If the client only needs to *receive*, SSE is simpler. If the client needs to send messages frequently, WebSocket is the right tool. For occasional client-to-server messages, SSE combined with normal HTTP POSTs is a perfectly reasonable pattern.

## Infrastructure Considerations

**HTTP infrastructure works for SSE.** Proxies, load balancers, CDNs, and authentication middleware understand SSE because it *is* HTTP. The main risk is intermediaries that buffer responses — they can delay or break the stream. Buffering must be disabled on those layers.

**WebSockets often need special handling.** Many proxies and load balancers don't pass the HTTP Upgrade handshake through by default. HTTP-level features like CORS, authentication, and routing rules don't automatically apply once the protocol switches. Cloud providers typically expose a "WebSocket support" setting that must be enabled.

## Connection Limits

Browsers cap concurrent connections per origin — typically 6 over HTTP/1.1. **An SSE stream consumes one of these slots**, which can starve other requests to the same domain. Over HTTP/2 or HTTP/3 this limit effectively disappears because connections are multiplexed.

WebSockets are not subject to the per-origin HTTP connection limit.

## Critical: SSE Is Not "Half a WebSocket"

It's tempting to treat SSE as a lesser WebSocket, but the choice usually isn't about capability — it's about fit.

- SSE rides on HTTP, so it inherits HTTP's tooling, semantics, and operational maturity. Cookie or `Authorization` header auth, caching rules, CDN routing, and request logging all just work.
- WebSocket is a separate protocol once the handshake completes. You gain bidirectionality but step outside the HTTP ecosystem — you take on designing a message protocol, handling reconnection, and ensuring infrastructure supports the upgrade.

For server-to-client streaming, SSE is often the more pragmatic choice. For genuinely interactive, low-latency, bidirectional communication, WebSocket is the right tool.

## Common Misconceptions

- **"SSE is deprecated"** — false. It's a stable WHATWG standard supported by all modern browsers.
- **"WebSockets are always faster"** — marginally, and only because they avoid HTTP framing per message. For most apps the difference is negligible.
- **"SSE can't send binary"** — true. If you need binary, base64-encode it or use WebSocket.
- **"WebSockets are stateless"** — false. They are explicitly stateful, which is part of why they're harder to scale horizontally.
