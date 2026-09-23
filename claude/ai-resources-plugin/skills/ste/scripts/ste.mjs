#!/usr/bin/env node
/**
 * Query the condensed ASD-STE100 dictionary and scan drafts for Simplified
 * Technical English issues, so an agent reads a few entries instead of the
 * whole dictionary. Output is line-oriented text for agents; --json is for
 * scripts.
 *
 *   node ste.mjs lookup <word-or-phrase>... [--json]
 *   node ste.mjs lookup --search <text> [--limit <n>] [--json]
 *   node ste.mjs scan --file <path|-> [--mode procedure|descriptive] [--limit <n>] [--json]
 *
 * Zero dependencies. Node 18+.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DICTIONARY_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "references", "dictionary.md");
const SELF = `node ${process.argv[1]}`;
const DEFAULT_LIMIT = 20;
const WORD_LIMITS = { procedure: 20, descriptive: 25 };
const PARTS_OF_SPEECH = new Set(["n", "v", "adj", "adv", "prep", "conj", "pron", "art", "prefix"]);
const NO_ENTRY = "not approved unless it is a technical name or technical verb";
// Stands in for inline code and URLs: counted as one word, never looked up.
const OPAQUE = "";

class UsageError extends Error {
  constructor(message, command) {
    super(message);
    this.command = command;
  }
}
class DictionaryError extends Error {}

/* ───────────────────────── help ───────────────────────── */

const EXIT_CODES = `exit codes:
  0  done; "no entry" results and scan findings are output, not failures
  2  usage error: unknown command or flag, bad value, or unreadable --file
  3  dictionary missing or unparseable: ${DICTIONARY_PATH}`;

const COMMANDS = {
  lookup: {
    summary: "Show entries for words or phrases, or search approved meanings",
    flags: { search: "string", limit: "count", json: "boolean" },
    help: `usage:
  ${SELF} lookup <word-or-phrase>... [--json]
  ${SELF} lookup --search <text> [--limit <n>] [--json]

Each argument is one query; quote phrases ("make sure"). A query matches a
headword, a listed form (STARTED -> START (v)), or a phrase entry. When nothing
matches exactly, regular inflections are tried (-s, -es, -ies, -ed, -ing); an
approved verb found that way is flagged when the form is not listed.

Entry lines:
  <entry> [approved, <page>] meaning: <approved meaning>
  <entry> [not approved, <page>] alternatives: <what to use instead>
UPPERCASE entries are approved only for that part of speech and meaning.

  --search <text>  approved entries with a word or meaning that starts with
                   <text> at a word boundary, word matches first; finds an
                   approved word for an idea
  --limit <n>      maximum search results (default ${DEFAULT_LIMIT})
  --json           machine-readable output for scripts

${EXIT_CODES}`,
    run: runLookup,
  },
  scan: {
    summary: "Report long sentences and unapproved or unlisted words in a draft",
    flags: { file: "string", mode: "string", limit: "count", json: "boolean" },
    help: `usage:
  ${SELF} scan --file <path|-> [--mode procedure|descriptive] [--limit <n>] [--json]

Findings are advisory: the scan cannot tell a word's part of speech or whether
a word without an entry is a technical name. It skips fenced code, inline code,
and URLs; line numbers refer to the input.

Sections (only those with findings are printed):
  long sentences            more words than the mode allows
  not approved              every matching entry is unapproved
  unlisted verb forms       approved verb, but this form (often -ing) is not listed
  approved in some senses   approved and unapproved entries both match; check the
                            part of speech and meaning
  no entry                  acceptable only as a technical name or technical verb

  --file <path|->  Markdown or plain text to scan; - reads stdin
  --mode <mode>    procedure (${WORD_LIMITS.procedure}-word limit, default) or descriptive (${WORD_LIMITS.descriptive})
  --limit <n>      maximum items per section (default ${DEFAULT_LIMIT})
  --json           machine-readable output for scripts

${EXIT_CODES}`,
    run: runScan,
  },
};

