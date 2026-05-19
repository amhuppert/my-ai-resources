import {
  ITEM_LABELS,
  ScopeChoiceSchema,
  type InstallItem,
  type ScopeChoice,
} from "./install-items.js";

export interface Prompter {
  chooseScope(): Promise<ScopeChoice>;
  chooseItems(available: readonly InstallItem[]): Promise<InstallItem[]>;
}

async function runGum(args: string[]): Promise<string> {
  const proc = Bun.spawn(["gum", ...args], {
    stdin: "inherit",
    stderr: "inherit",
    stdout: "pipe",
  });
  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`gum exited with code ${exitCode}`);
  }
  return output;
}

export class GumPrompter implements Prompter {
  async chooseScope(): Promise<ScopeChoice> {
    const output = await runGum([
      "choose",
      "--header",
      "Select installation scope:",
      "user",
      "project",
      "both",
    ]);
    return ScopeChoiceSchema.parse(output.trim());
  }

  async chooseItems(available: readonly InstallItem[]): Promise<InstallItem[]> {
    if (available.length === 0) return [];

    const labels = available.map((item) => ITEM_LABELS[item]);
    const output = await runGum([
      "choose",
      "--no-limit",
      "--header",
      "Select items to install (space to toggle, enter to confirm):",
      "--selected",
      labels.join(","),
      ...labels,
    ]);

    const selectedLabels = new Set(
      output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    );
    return available.filter((item) => selectedLabels.has(ITEM_LABELS[item]));
  }
}

export async function ensureGumInstalled(): Promise<void> {
  const proc = Bun.spawn(["which", "gum"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(
      "gum is not installed. Install with: brew install gum (see agent-docs/gum-reference.md)",
    );
  }
}
