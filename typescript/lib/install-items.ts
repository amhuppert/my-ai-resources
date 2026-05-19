import { z } from "zod/v4";

export const InstallItemSchema = z.enum([
  "agent-docs",
  "utility-scripts",
  "claude-settings",
  "worktree-schema",
  "claude-md",
]);
export type InstallItem = z.infer<typeof InstallItemSchema>;

export const ScopeSchema = z.enum(["user", "project"]);
export type Scope = z.infer<typeof ScopeSchema>;

export const ScopeChoiceSchema = z.enum(["user", "project", "both"]);
export type ScopeChoice = z.infer<typeof ScopeChoiceSchema>;

export const ITEMS_BY_SCOPE: Record<Scope, readonly InstallItem[]> = {
  user: [
    "agent-docs",
    "utility-scripts",
    "claude-settings",
    "worktree-schema",
  ],
  project: ["claude-md"],
};

export const ITEM_LABELS: Record<InstallItem, string> = {
  "agent-docs": "Agent docs (coding system resources)",
  "utility-scripts": "Utility scripts",
  "claude-settings": "Claude Code settings",
  "worktree-schema": "Worktree-files JSON schema",
  "claude-md": "Project CLAUDE.md",
};

export function scopeChoiceToScopes(choice: ScopeChoice): Scope[] {
  if (choice === "both") return ["user", "project"];
  return [choice];
}

export function getItemsForScopes(scopes: readonly Scope[]): InstallItem[] {
  const items = new Set<InstallItem>();
  for (const scope of scopes) {
    for (const item of ITEMS_BY_SCOPE[scope]) {
      items.add(item);
    }
  }
  return [...items];
}