function topHelp() {
  const commands = Object.entries(COMMANDS).map(([name, spec]) => `  ${name.padEnd(8)} ${spec.summary}`);
  return `${SELF}: look up ASD-STE100 dictionary entries and scan drafts for STE issues.
Output is line-oriented text for agents; add --json when a script parses it.

commands:
${commands.join("\n")}

Run "${SELF} <command> --help" for flags and output format.

${EXIT_CODES}`;
}

/* ───────────────────────── CLI ───────────────────────── */

function parseArgs(argv, command) {
  const { flags } = COMMANDS[command];
  const parsed = { positionals: [], flags: {}, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      parsed.positionals.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    const name = arg.slice(2, eq === -1 ? undefined : eq);
    const type = flags[name];
    if (!type) {
      const valid = Object.keys(flags).map((flag) => `--${flag}`).join(", ");
      throw new UsageError(`unknown flag --${name} for ${command}; valid: ${valid}`, command);
    }
    if (type === "boolean") {
      parsed.flags[name] = true;
      continue;
    }
    const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
    if (value === undefined || value.startsWith("--")) throw new UsageError(`--${name} needs a value`, command);
    if (type === "count" && !/^[1-9]\d*$/.test(value)) {
      throw new UsageError(`--${name} must be a positive integer, got "${value}"`, command);
    }
    parsed.flags[name] = type === "count" ? Number(value) : value;
  }
  return parsed;
}

function run(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") return topHelp();
  if (!COMMANDS[command]) {
    throw new UsageError(`unknown command "${command}"; commands: ${Object.keys(COMMANDS).join(", ")}`);
  }
  const args = parseArgs(rest, command);
  if (args.help) return COMMANDS[command].help;
  return COMMANDS[command].run(args, loadDictionary());
}

function main(argv) {
  try {
    process.stdout.write(`${run(argv)}\n`);
  } catch (error) {
    if (!(error instanceof UsageError || error instanceof DictionaryError)) throw error;
    const exitCode = error instanceof UsageError ? 2 : 3;
    if (argv.includes("--json")) {
      const code = exitCode === 2 ? "usage" : "dictionary";
      process.stderr.write(`${JSON.stringify({ error: { code, message: error.message } })}\n`);
    } else {
      const help = error instanceof UsageError ? `\nsee: ${SELF}${error.command ? ` ${error.command}` : ""} --help` : "";
      process.stderr.write(`error: ${error.message}${help}\n`);
    }
    process.exitCode = exitCode;
  }
}

/* ───────────────────────── dictionary ───────────────────────── */

function loadDictionary() {
  let markdown;
  try {
    markdown = fs.readFileSync(DICTIONARY_PATH, "utf8");
  } catch (error) {
    throw new DictionaryError(`cannot read dictionary at ${DICTIONARY_PATH}: ${error.code ?? error.message}`);
  }
  const entries = parseDictionary(markdown);
  if (entries.length === 0) throw new DictionaryError(`no entries parsed from ${DICTIONARY_PATH}`);
  return buildIndex(entries);
}

function parseDictionary(markdown) {
  const entries = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("| ")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 3 || cells[0] === "Word and part of speech" || /^-+$/.test(cells[0])) continue;
    entries.push(parseEntry(cells, entries.length));
  }
  return entries;
}

// Word cells come in shapes such as "START (v), STARTS, STARTED, STARTED",
// "BAD (adj) (WORSE, WORST)", "case (in case of) (conj)", "MATT (or MATTE) (adj)",
// "BE (v), IS, WAS, (also ARE, WERE) No other verb forms.", and "such as".
function parseEntry([word, definition, page], index) {
  const open = word.indexOf("(");
  const headword = (open === -1 ? word : word.slice(0, open)).replace(/,\s*$/, "").trim();
  const parens = [...word.matchAll(/\(([^)]*)\)/g)];
  const posParen = parens.find((match) => PARTS_OF_SPEECH.has(match[1].trim()));
  const qualifier = parens
    .find((match) => match !== posParen && (!posParen || match.index < posParen.index))?.[1]
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const forms = posParen ? parseForms(word.slice(posParen.index + posParen[0].length), headword.includes(" ")) : [];
  const approved = /[A-Z]/.test(headword) && headword === headword.toUpperCase();
  return {
    index,
    word,
    headword,
    pos: posParen?.[1].trim() ?? "",
    approved,
    technicalNoun: !approved && namesItselfAsTechnicalNoun(headword, definition),
    forms,
    definition,
    page,
    keys: entryKeys(headword.toLowerCase(), qualifier, forms),
  };
}

