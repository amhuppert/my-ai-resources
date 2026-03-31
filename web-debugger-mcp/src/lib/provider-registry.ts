import type { Source } from "../schemas/messages.js";

export interface MessageSender {
  send(data: string): void;
}

interface ProviderEntry {
  source: Source;
  ws: MessageSender;
}

const providers = new Map<string, ProviderEntry>();

export function registerProvider(name: string, source: Source, ws: MessageSender): void {
  providers.set(name, { source, ws });
}

export function unregisterProvider(name: string): void {
  providers.delete(name);
}

export function getProvider(name: string): ProviderEntry | undefined {
  return providers.get(name);
}

export function removeProvidersByConnection(ws: MessageSender): void {
  for (const [name, entry] of providers) {
    if (entry.ws === ws) {
      providers.delete(name);
    }
  }
}

export function listProviders(): Array<{ name: string; source: Source }> {
  return [...providers].map(([name, entry]) => ({ name, source: entry.source }));
}

export function resetRegistry(): void {
  providers.clear();
}
