import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const SKILL_DIR = join(import.meta.dir, "..", "..", "..", "claude", "ai-resources-plugin", "skills", "ste");
const SCRIPT = join(SKILL_DIR, "scripts", "ste.mjs");
const DICTIONARY = join(SKILL_DIR, "references", "dictionary.md");

const EntrySchema = z.object({
  word: z.string(),
  approved: z.boolean(),
  unlistedForm: z.boolean().optional(),
});
const LookupSchema = z.object({
  results: z.array(
    z.object({
      query: z.string(),
      match: z.enum(["exact", "inflection", "none"]),
      entries: z.array(EntrySchema),
    }),
  ),
});
const SearchSchema = z.object({
  total: z.number(),
  truncated: z.boolean(),
  entries: z.array(EntrySchema),
});
const WordFindingsSchema = z.object({
  total: z.number(),
  items: z.array(z.object({ text: z.string(), lines: z.array(z.number()) })),
});
const ScanSchema = z.object({
  sentences: z.number(),
  longSentences: z.object({ items: z.array(z.object({ line: z.number(), words: z.number() })) }),
  notApproved: WordFindingsSchema,
  unlistedForms: WordFindingsSchema,
  mixed: WordFindingsSchema,
  noEntry: WordFindingsSchema,
});
const ErrorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