// "filter (v) -> FILTER (TN)", "bolt (v) -> ATTACH (v) (WITH A BOLT [TN] ...)":
// the verb is not approved, but the same word is usable as a technical noun.
function namesItselfAsTechnicalNoun(headword, definition) {
  if (headword.includes(" ")) return false;
  const word = headword.toUpperCase().replace(/[^A-Z]/g, (char) => `\\${char}`);
  return new RegExp(`(?:^|[^A-Z])${word}(?:S|ES)?[^A-Za-z]{0,3}[[(]TN[\\])]`).test(definition);
}

// Forms are the uppercase runs after the part of speech. Notes such as
// "No other verb forms." and meaning numbers such as "1." are not forms.
function parseForms(rest, multiWord) {
  const isFormToken = (token) => /^[A-Z][A-Z'-]*$/.test(token);
  const forms = [];
  for (const part of rest.replace(/[()]/g, " ").split(",")) {
    const tokens = part.trim().split(/\s+/);
    const start = tokens.findIndex(isFormToken);
    if (start === -1) continue;
    let end = start;
    while (end < tokens.length && isFormToken(tokens[end])) end++;
    const run = tokens.slice(start, end);
    if (multiWord) forms.push(run.join(" "));
    else forms.push(...run);
  }
  return forms;
}

function entryKeys(headword, qualifier, forms) {
  const keys = new Set(forms.map((form) => form.toLowerCase()));
  if (!qualifier) {
    keys.add(headword);
  } else if (qualifier.startsWith("or ")) {
    keys.add(headword);
    keys.add(qualifier.slice(3).trim());
  } else if (qualifier.split(" ").some((word) => word.startsWith(headword))) {
    // "case (in case of)", "long (no longer)": the qualifier is the whole phrase.
    keys.add(qualifier);
  } else {
    // "so (that)": "that" is optional, so the bare word is a key too.
    // "prevent (from)" is a split construction ("prevent the leak from") and
    // PREVENT (v) is approved, so only the literal phrase is a key.
    keys.add(`${headword} ${qualifier}`);
    if (qualifier === "that") keys.add(headword);
  }
  return [...keys];
}

// byKey drives the scan: headwords, listed forms, and phrases. byLookup adds
// every headword so a lookup of "prevent" or "case" also shows its phrase entries.
function buildIndex(entries) {
  const byKey = new Map();
  const byLookup = new Map();
  const add = (map, key, entry) => {
    const list = map.get(key) ?? [];
    if (!list.includes(entry)) list.push(entry);
    map.set(key, list);
  };
  for (const entry of entries) {
    for (const key of entry.keys) {
      add(byKey, key, entry);
      add(byLookup, key, entry);
    }
    add(byLookup, entry.headword.toLowerCase(), entry);
  }
  const maxPhraseWords = Math.max(...[...byKey.keys()].map((key) => key.split(" ").length));
  return { entries, byKey, byLookup, maxPhraseWords };
}

/* ───────────────────────── matching ───────────────────────── */

const NOUN_OR_VERB = ["n", "v"];
const VERB = ["v"];

// Regular inflections only; each stem is limited to the parts of speech that
// can carry the ending, so "checked" finds check (v) but not CHECK (n).
function inflectionStems(word) {
  const stems = [];
  const add = (stem, pos) => {
    if (stem.length > 1) stems.push({ stem, pos });
  };
  const addVerbStems = (stem) => {
    add(stem, VERB);
    add(`${stem}e`, VERB);
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) add(stem.slice(0, -1), VERB);
  };
  if (word.endsWith("ies")) add(`${word.slice(0, -3)}y`, NOUN_OR_VERB);
  if (word.endsWith("es")) add(word.slice(0, -2), NOUN_OR_VERB);
  if (word.endsWith("s") && !word.endsWith("ss")) add(word.slice(0, -1), NOUN_OR_VERB);
  if (word.endsWith("ied")) add(`${word.slice(0, -3)}y`, VERB);
  if (word.endsWith("ed")) addVerbStems(word.slice(0, -2));
  if (word.endsWith("ing")) addVerbStems(word.slice(0, -3));
  return stems;
}

