import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { printSyncSummary } from "./sync-reporter.ts";
import type { SyncResult } from "./types.ts";

describe("printSyncSummary", () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.map(String).join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("prints counts for synced, skipped, and failed items", () => {
    const result: SyncResult = {
      items: [
        { artifact: "instructions", status: "synced", destPath: "/dest" },
        {
          artifact: "skill:commit",
          status: "synced",
          destPath: "/dest/commit",
          warnings: ["Removed unsupported frontmatter"],
        },
        { artifact: "agent:reviewer", status: "skipped", reason: "No source" },
        { artifact: "mcp:server1", status: "failed", reason: "Write error" },
      ],
      hasErrors: true,
    };

    printSyncSummary(result);

    const output = consoleOutput.join("\n");
    expect(output).toContain("2 synced");
    expect(output).toContain("1 skipped");
    expect(output).toContain("1 failed");
    expect(output).toContain("Written:");
    expect(output).toContain("/dest/commit");
    expect(output).toContain("No source");
    expect(output).toContain("Write error");
    expect(output).toContain("Warnings:");
    expect(output).toContain("Removed unsupported frontmatter");
  });

  test("prints clean summary when all items synced", () => {
    const result: SyncResult = {
      items: [
        { artifact: "instructions", status: "synced", destPath: "/a" },
        { artifact: "skill:commit", status: "synced", destPath: "/b" },
      ],
      hasErrors: false,
    };

    printSyncSummary(result);

    const output = consoleOutput.join("\n");
    expect(output).toContain("2 synced");
    expect(output).toContain("0 skipped");
    expect(output).toContain("0 failed");
    expect(output).toContain("Written:");
    expect(output).toContain("/a");
    expect(output).toContain("/b");
    expect(output).not.toContain("Skipped:");
    expect(output).not.toContain("Failed:");
    expect(output).not.toContain("Warnings:");
  });

  test("prints summary for empty result set", () => {
    const result: SyncResult = {
      items: [],
      hasErrors: false,
    };

    printSyncSummary(result);

    const output = consoleOutput.join("\n");
    expect(output).toContain("0 synced");
    expect(output).toContain("0 skipped");
    expect(output).toContain("0 failed");
    expect(output).not.toContain("Written:");
  });

  test("prints artifact names with skip/failure reasons", () => {
    const result: SyncResult = {
      items: [
        { artifact: "agent:reviewer", status: "skipped", reason: "Source file not found" },
        { artifact: "skill:deploy", status: "failed", reason: "Invalid frontmatter in /path/to/SKILL.md" },
      ],
      hasErrors: true,
    };

    printSyncSummary(result);

    const output = consoleOutput.join("\n");
    expect(output).toContain("agent:reviewer");
    expect(output).toContain("Source file not found");
    expect(output).toContain("skill:deploy");
    expect(output).toContain("Invalid frontmatter in /path/to/SKILL.md");
  });

  test("prints only skipped section when no failures", () => {
    const result: SyncResult = {
      items: [
        { artifact: "instructions", status: "synced", destPath: "/dest" },
        { artifact: "mcp", status: "skipped", reason: "No MCP config found" },
      ],
      hasErrors: false,
    };

    printSyncSummary(result);

    const output = consoleOutput.join("\n");
    expect(output).toContain("Skipped:");
    expect(output).not.toContain("Failed:");
    expect(output).toContain("No MCP config found");
  });

  test("prints only failed section when no skips", () => {
    const result: SyncResult = {
      items: [
        { artifact: "instructions", status: "synced", destPath: "/dest" },
        { artifact: "skill:broken", status: "failed", reason: "Parse error" },
      ],
      hasErrors: true,
    };

    printSyncSummary(result);

    const output = consoleOutput.join("\n");
    expect(output).not.toContain("Skipped:");
    expect(output).toContain("Failed:");
    expect(output).toContain("Parse error");
  });

  test("prints warnings for synced items", () => {
    const result: SyncResult = {
      items: [
        {
          artifact: "agent:helper",
          status: "synced",
          destPath: "/dest/helper.toml",
          warnings: ['No model mapping for "haiku"'],
        },
      ],
      hasErrors: false,
    };

    printSyncSummary(result);

    const output = consoleOutput.join("\n");
    expect(output).toContain("Warnings:");
    expect(output).toContain('No model mapping for "haiku"');
  });
});
