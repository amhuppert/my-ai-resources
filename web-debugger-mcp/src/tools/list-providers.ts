import { listProviders } from "../lib/provider-registry.js";
import type { Source } from "../schemas/messages.js";

export function listProvidersTool(): {
  providers: Array<{ name: string; source: Source }>;
} {
  return { providers: listProviders() };
}