// Exact keys win; inflections are tried only when nothing matches exactly.
// For phrases, the first word carries the inflection ("carried out").
// nounCapable records whether the term can be a noun: an exact match, or an
// inflection that nouns also take ("filters", but not "filtered").
function resolve(term, map) {
  const exact = map.get(term);
  if (exact) return { via: "exact", stems: [], nounCapable: true, entries: byDictionaryOrder(exact) };
  const [first, ...rest] = term.split(" ");
  const found = new Map();
  const stems = [];
  let nounCapable = false;
  for (const { stem, pos } of inflectionStems(first)) {
    const key = [stem, ...rest].join(" ");
    const hits = (map.get(key) ?? []).filter((entry) => pos.includes(entry.pos));
    if (hits.length === 0) continue;
    if (!stems.includes(key)) stems.push(key);
    if (pos.includes("n")) nounCapable = true;
    for (const entry of hits) found.set(entry.index, entry);
  }
  if (found.size === 0) return { via: "none", stems: [], nounCapable: false, entries: [] };
  return { via: "inflection", stems, nounCapable, entries: byDictionaryOrder([...found.values()]) };
}

function byDictionaryOrder(entries) {
  return [...entries].sort((a, b) => a.index - b.index);
}

// An approved verb reached through an inflection lists its forms, and this
// form is not among them (an exact match would have won).
function isUnlistedForm(result, entry) {
  return result.via === "inflection" && entry.approved && entry.forms.length > 0;
}

function classify(result) {
  if (result.via === "none") return "noEntry";
  const usable = result.entries.filter(
    (entry) => (entry.approved && !isUnlistedForm(result, entry)) || (entry.technicalNoun && result.nounCapable),
  );
  const unapproved = result.entries.filter((entry) => !entry.approved);
  if (usable.length > 0 && unapproved.length > 0) return "mixed";
  if (usable.length > 0) return "ok";
  if (result.entries.some((entry) => isUnlistedForm(result, entry))) return "unlistedForms";
  return "notApproved";
}

function normalizeTerm(text) {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^[^a-z0-9]+|[^a-z0-9-]+$/g, "");
}

/* ───────────────────────── lookup ───────────────────────── */

function runLookup(args, index) {
  const { search, limit = DEFAULT_LIMIT, json } = args.flags;
  if (search !== undefined) {
    if (args.positionals.length > 0) throw new UsageError("pass words or --search, not both", "lookup");
    return renderSearch(searchApproved(search, index, limit), json);
  }
  if (args.flags.limit !== undefined) throw new UsageError("--limit applies only to --search", "lookup");
  const queries = [...new Set(args.positionals.map(normalizeTerm))];
  if (queries.length === 0 || queries.includes("")) {
    throw new UsageError("lookup needs at least one word or phrase, or --search <text>", "lookup");
  }
  const results = queries.map((query) => ({ query, ...resolve(query, index.byLookup) }));
  return json ? JSON.stringify({ results: results.map(lookupResultJson) }, null, 2) : renderLookup(results);
}

