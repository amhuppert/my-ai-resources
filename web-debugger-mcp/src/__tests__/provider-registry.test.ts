import { describe, expect, it, beforeEach } from "bun:test";
import {
  registerProvider,
  getProvider,
  removeProvidersByConnection,
  listProviders,
  resetRegistry,
  type MessageSender,
} from "../lib/provider-registry.js";

function fakeWs(id: string): MessageSender {
  return { __id: id, send() {} } as unknown as MessageSender;
}

describe("provider-registry", () => {
  beforeEach(() => {
    resetRegistry();
  });

  describe("registerProvider", () => {
    it("registers a provider", () => {
      const ws = fakeWs("ws-1");
      registerProvider("react-query", "browser", ws);
      const provider = getProvider("react-query");
      expect(provider).toBeDefined();
      expect(provider!.source).toBe("browser");
      expect(provider!.ws).toBe(ws);
    });

    it("overwrites if same name is registered again", () => {
      const ws1 = fakeWs("ws-1");
      const ws2 = fakeWs("ws-2");
      registerProvider("auth", "server", ws1);
      registerProvider("auth", "browser", ws2);
      const provider = getProvider("auth");
      expect(provider!.ws).toBe(ws2);
      expect(provider!.source).toBe("browser");
    });
  });

  describe("getProvider", () => {
    it("returns undefined for unknown provider", () => {
      expect(getProvider("nonexistent")).toBeUndefined();
    });
  });

  describe("removeProvidersByConnection", () => {
    it("removes all providers for a given connection", () => {
      const ws1 = fakeWs("ws-1");
      const ws2 = fakeWs("ws-2");
      registerProvider("provider-a", "browser", ws1);
      registerProvider("provider-b", "browser", ws1);
      registerProvider("provider-c", "server", ws2);

      removeProvidersByConnection(ws1);

      expect(getProvider("provider-a")).toBeUndefined();
      expect(getProvider("provider-b")).toBeUndefined();
      expect(getProvider("provider-c")).toBeDefined();
    });

    it("does nothing if connection has no providers", () => {
      const ws = fakeWs("ws-1");
      removeProvidersByConnection(ws);
      expect(listProviders()).toEqual([]);
    });
  });

  describe("listProviders", () => {
    it("returns empty array when no providers registered", () => {
      expect(listProviders()).toEqual([]);
    });

    it("returns all registered providers with source", () => {
      const ws1 = fakeWs("ws-1");
      const ws2 = fakeWs("ws-2");
      registerProvider("react-query", "browser", ws1);
      registerProvider("auth-state", "server", ws2);

      const providers = listProviders();
      expect(providers).toHaveLength(2);
      expect(providers).toContainEqual({ name: "react-query", source: "browser" });
      expect(providers).toContainEqual({ name: "auth-state", source: "server" });
    });
  });
});