// The skill ships a Node script, so run it with node rather than bun.
function ste(args: readonly string[], options: { input?: string; script?: string } = {}): CliResult {
  const result = spawnSync("node", [options.script ?? SCRIPT, ...args], {
    input: options.input,
    encoding: "utf8",
  });
  return { exitCode: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
}

function lookupJson(...words: string[]) {
  const result = ste(["lookup", ...words, "--json"]);
  expect(result.exitCode).toBe(0);
  return LookupSchema.parse(JSON.parse(result.stdout));
}

function scanJson(text: string, ...flags: string[]) {
  const result = ste(["scan", "--file", "-", "--json", ...flags], { input: text });
  expect(result.exitCode).toBe(0);
  return ScanSchema.parse(JSON.parse(result.stdout));
}

const texts = (findings: z.infer<typeof WordFindingsSchema>) => findings.items.map((item) => item.text);

describe("ste lookup", () => {
  test("finds every dictionary row by its headword", () => {
    const rows = readFileSync(DICTIONARY, "utf8")
      .split("\n")
      .filter((line) => line.startsWith("| ") && !line.startsWith("| Word and") && !line.startsWith("| ---"))
      .map((line) => line.split("|")[1]?.trim() ?? "");
    const headwords = rows.map((word) => word.split("(")[0]?.replace(/,\s*$/, "").trim() ?? "");

    const { results } = lookupJson(...headwords);

    const found = new Set(results.flatMap((result) => result.entries.map((entry) => entry.word)));
    expect(rows.filter((word) => !found.has(word))).toEqual([]);
    expect(rows.length).toBeGreaterThan(2000);
  });

  test.each([
    ["started", "exact", ["START (v), STARTS, STARTED, STARTED"]],
    ["worse", "exact", ["BAD (adj) (WORSE, WORST)"]],
    ["were", "exact", ["BE (v), IS, WAS, (also ARE, WERE) No other verb forms."]],
    ["made sure", "exact", ["MAKE SURE (v), MAKES SURE, MADE SURE, MADE SURE"]],
    ["matte", "exact", ["MATT (or MATTE) (adj)"]],
    ["in case of", "exact", ["case (in case of) (conj)"]],
    ["so", "exact", ["so (that) (conj)"]],
    ["longitudinal", "exact", ["LONGITUDINAL (adj)"]],
    ["check", "exact", ["CHECK (n)", "check (v)"]],
    ["utilized", "inflection", ["utilize (v)"]],
    ["carried out", "inflection", ["carry out (v)"]],
    ["checked", "inflection", ["check (v)"]],
    ["procedures", "inflection", ["PROCEDURE (n)"]],
    ["frobnicate", "none", []],
  ] as const)("%s matches %s", (query, match, words) => {
    const [result] = lookupJson(query).results;

    expect(result?.match).toBe(match);
    expect(result?.entries.map((entry) => entry.word)).toEqual([...words]);
  });

  test("flags an approved verb reached through an unlisted form", () => {
    const [result] = lookupJson("starting").results;

    expect(result?.entries).toEqual([
      expect.objectContaining({ word: "START (v), STARTS, STARTED, STARTED", approved: true, unlistedForm: true }),
    ]);
  });

  test("prints one line per entry with status, page, and meaning or alternatives", () => {
    const result = ste(["lookup", "check", "frobnicate"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(
      [
        "check:",
        "  CHECK (n) [approved, 2-1-C6] meaning: The procedure you do to make sure that something operates correctly or has no defects",
        "  check (v) [not approved, 2-1-C7] alternatives: MAKE SURE (v) MEASURE (v) EXAMINE (v) CHECK (n)",
        "frobnicate: no entry; not approved unless it is a technical name or technical verb",
        "",
      ].join("\n"),
    );
  });

  test("search returns approved entries and states what the limit omitted", () => {
    const all = SearchSchema.parse(JSON.parse(ste(["lookup", "--search", "tight", "--json"]).stdout));
    expect(all.entries.map((entry) => entry.word)).toContain("LOOSE (adj)");
    expect(all.entries.every((entry) => entry.approved)).toBe(true);

    const sure = SearchSchema.parse(JSON.parse(ste(["lookup", "--search", "sure", "--json"]).stdout));
    expect(sure.entries[0]?.word).toBe("MAKE SURE (v), MAKES SURE, MADE SURE, MADE SURE");
    expect(sure.entries.map((entry) => entry.word)).not.toContain("MEASURE (v), MEASURES, MEASURED, MEASURED");

    const limited = ste(["lookup", "--search", "tight", "--limit", "1"]);
    expect(limited.exitCode).toBe(0);
    expect(limited.stdout).toContain(`showing 1 of ${all.total}; narrow the text or rerun with --limit ${all.total}`);
  });
});

describe("ste scan", () => {
  const draft = [
    "# Replace the Filter",
    "",
    "Before starting, ensure that the pump is off and utilize the tool kit, such as the",
    "wrench and the driver, to remove all of the bolts from the valve.",
    "",
    "- Make sure that the unit is off.",
    "- Check the seal. Run `utilize --everything` and open https://example.com/utilize.",
    "",
    "```sh",
    "ensure utilize",
    "```",
    "",
    "| Step | Result |",
    "| --- | --- |",
    "| 1 | Install the filter in case of leaks. The unit was bolted. |",
  ].join("\n");

  test("reports each finding category with the line it occurs on", () => {
    const report = scanJson(draft);

    expect(report.longSentences.items).toEqual([{ line: 3, words: 29 }]);
    expect(texts(report.notApproved)).toEqual(["ensure", "utilize", "such as", "run", "in case of", "bolted"]);
    expect(report.notApproved.items.find((item) => item.text === "utilize")?.lines).toEqual([3]);
    expect(texts(report.unlistedForms)).toEqual(["starting"]);
    expect(texts(report.mixed)).toEqual(["filter", "pump", "bolts", "check", "result", "leaks"]);
    expect(texts(report.noEntry)).toEqual(["kit", "wrench", "driver", "valve"]);
  });

  test("applies the word limit for the chosen mode", () => {
    const sentence = `${Array.from({ length: 22 }, () => "stop").join(" ")}.`;

    expect(scanJson(sentence).longSentences.items).toEqual([{ line: 1, words: 22 }]);
    expect(scanJson(sentence, "--mode", "descriptive").longSentences.items).toEqual([]);
  });

  test("states a clean verdict when nothing is found", () => {
    const result = ste(["scan", "--file", "-"], { input: "Do the procedure again.\n" });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("<stdin>: 1 sentence, 4 words; procedure mode, 20-word sentence limit\nno findings\n");
  });

  test("limits each section and names the flag that shows the rest", () => {
    const result = ste(["scan", "--file", "-", "--limit", "2"], { input: draft });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("not approved: 6\n  ensure (line 3): ensure (v) -> MAKE SURE (v)\n");
    expect(result.stdout).toContain("  … 4 more; rerun with --limit 6\n");
  });
});

describe("ste errors", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "ste-cli-"));
  afterAll(() => rmSync(tempDir, { recursive: true, force: true }));

  test.each([
    [["frobnicate"], "unknown command"],
    [["lookup", "--fuzzy", "check"], "unknown flag --fuzzy"],
    [["lookup"], "lookup needs at least one word"],
    [["lookup", "check", "--search", "tight"], "not both"],
    [["lookup", "check", "--limit", "5"], "--limit applies only to --search"],
    [["lookup", "--search", "tight", "--limit", "0"], "positive integer"],
    [["scan"], "scan needs --file"],
    [["scan", "--file", join(tempDir, "missing.md")], "cannot read --file"],
    [["scan", "--file", "-", "--mode", "brief"], "--mode must be procedure or descriptive"],
  ])("%j exits 2 with a usage error", (args, message) => {
    const result = ste(args, { input: "" });

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(message);
  });

  test("reports usage errors as JSON when --json is set", () => {
    const result = ste(["scan", "--json"]);

    expect(result.exitCode).toBe(2);
    expect(ErrorSchema.parse(JSON.parse(result.stderr)).error.code).toBe("usage");
  });

  test("exits 3 when the dictionary is missing", () => {
    const scriptsDir = join(tempDir, "skill", "scripts");
    mkdirSync(scriptsDir, { recursive: true });
    const script = join(scriptsDir, "ste.mjs");
    copyFileSync(SCRIPT, script);

    const result = ste(["lookup", "check"], { script });

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain("cannot read dictionary");
  });

  test("help lists the commands and exit codes", () => {
    const result = ste(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("lookup ");
    expect(result.stdout).toContain("scan ");
    expect(result.stdout).toContain("exit codes:");
  });
});