function renderLookup(results) {
  const lines = [];
  for (const result of results) {
    if (result.via === "none") {
      lines.push(`${result.query}: no entry; ${NO_ENTRY}`);
      continue;
    }
    lines.push(result.via === "exact" ? `${result.query}:` : `${result.query}: no exact entry; inflection of ${result.stems.join(", ")}`);
    for (const entry of result.entries) {
      const note = isUnlistedForm(result, entry) ? `"${result.query}" is not a listed form` : "";
      lines.push(`  ${formatEntry(entry, note)}`);
    }
  }
  return lines.join("\n");
}

function formatEntry(entry, note = "") {
  const status = entry.approved ? "approved" : "not approved";
  const label = entry.approved ? "meaning" : "alternatives";
  return `${entry.word} [${status}${note ? `; ${note}` : ""}, ${entry.page}] ${label}: ${entry.definition}`;
}

function entryJson(entry) {
  const { word, headword, pos, approved, forms, definition, page } = entry;
  return { word, headword, pos, approved, forms, definition, page };
}

function lookupResultJson(result) {
  return {
    query: result.query,
    match: result.via,
    stems: result.stems,
    entries: result.entries.map((entry) => ({ ...entryJson(entry), unlistedForm: isUnlistedForm(result, entry) })),
  };
}

function searchApproved(text, index, limit) {
  const needle = normalizeTerm(text);
  if (!needle) throw new UsageError("--search needs a word or phrase", "lookup");
  // Match at word starts so "sure" finds MAKE SURE but not MEASURE.
  const pattern = new RegExp(`(?:^|[^a-z])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  const approved = index.entries.filter((entry) => entry.approved);
  const wordHits = approved.filter((entry) => pattern.test(entry.word));
  const meaningHits = approved.filter((entry) => !wordHits.includes(entry) && pattern.test(entry.definition));
  const matches = [...wordHits, ...meaningHits];
  return { search: needle, total: matches.length, limit, entries: matches.slice(0, limit) };
}

function renderSearch(result, json) {
  const truncated = result.total > result.entries.length;
  if (json) {
    const { search, total, entries } = result;
    return JSON.stringify({ search, total, truncated, entries: entries.map(entryJson) }, null, 2);
  }
  const lines = [`approved entries matching "${result.search}": ${result.total}`];
  for (const entry of result.entries) lines.push(`  ${formatEntry(entry)}`);
  if (truncated) {
    lines.push(`showing ${result.entries.length} of ${result.total}; narrow the text or rerun with --limit ${result.total}`);
  }
  return lines.join("\n");
}

/* ───────────────────────── scan ───────────────────────── */

function runScan(args, index) {
  const { file, mode = "procedure", limit = DEFAULT_LIMIT, json } = args.flags;
  if (args.positionals.length > 0) {
    throw new UsageError(`unexpected argument "${args.positionals[0]}"; pass the draft with --file <path|->`, "scan");
  }
  if (file === undefined) throw new UsageError("scan needs --file <path> (use - for stdin)", "scan");
  if (!(mode in WORD_LIMITS)) {
    throw new UsageError(`--mode must be ${Object.keys(WORD_LIMITS).join(" or ")}, got "${mode}"`, "scan");
  }
  let text;
  try {
    text = fs.readFileSync(file === "-" ? 0 : file, "utf8");
  } catch (error) {
    throw new UsageError(`cannot read --file ${file}: ${error.code ?? error.message}`, "scan");
  }
  const report = { source: file === "-" ? "<stdin>" : file, mode, maxWords: WORD_LIMITS[mode], ...scanText(text, index, WORD_LIMITS[mode]) };
  return json ? JSON.stringify(scanJson(report, limit), null, 2) : renderScan(report, limit);
}

function scanText(text, index, maxWords) {
  const longSentences = [];
  const vocabulary = new Map();
  let sentences = 0;
  let words = 0;
  for (const segment of markdownSegments(text)) {
    for (const sentence of splitSentences(segmentTokens(segment))) {
      const counted = sentence.filter(countsAsWord);
      sentences++;
      words += counted.length;
      if (counted.length > maxWords) {
        const start = counted.slice(0, 8).map((token) => token.raw.replaceAll(OPAQUE, "`…`"));
        longSentences.push({ line: sentence[0].line, words: counted.length, start: start.join(" ") });
      }
      collectVocabulary(sentence, index, vocabulary);
    }
  }
  const findings = { notApproved: [], unlistedForms: [], mixed: [], noEntry: [] };
  for (const item of vocabulary.values()) {
    const kind = classify(item.result);
    if (kind !== "ok") findings[kind].push(item);
  }
  return { sentences, words, longSentences, ...findings };
}

// Splits Markdown into runs of prose. A heading, list item, or table cell
// starts its own run, a blank line ends one, and wrapped lines continue it.
function markdownSegments(text) {
  const segments = [];
  let current = null;
  let fence = null;
  const close = () => {
    if (current) segments.push(current);
    current = null;
  };
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const content = raw.replace(/^\s*(?:>\s?)+/, "");
    const fenceMark = content.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (content.trim().startsWith(fence)) fence = null;
      return;
    }
    if (fenceMark) {
      close();
      fence = fenceMark;
      return;
    }
    if (!content.trim()) {
      close();
      return;
    }
    if (content.trim().startsWith("|")) {
      close();
      for (const cell of content.trim().replace(/^\||\|$/g, "").split("|")) {
        if (cell.trim() && !/^\s*:?-+:?\s*$/.test(cell)) segments.push({ parts: [{ text: cell, line }] });
      }
      return;
    }
    const heading = content.match(/^\s*#{1,6}\s+/);
    if (heading) {
      close();
      segments.push({ parts: [{ text: content.slice(heading[0].length).replace(/\s#+\s*$/, ""), line }] });
      return;
    }
    const listItem = content.match(/^\s*(?:[-*+]|\d+[.)])\s+/);
    if (listItem) {
      close();
      current = { parts: [{ text: content.slice(listItem[0].length), line }] };
      return;
    }
    current ??= { parts: [] };
    current.parts.push({ text: content, line });
  });
  close();
  return segments;
}

function cleanInline(text) {
  return text
    .replace(/`[^`]*`/g, ` ${OPAQUE} `)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<?https?:\/\/[^\s>]+>?/g, ` ${OPAQUE} `)
    .replace(/<[^>]+>/g, " ")
    .replace(/\*+|~~/g, "")
    .replace(/(^|[\s(])_+|_+(?=[\s).,;:!?]|$)/g, "$1");
}

function segmentTokens(segment) {
  const tokens = [];
  for (const part of segment.parts) {
    for (const [raw] of cleanInline(part.text).matchAll(/\S+/g)) tokens.push({ raw, line: part.line });
  }
  return tokens;
}

function splitSentences(tokens) {
  const sentences = [];
  let current = [];
  for (const token of tokens) {
    current.push(token);
    if (/[.!?]["'”’)\]]*$/.test(token.raw)) {
      sentences.push(current);
      current = [];
    }
  }
  sentences.push(current);
  return sentences.filter((sentence) => sentence.some(countsAsWord));
}

function countsAsWord(token) {
  return /[\p{L}\p{N}]/u.test(token.raw);
}

// Returns the dictionary-checkable word in a token, or null for numbers,
// identifiers, paths, code, and URLs.
function vocabularyWord(raw) {
  const word = raw
    .replace(/[‘’]/g, "'")
    .replace(/^[("'“[{]+|[)"'”\]}.,;:!?]+$/g, "")
    .replace(/'s$/i, "");
  return /^[A-Za-z]+(?:['-][A-Za-z]+)*$/.test(word) ? word : null;
}

// Phrase entries are matched before single words so "make sure" does not
// report "sure" and "such as" is reported as one finding.
function collectVocabulary(sentence, index, vocabulary) {
  const items = sentence.map((token) => ({ word: vocabularyWord(token.raw), line: token.line }));
  for (let i = 0; i < items.length; ) {
    if (!items[i].word) {
      i++;
      continue;
    }
    const phrase = matchPhrase(items, i, index);
    const text = phrase?.text ?? items[i].word.toLowerCase();
    const result = phrase?.result ?? resolve(text, index.byKey);
    const item = vocabulary.get(text) ?? { text, lines: [], result };
    if (!item.lines.includes(items[i].line)) item.lines.push(items[i].line);
    vocabulary.set(text, item);
    i += phrase?.length ?? 1;
  }
}

function matchPhrase(items, start, index) {
  for (let length = Math.min(index.maxPhraseWords, items.length - start); length >= 2; length--) {
    const words = items.slice(start, start + length);
    if (!words.every((item) => item.word)) continue;
    const text = words.map((item) => item.word.toLowerCase()).join(" ");
    const result = resolve(text, index.byKey);
    if (result.entries.length > 0) return { text, length, result };
  }
  return null;
}

function renderScan(report, limit) {
  const count = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;
  const lines = [
    `${report.source}: ${count(report.sentences, "sentence")}, ${count(report.words, "word")}; ${report.mode} mode, ${report.maxWords}-word sentence limit`,
  ];
  const section = (title, items, format) => {
    if (items.length === 0) return;
    lines.push(`${title}: ${items.length}`);
    for (const item of items.slice(0, limit)) lines.push(`  ${format(item)}`);
    if (items.length > limit) lines.push(`  … ${items.length - limit} more; rerun with --limit ${items.length}`);
  };
  const where = (item) => `${item.text} (${lineList(item.lines)})`;
  const alternatives = (entry) => `${entry.word} -> ${entry.definition}`;

  section(`long sentences (over ${report.maxWords} words)`, report.longSentences, (s) => `line ${s.line} (${s.words} words): ${s.start} …`);
  section("not approved", report.notApproved, (item) => `${where(item)}: ${item.result.entries.map(alternatives).join("; ")}`);
  section(
    "unlisted verb forms",
    report.unlistedForms,
    (item) => `${where(item)}: listed forms are ${item.result.entries.filter((e) => e.approved).map((e) => e.word).join("; ")}`,
  );
  section(
    "approved in some senses",
    report.mixed,
    (item) => `${where(item)}: ${item.result.entries.map((e) => (e.approved ? `${e.word} approved` : alternatives(e))).join("; ")}`,
  );
  if (report.noEntry.length > 0) {
    lines.push(`no entry (${NO_ENTRY}): ${report.noEntry.length}`);
    const shown = report.noEntry.slice(0, limit).map((item) => item.text);
    const more = report.noEntry.length > limit ? `, … ${report.noEntry.length - limit} more; rerun with --limit ${report.noEntry.length}` : "";
    lines.push(`  ${shown.join(", ")}${more}`);
  }
  const findings = report.longSentences.length + report.notApproved.length + report.unlistedForms.length + report.mixed.length + report.noEntry.length;
  lines.push(findings === 0 ? "no findings" : `Findings are advisory. Full entries: ${SELF} lookup <word>`);
  return lines.join("\n");
}

function lineList(lines) {
  const shown = lines.slice(0, 5).join(", ");
  const more = lines.length > 5 ? `, +${lines.length - 5} more` : "";
  return `${lines.length === 1 ? "line" : "lines"} ${shown}${more}`;
}

function scanJson(report, limit) {
  const page = (items, toJson) => ({
    total: items.length,
    truncated: items.length > limit,
    items: items.slice(0, limit).map(toJson),
  });
  const word = (item) => ({ text: item.text, lines: item.lines, entries: item.result.entries.map(entryJson) });
  return {
    source: report.source,
    mode: report.mode,
    maxWords: report.maxWords,
    sentences: report.sentences,
    words: report.words,
    longSentences: page(report.longSentences, (s) => s),
    notApproved: page(report.notApproved, word),
    unlistedForms: page(report.unlistedForms, word),
    mixed: page(report.mixed, word),
    noEntry: page(report.noEntry, (item) => ({ text: item.text, lines: item.lines })),
  };
}

main(process.argv.slice(2));
