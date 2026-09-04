#!/usr/bin/env node
/**
 * Render an interactive HTML review guide (and optionally the markdown guide)
 * from a YAML content file. File lists and line stats come from git, and the
 * renderer refuses to emit a guide that leaves any changed file unassigned.
 *
 *   node render-review-guide.mjs init   --base <ref> [--head <ref>] [--out guide.yaml] [--repo <dir>]
 *   node render-review-guide.mjs render <guide.yaml> [--html <file>] [--md <file>] [--check] [--repo <dir>]
 *
 * Zero dependencies. Node 18+.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, "..", "assets", "template.html");

/* ───────────────────────── CLI ───────────────────────── */

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[k] = true;
      else { out[k] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function fail(errors) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}

function usage() {
  console.error(
    "usage:\n  render-review-guide.mjs init --base <ref> [--head <ref>] [--out <file>] [--repo <dir>]\n  render-review-guide.mjs render <guide.yaml> [--html <file>] [--md <file>] [--check] [--repo <dir>]"
  );
  process.exit(2);
}

/* ───────────────────────── git ───────────────────────── */

function git(repo, args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function collectChanges(repo, base, head, useMergeBase) {
  let from = base;
  try {
    if (useMergeBase) from = git(repo, ["merge-base", base, head]).trim();
  } catch (e) {
    fail([`git merge-base ${base} ${head} failed in ${repo}: ${e.stderr?.toString().trim() || e.message}`]);
  }
  const range = `${from}..${head}`;
  const status = new Map();
  for (const line of git(repo, ["diff", "--name-status", "--no-renames", range]).split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    status.set(parts[parts.length - 1], parts[0][0]);
  }
  const files = [];
  for (const line of git(repo, ["diff", "--numstat", "--no-renames", range]).split("\n")) {
    if (!line) continue;
    const [a, d, p] = line.split("\t");
    files.push({ path: p, status: status.get(p) ?? "M", add: a === "-" ? 0 : Number(a), del: d === "-" ? 0 : Number(d) });
  }
  files.sort((x, y) => x.path.localeCompare(y.path));
  const commits = Number(git(repo, ["rev-list", "--count", range]).trim());
  const fromShort = git(repo, ["rev-parse", "--short", from]).trim();
  return { files, commits, from, fromShort, range };
}

/* ───────────────────────── YAML (subset) ─────────────────────────
 * Block mappings and sequences, "- key: value" items, plain / 'single' /
 * "double" scalars (multi-line plain scalars fold), block scalars | and >,
 * flow [a, b] and {a: b} with scalar members, comments. true/false/null and
 * integers are typed; every other scalar is a string.
 */

class YamlError extends Error {}

function parseYaml(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const p = new YamlParser(lines);
  const value = p.parseDocument();
  return value;
}

class YamlParser {
  constructor(lines) { this.lines = lines; this.i = 0; }

  isBlankOrComment(line) { return /^\s*(#.*)?$/.test(line); }

  peek() {
    while (this.i < this.lines.length && this.isBlankOrComment(this.lines[this.i])) this.i++;
    if (this.i >= this.lines.length) return null;
    const raw = this.lines[this.i];
    const indent = raw.match(/^ */)[0].length;
    return { indent, text: raw.slice(indent), line: this.i + 1 };
  }

  parseDocument() {
    const first = this.peek();
    if (!first) return null;
    if (first.text.startsWith("---")) { this.i++; }
    const start = this.peek();
    if (!start) return null;
    const v = this.parseBlock(start.indent);
    const rest = this.peek();
    if (rest && !rest.text.startsWith("...")) throw new YamlError(`line ${rest.line}: unexpected content "${rest.text}"`);
    return v;
  }

  parseBlock(indent) {
    const cur = this.peek();
    if (!cur) return null;
    if (cur.indent !== indent) throw new YamlError(`line ${cur.line}: bad indentation`);
    return this.isSeqItem(cur.text) ? this.parseSequence(indent) : this.parseMapping(indent);
  }

  isSeqItem(text) { return text === "-" || text.startsWith("- "); }

  parseSequence(indent) {
    const out = [];
    for (;;) {
      const cur = this.peek();
      if (!cur || cur.indent !== indent || !this.isSeqItem(cur.text)) break;
      const rest = cur.text === "-" ? "" : cur.text.slice(2);
      const restTrim = rest.trim();
      if (restTrim === "" || restTrim.startsWith("#")) {
        this.i++;
        const nxt = this.peek();
        out.push(nxt && nxt.indent > indent ? this.parseBlock(nxt.indent) : null);
      } else if (this.isSeqItem(restTrim)) {
        // nested sequence starting on the same line: re-indent and parse at that column
        const col = indent + 2 + (rest.length - rest.trimStart().length);
        this.lines[this.i] = " ".repeat(col) + restTrim;
        out.push(this.parseSequence(col));
      } else if (this.looksLikeKey(rest)) {
        // mapping inline in the item: re-indent the line and parse a mapping at that column
        const col = indent + 2 + (rest.length - rest.trimStart().length);
        this.lines[this.i] = " ".repeat(col) + rest.trimStart();
        out.push(this.parseMapping(col));
      } else {
        this.i++;
        out.push(this.parseScalarValue(rest.trimStart(), indent, cur.line));
      }
    }
    return out;
  }

  looksLikeKey(text) {
    const t = text.trimStart();
    if (t.startsWith("[") || t.startsWith("{")) return false;
    if (t.startsWith('"') || t.startsWith("'")) {
      const q = t[0];
      let j = 1;
      while (j < t.length && t[j] !== q) { if (t[j] === "\\" && q === '"') j++; j++; }
      return /^\s*:(\s|$)/.test(t.slice(j + 1));
    }
    return /^[^#\s][^#]*?:(\s|$)/.test(t) && !/^-\s/.test(t);
  }

  splitKey(text, line) {
    const t = text;
    if (t.startsWith('"') || t.startsWith("'")) {
      const q = t[0];
      let j = 1;
      while (j < t.length && t[j] !== q) { if (t[j] === "\\" && q === '"') j++; j++; }
      const key = this.parseScalar(t.slice(0, j + 1), line);
      const after = t.slice(j + 1).replace(/^\s*:/, "");
      if (after === t.slice(j + 1)) throw new YamlError(`line ${line}: expected ':' after key`);
      return [String(key), after.replace(/^\s/, "")];
    }
    const m = t.match(/^([^#]*?):(?:\s+|$)(.*)$/);
    if (!m) throw new YamlError(`line ${line}: expected "key: value", got "${t}"`);
    return [m[1].trim(), m[2]];
  }

  parseMapping(indent) {
    const out = {};
    for (;;) {
      const cur = this.peek();
      if (!cur || cur.indent !== indent) break;
      if (this.isSeqItem(cur.text)) break;
      const [key, rawValue] = this.splitKey(cur.text, cur.line);
      const value = stripComment(rawValue).trim();
      if (key in out) throw new YamlError(`line ${cur.line}: duplicate key "${key}"`);
      if (value === "") {
        this.i++;
        const nxt = this.peek();
        if (nxt && nxt.indent > indent) out[key] = this.parseBlock(nxt.indent);
        else if (nxt && nxt.indent === indent && this.isSeqItem(nxt.text)) out[key] = this.parseSequence(indent);
        else out[key] = null;
      } else if (/^[|>][+-]?$/.test(value)) {
        this.i++;
        out[key] = this.parseBlockScalar(value, indent);
      } else {
        this.i++;
        out[key] = this.parseScalarValue(rawValue.trim(), indent, cur.line);
      }
    }
    return out;
  }

  parseBlockScalar(header, parentIndent) {
    const folded = header[0] === ">";
    const chomp = header[1] === "-" ? "strip" : header[1] === "+" ? "keep" : "clip";
    const body = [];
    let blockIndent = null;
    while (this.i < this.lines.length) {
      const raw = this.lines[this.i];
      if (raw.trim() === "") { body.push(""); this.i++; continue; }
      const ind = raw.match(/^ */)[0].length;
      if (ind <= parentIndent) break;
      if (blockIndent === null) blockIndent = ind;
      if (ind < blockIndent) break;
      body.push(raw.slice(blockIndent));
      this.i++;
    }
    while (body.length && body[body.length - 1] === "") body.pop();
    let text;
    if (folded) {
      const parts = [];
      let para = [];
      for (const l of body) {
        if (l === "") { if (para.length) { parts.push(para.join(" ")); para = []; } parts.push(""); }
        else if (/^\s/.test(l)) { if (para.length) { parts.push(para.join(" ")); para = []; } parts.push(l); }
        else para.push(l);
      }
      if (para.length) parts.push(para.join(" "));
      text = parts.join("\n").replace(/\n\n/g, "\n");
    } else text = body.join("\n");
    if (chomp === "strip") return text;
    return text + "\n";
  }

  /** Scalar that may continue on following, more-indented lines. */
  parseScalarValue(first, indent, line) {
    let text = first;
    const quoted = text.startsWith('"') || text.startsWith("'");
    if (quoted) {
      const q = text[0];
      while (!closesQuote(text, q) && this.i < this.lines.length) {
        text += " " + this.lines[this.i].trim();
        this.i++;
      }
      const end = quoteEnd(text, q);
      const trailing = end === -1 ? "" : text.slice(end + 1).trim();
      if (end === -1 || (trailing !== "" && !trailing.startsWith("#"))) throw new YamlError(`line ${line}: unexpected text after closing quote`);
      return this.parseScalar(text.slice(0, end + 1), line);
    }
    if (text.startsWith("[") || text.startsWith("{")) {
      const open = text[0], close = open === "[" ? "]" : "}";
      while (!flowClosed(text, open, close) && this.i < this.lines.length) {
        text += " " + this.lines[this.i].trim();
        this.i++;
      }
      return this.parseScalar(text, line);
    }
    // plain: fold continuation lines that are indented deeper than the parent
    for (;;) {
      if (this.i >= this.lines.length) break;
      const raw = this.lines[this.i];
      if (raw.trim() === "") {
        // blank line inside a plain scalar: only continue if a deeper line follows
        let j = this.i;
        while (j < this.lines.length && this.lines[j].trim() === "") j++;
        if (j < this.lines.length && this.lines[j].match(/^ */)[0].length > indent && !/^\s*#/.test(this.lines[j])) {
          text += "\n"; this.i = j; continue;
        }
        break;
      }
      const ind = raw.match(/^ */)[0].length;
      if (ind <= indent || /^\s*#/.test(raw)) break;
      text += (text.endsWith("\n") ? "" : " ") + stripComment(raw.trim());
      this.i++;
    }
    return this.parseScalar(stripComment(text), line);
  }

  parseScalar(text, line) {
    const t = text.trim();
    if (t === "" || t === "~" || t === "null") return null;
    if (t === "true") return true;
    if (t === "false") return false;
    if (/^-?\d+$/.test(t)) return Number(t);
    if (t.startsWith('"')) {
      if (!t.endsWith('"') || t.length < 2) throw new YamlError(`line ${line}: unterminated string`);
      return t.slice(1, -1).replace(/\\(["\\nt])/g, (m, c) => ({ '"': '"', "\\": "\\", n: "\n", t: "\t" }[c]));
    }
    if (t.startsWith("'")) {
      if (!t.endsWith("'") || t.length < 2) throw new YamlError(`line ${line}: unterminated string`);
      return t.slice(1, -1).replace(/''/g, "'");
    }
    if (t.startsWith("[")) {
      if (!t.endsWith("]")) throw new YamlError(`line ${line}: unterminated flow sequence`);
      const inner = t.slice(1, -1).trim();
      return inner === "" ? [] : splitFlow(inner).map((s) => this.parseScalar(s, line));
    }
    if (t.startsWith("{")) {
      if (!t.endsWith("}")) throw new YamlError(`line ${line}: unterminated flow mapping`);
      const inner = t.slice(1, -1).trim();
      const obj = {};
      if (inner === "") return obj;
      for (const part of splitFlow(inner)) {
        const [k, v] = this.splitKey(part.trim(), line);
        obj[k] = this.parseScalar(v, line);
      }
      return obj;
    }
    return t;
  }
}

/** Index of the quote that closes a scalar opened at text[0], or -1. */
function quoteEnd(text, q) {
  let j = 1;
  while (j < text.length) {
    if (text[j] === "\\" && q === '"') { j += 2; continue; }
    if (text[j] === q) { if (q === "'" && text[j + 1] === "'") { j += 2; continue; } return j; }
    j++;
  }
  return -1;
}

function closesQuote(text, q) {
  let j = 1;
  while (j < text.length) {
    if (text[j] === "\\" && q === '"') { j += 2; continue; }
    if (text[j] === q) { if (q === "'" && text[j + 1] === "'") { j += 2; continue; } return j === text.length - 1 || /^\s*(#.*)?$/.test(text.slice(j + 1)); }
    j++;
  }
  return false;
}

function flowClosed(text, open, close) {
  let depth = 0, inQ = null;
  for (let j = 0; j < text.length; j++) {
    const c = text[j];
    if (inQ) { if (c === "\\" && inQ === '"') j++; else if (c === inQ) inQ = null; continue; }
    if (c === '"' || c === "'") inQ = c;
    else if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return true; }
  }
  return false;
}

function splitFlow(inner) {
  const out = [];
  let cur = "", depth = 0, inQ = null;
  for (let j = 0; j < inner.length; j++) {
    const c = inner[j];
    if (inQ) { cur += c; if (c === "\\" && inQ === '"') { cur += inner[++j]; } else if (c === inQ) inQ = null; continue; }
    if (c === '"' || c === "'") { inQ = c; cur += c; continue; }
    if (c === "[" || c === "{") depth++;
    if (c === "]" || c === "}") depth--;
    if (c === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim() !== "") out.push(cur.trim());
  return out;
}

function stripComment(s) {
  let inQ = null;
  for (let j = 0; j < s.length; j++) {
    const c = s[j];
    if (inQ) { if (c === "\\" && inQ === '"') j++; else if (c === inQ) inQ = null; continue; }
    if (c === '"' || c === "'") { inQ = c; continue; }
    if (c === "#" && (j === 0 || /\s/.test(s[j - 1]))) return s.slice(0, j).trimEnd();
  }
  return s;
}

/* ───────────────────────── validation ───────────────────────── */

const ID_RE = /^[a-z][a-z0-9-]*$/;

function asList(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
function isStr(v) { return typeof v === "string" && v.trim() !== ""; }

function validate(doc, errors) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) { errors.push("top level must be a mapping"); return; }
  if (!isStr(doc.title)) errors.push("title is required");
  if (!isStr(doc.lede)) errors.push("lede is required");
  if (!doc.scope || !isStr(doc.scope.base)) errors.push("scope.base is required");
  if (asList(doc.purpose).length === 0) errors.push("purpose needs at least one paragraph");
  for (const [i, p] of asList(doc.purpose).entries()) {
    if (typeof p === "string") continue;
    if (!p || typeof p !== "object" || !isStr(p.callout)) errors.push(`purpose[${i}] must be a string or {callout: ...}`);
  }
  const ids = new Map();
  const stops = asList(doc.stops), skim = asList(doc.skim);
  if (stops.length === 0) errors.push("stops needs at least one entry");
  for (const [i, s] of stops.entries()) checkEntry(s, `stops[${i}]`, ids, errors, "stop");
  for (const [i, s] of skim.entries()) checkEntry(s, `skim[${i}]`, ids, errors, "skim");
  for (const [i, f] of asList(doc.fundamentals).entries()) {
    if (!f || typeof f !== "object") { errors.push(`fundamentals[${i}] must be a mapping`); continue; }
    if (!isStr(f.title)) errors.push(`fundamentals[${i}].title is required`);
    if (!isStr(f.body)) errors.push(`fundamentals[${i}].body is required`);
    for (const ref of asList(f.forces)) if (!ids.has(String(ref))) errors.push(`fundamentals[${i}].forces references unknown id "${ref}"`);
  }
  if (asList(doc.fundamentals).length === 0) errors.push("fundamentals needs at least one entry");
  for (const [i, q] of asList(doc.questions).entries()) {
    if (!q || typeof q !== "object") { errors.push(`questions[${i}] must be a mapping`); continue; }
    if (!isStr(q.title)) errors.push(`questions[${i}].title is required`);
    if (!isStr(q.body)) errors.push(`questions[${i}].body is required`);
  }
  const un = asList(doc.unassigned);
  if (un.length) errors.push(`unassigned still lists ${un.length} file(s); move each into a stop or skim cluster: ${un.slice(0, 5).join(", ")}${un.length > 5 ? ", …" : ""}`);
  return ids;
}

function checkEntry(s, label, ids, errors, kind) {
  if (!s || typeof s !== "object") { errors.push(`${label} must be a mapping`); return; }
  if (!isStr(s.id)) errors.push(`${label}.id is required`);
  else if (!ID_RE.test(s.id)) errors.push(`${label}.id "${s.id}" must match ${ID_RE}`);
  else if (ids.has(s.id)) errors.push(`${label}.id "${s.id}" is already used`);
  else ids.set(s.id, kind);
  if (!isStr(s.title)) errors.push(`${label}.title is required`);
  if (asList(s.files).length === 0) errors.push(`${label}.files needs at least one path or glob`);
  if (kind === "skim" && !isStr(s.spot_check)) errors.push(`${label}.spot_check is required`);
  for (const [i, part] of asList(s.parts).entries()) {
    if (!part || !isStr(part.title) || !isStr(part.body)) errors.push(`${label}.parts[${i}] needs title and body`);
  }
}

/* ───────────────────────── file assignment ───────────────────────── */

function globToRegex(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") { i++; if (glob[i + 1] === "/") { i++; re += "(?:.*/)?"; } else re += ".*"; }
      else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(re + "$");
}

function assignFiles(doc, files, errors) {
  const entries = [...asList(doc.stops), ...asList(doc.skim)];
  const byPath = new Map(files.map((f) => [f.path, f]));
  const explicit = new Map(); // path -> id
  const globs = []; // {re, pattern, id}
  for (const e of entries) {
    if (!e || !e.id) continue;
    for (const raw of asList(e.files)) {
      const pat = String(raw).trim();
      if (/[*?]/.test(pat)) globs.push({ re: globToRegex(pat), pattern: pat, id: e.id, hits: 0 });
      else {
        if (!byPath.has(pat)) errors.push(`${e.id}: "${pat}" is not a changed file in this range`);
        else if (explicit.has(pat) && explicit.get(pat) !== e.id) errors.push(`"${pat}" is listed under both ${explicit.get(pat)} and ${e.id}`);
        explicit.set(pat, e.id);
      }
    }
  }
  const where = new Map();
  const conflicted = new Set();
  for (const f of files) {
    if (explicit.has(f.path)) { where.set(f.path, explicit.get(f.path)); continue; }
    const matches = globs.filter((g) => g.re.test(f.path));
    for (const g of matches) g.hits++;
    const distinct = [...new Set(matches.map((g) => g.id))];
    if (distinct.length === 1) where.set(f.path, distinct[0]);
    else if (distinct.length > 1) { conflicted.add(f.path); errors.push(`"${f.path}" matches globs from ${distinct.join(" and ")}; list it explicitly under one of them`); }
  }
  for (const g of globs) if (g.hits === 0 && !files.some((f) => explicit.has(f.path) && g.re.test(f.path))) errors.push(`${g.id}: glob "${g.pattern}" matches no changed file`);
  const missing = files.filter((f) => !where.has(f.path) && !conflicted.has(f.path)).map((f) => f.path);
  if (missing.length) {
    errors.push(`${missing.length} changed file(s) are not assigned to any stop or skim cluster:`);
    for (const m of missing) errors.push(`  unassigned: ${m}`);
  }
  return where;
}

/* ───────────────────────── inline markup ───────────────────────── */

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Inline subset: `code`, **bold**, [text](http… | #…), <kbd>Key</kbd> written as [[Key]]. Everything else is escaped. */
function inline(s) {
  let t = esc(String(s ?? "").trim());
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\[\[([^\]]+)\]\]/g, "<kbd>$1</kbd>");
  t = t.replace(/\[([^\]]+)\]\(((?:https?:\/\/|#)[^\s)]+)\)/g, '<a href="$2">$1</a>');
  return t;
}

function paragraphs(v) {
  return asList(v).filter(isStr).map((p) => `<p>${inline(p)}</p>`).join("\n");
}

/* ───────────────────────── HTML rendering ───────────────────────── */

const CHEV = '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3l5 5-5 5"/></svg>';

function shortLabel(entry) {
  if (isStr(entry.nav)) return entry.nav;
  return String(entry.title).replace(/`/g, "").replace(/\*\*/g, "");
}

function whereLabels(doc) {
  const where = {};
  asList(doc.stops).forEach((s, i) => { where[s.id] = `${i + 1} · ${shortLabel(s)}`; });
  asList(doc.skim).forEach((s) => { where[s.id] = `Skim · ${shortLabel(s)}`; });
  return where;
}

function renderNav(doc) {
  return asList(doc.stops).map((s, i) => `    <li class="sub"><a href="#${esc(s.id)}" data-n="${i + 1}">${inline(shortLabel(s))}</a></li>`).join("\n");
}

function renderPurpose(doc) {
  return asList(doc.purpose).map((p) => {
    if (typeof p === "string") return `  <p>${inline(p)}</p>`;
    const tone = p.tone === "warn" ? " warn" : "";
    return `  <div class="callout${tone}">${inline(p.callout)}</div>`;
  }).join("\n");
}

function renderFundamentals(doc, where) {
  return asList(doc.fundamentals).map((f, i) => {
    const forces = asList(f.forces).map((id) => {
      const label = String(id).startsWith("k-") || (where[id] || "").startsWith("Skim") ? `skim: ${shortLabel(findEntry(doc, id))}` : String(where[id] || id).split(" · ")[0];
      return `<a class="pill" href="#${esc(id)}">${inline(label)}</a>`;
    }).join("");
    return `    <article class="card"><span class="n">${i + 1}</span><h3>${inline(f.title)}</h3>\n      <p>${inline(f.body)}</p>${forces ? `\n      <div class="forces"><span>Forces</span>${forces}</div>` : ""}</article>`;
  }).join("\n");
}

function findEntry(doc, id) {
  return [...asList(doc.stops), ...asList(doc.skim)].find((e) => e && e.id === id) || { title: id };
}

function renderStop(s, i) {
  const lead = paragraphs(s.lead);
  const scrut = asList(s.scrutinize).filter(isStr);
  const parts = asList(s.parts).map((p) => `    <div class="sub-stop"><h4>${inline(p.title)}</h4><p>${inline(p.body)}</p></div>`).join("\n");
  const body = [
    lead,
    scrut.length ? `    <div class="lbl">Scrutinize</div><ul class="scrut">\n${scrut.map((x) => `      <li>${inline(x)}</li>`).join("\n")}\n    </ul>` : "",
    parts,
  ].filter(Boolean).join("\n");
  return `  <article class="stop" id="${esc(s.id)}"><div class="stop-head"><label class="check"><input type="checkbox" data-kind="stop" data-key="${esc(s.id)}"><i>✓</i></label><span class="stop-n">${i + 1}</span><span class="stop-title">${inline(s.title)}</span><span class="stop-count"></span>${CHEV}</div>
  <div class="stop-body"><div class="files" data-stop="${esc(s.id)}"></div>
${body}</div></article>`;
}

function renderSkim(s) {
  const body = paragraphs(s.body);
  return `  <article class="stop skim" id="${esc(s.id)}"><div class="stop-head"><span class="stop-title">${inline(s.title)}</span><span class="stop-count"></span>${CHEV}</div>
  <div class="stop-body"><div class="files" data-stop="${esc(s.id)}"></div>
${body ? body + "\n" : ""}    <div class="spot"><b>Spot-check</b><span>${inline(s.spot_check)}</span></div></div></article>`;
}

const TAG_TONE = { privacy: "sec", security: "sec", compliance: "sec", a11y: "beh", behaviour: "beh", behavior: "beh", docs: "doc", provenance: "doc", process: "doc" };

function renderQuestions(doc) {
  return asList(doc.questions).map((q, i) => {
    const tag = isStr(q.tag) ? `<span class="tag ${TAG_TONE[q.tag.toLowerCase()] || q.tone || "beh"}">${inline(q.tag)}</span>` : "";
    return `  <div class="q"><label class="check"><input type="checkbox" data-kind="q" data-key="q${i + 1}"><i>✓</i></label><div><h3>${inline(q.title)}${tag}</h3><p>${inline(q.body)}</p></div></div>`;
  }).join("\n");
}

function renderMeta(doc, changes, files) {
  const add = files.reduce((n, f) => n + f.add, 0), del = files.reduce((n, f) => n + f.del, 0);
  const head = doc.scope.head || "HEAD";
  const chips = [
    `<span class="chip">branch <b>${esc(doc.scope.label || head)}</b></span>`,
    `<span class="chip">base <b>${esc(doc.scope.base)} @ ${esc(changes.fromShort)}</b></span>`,
    `<span class="chip"><b>${changes.commits}</b> commit${changes.commits === 1 ? "" : "s"}</span>`,
    `<span class="chip"><b>${files.length}</b> files</span>`,
    `<span class="chip add"><b>+${add.toLocaleString("en-US")}</b></span>`,
    `<span class="chip del"><b>−${del.toLocaleString("en-US")}</b></span>`,
  ];
  return { chips: chips.join("\n    "), add, del };
}

function renderHtml(doc, changes, where) {
  const files = changes.files.map((f) => ({ ...f, stop: where.get(f.path) }));
  const template = fs.readFileSync(TEMPLATE, "utf8");
  const meta = renderMeta(doc, changes, files);
  const notes = [doc.intent, doc.tips === false ? null : (isStr(doc.tips) ? doc.tips : "Tick each stop as you review it; ticks and open panels are remembered in this browser. Click a file chip to copy its path. Press [[/]] to jump to the file filter.")]
    .filter(isStr).map((n) => `  <p class="faint note">${inline(n)}</p>`).join("\n");
  const ticket = isStr(doc.ticket) ? doc.ticket : "";
  const slots = {
    PAGE_TITLE: esc(`Review guide · ${doc.title}${ticket ? ` (${ticket})` : ""}`),
    BRAND_SUB: esc(ticket || doc.scope.label || doc.scope.head || ""),
    KICKER: inline(doc.kicker || "Merge request review"),
    TITLE: inline(doc.title),
    LEDE: inline(doc.lede),
    META: meta.chips,
    NOTES: notes,
    NAV_STOPS: renderNav(doc),
    PURPOSE: renderPurpose(doc),
    PURPOSE_SUB: inline(doc.purpose_subtitle || "What the change makes true"),
    FUNDAMENTALS: renderFundamentals(doc, whereLabels(doc)),
    STOPS: asList(doc.stops).map(renderStop).join("\n\n"),
    SKIM: asList(doc.skim).map(renderSkim).join("\n\n"),
    QUESTIONS: renderQuestions(doc),
    QUESTIONS_SECTION_CLASS: asList(doc.questions).length ? "" : " hidden",
    SKIM_SECTION_CLASS: asList(doc.skim).length ? "" : " hidden",
    STOP_TOTAL: String(asList(doc.stops).length),
    FILES_JSON: JSON.stringify(files),
    WHERE_JSON: JSON.stringify(whereLabels(doc)),
    STORAGE_KEY: esc(`rg:${ticket || slugify(doc.title)}:`),
  };
  let html = template;
  for (const [k, v] of Object.entries(slots)) html = html.split(`{{${k}}}`).join(v);
  const left = html.match(/\{\{[A-Z_]+\}\}/g);
  if (left) fail([`template has unfilled slots: ${[...new Set(left)].join(", ")}`]);
  return html;
}

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

/* ───────────────────────── Markdown rendering ───────────────────────── */

function md(s) { return String(s ?? "").trim().replace(/\[\[([^\]]+)\]\]/g, "<kbd>$1</kbd>"); }

function renderMarkdown(doc, changes, where) {
  const files = changes.files;
  const add = files.reduce((n, f) => n + f.add, 0), del = files.reduce((n, f) => n + f.del, 0);
  const out = [];
  const ticket = isStr(doc.ticket) ? ` (${doc.ticket})` : "";
  out.push(`# Review guide: ${md(doc.title)}${ticket}`, "");
  out.push(`**Scope:** branch \`${doc.scope.label || doc.scope.head || "HEAD"}\` against its merge base with \`${doc.scope.base}\` (\`${changes.fromShort}\`), ${changes.commits} commit${changes.commits === 1 ? "" : "s"}, ${files.length} files, +${add.toLocaleString("en-US")} / −${del.toLocaleString("en-US")}.${isStr(doc.intent) ? " " + md(doc.intent) : ""}`, "");
  out.push("## Purpose", "");
  for (const p of asList(doc.purpose)) out.push(typeof p === "string" ? md(p) : `> ${md(p.callout)}`, "");
  out.push("## Fundamental changes", "", "Ranked by how much of the diff each one accounts for.", "");
  const labels = whereLabels(doc);
  asList(doc.fundamentals).forEach((f, i) => {
    const forces = asList(f.forces).map((id) => labels[id] || id);
    out.push(`**${i + 1}. ${md(f.title)}.** ${md(f.body)}${forces.length ? ` Forces: ${forces.join("; ")}.` : ""}`, "");
  });
  out.push("## Review path", "");
  const filesFor = (id) => files.filter((f) => where.get(f.path) === id).map((f) => `\`${f.path}\`${f.status === "D" ? " (deleted)" : ""}`);
  asList(doc.stops).forEach((s, i) => {
    out.push(`${i + 1}. **${md(s.title)}** — ${filesFor(s.id).join(", ")}.`);
    for (const p of asList(s.lead).filter(isStr)) out.push(`   ${md(p)}`);
    for (const x of asList(s.scrutinize).filter(isStr)) out.push(`   - ${md(x)}`);
    for (const p of asList(s.parts)) out.push(`   - **${md(p.title)}:** ${md(p.body)}`);
    out.push("");
  });
  if (asList(doc.skim).length) {
    out.push("## Skim", "");
    for (const s of asList(doc.skim)) {
      const list = filesFor(s.id);
      out.push(`- **${md(s.title)}** (${list.length} file${list.length === 1 ? "" : "s"}): ${list.join(", ")}.${asList(s.body).filter(isStr).length ? " " + asList(s.body).filter(isStr).map(md).join(" ") : ""} Spot-check: ${md(s.spot_check)}`);
    }
    out.push("");
  }
  if (asList(doc.questions).length) {
    out.push("## Open questions", "");
    asList(doc.questions).forEach((q, i) => out.push(`${i + 1}. **${md(q.title)}.** ${md(q.body)}`));
    out.push("");
  }
  return out.join("\n");
}

/* ───────────────────────── commands ───────────────────────── */

function cmdInit(args) {
  if (!args.base) usage();
  const repo = path.resolve(args.repo || ".");
  const head = args.head || "HEAD";
  const changes = collectChanges(repo, args.base, head, args["merge-base"] !== "false");
  const outPath = path.resolve(args.out || "review-guide.yaml");
  if (fs.existsSync(outPath) && !args.force) fail([`${outPath} exists; pass --force to overwrite`]);
  let branch = head;
  try { if (head === "HEAD") branch = git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]).trim(); } catch { /* detached */ }
  const y = [];
  y.push(`# Review guide content. Schema: references/content-schema.md beside the renderer.`);
  y.push(`# Inline markup in any text: \`code\`, **bold**, [text](https://…), [[Key]] for a keycap.`);
  y.push(`title: ""                 # e.g. Scheduled report exports`);
  y.push(`ticket: ""                # optional, e.g. EXP-412`);
  y.push(`kicker: "Merge request review"`);
  y.push(`lede: ""                  # one paragraph: what the change is and what this guide does`);
  y.push(`scope:`);
  y.push(`  base: ${args.base}`);
  y.push(`  head: ${head}`);
  y.push(`  label: ${branch}`);
  y.push(`intent: "Intent is taken from … and code comments."`);
  y.push(``);
  y.push(`purpose:`);
  y.push(`  - ""`);
  y.push(`  # - callout: "**Heads up.** …"    # tone: warn for a warning`);
  y.push(`  #   tone: warn`);
  y.push(``);
  y.push(`fundamentals:                # ranked by diff share`);
  y.push(`  - title: ""`);
  y.push(`    body: ""`);
  y.push(`    forces: []               # ids of stops / skim clusters this decision drives`);
  y.push(``);
  y.push(`stops:                       # the review path, in reading order`);
  y.push(`  - id: s1`);
  y.push(`    nav: ""                  # short sidebar label`);
  y.push(`    title: ""`);
  y.push(`    files: []                # exact paths or globs; explicit paths win over globs`);
  y.push(`    lead: ""`);
  y.push(`    scrutinize:`);
  y.push(`      - ""`);
  y.push(`    # parts:                 # optional sub-stops`);
  y.push(`    #   - title: ""`);
  y.push(`    #     body: ""`);
  y.push(``);
  y.push(`skim:                        # mechanical clusters`);
  y.push(`  - id: k-specs`);
  y.push(`    title: ""`);
  y.push(`    files: []`);
  y.push(`    spot_check: ""`);
  y.push(``);
  y.push(`questions:`);
  y.push(`  - title: ""`);
  y.push(`    tag: ""                  # privacy | security | behaviour | docs | a11y | process`);
  y.push(`    body: ""`);
  y.push(``);
  y.push(`# Every path below must move into a stop or skim cluster. Render fails while any remain.`);
  y.push(`unassigned:`);
  for (const f of changes.files) y.push(`  - ${f.path}${f.status === "D" ? "   # deleted" : f.status === "A" ? "   # added" : ""}`);
  fs.writeFileSync(outPath, y.join("\n") + "\n");
  console.log(`wrote ${outPath} (${changes.files.length} files in ${changes.range}, ${changes.commits} commits)`);
}

function cmdRender(args) {
  const yamlPath = args._[1];
  if (!yamlPath) usage();
  const repo = path.resolve(args.repo || ".");
  let doc;
  try { doc = parseYaml(fs.readFileSync(yamlPath, "utf8")); }
  catch (e) { fail([`${yamlPath}: ${e.message}`]); }
  const errors = [];
  validate(doc, errors);
  if (errors.length) fail(errors);
  const changes = collectChanges(repo, doc.scope.base, doc.scope.head || "HEAD", doc.scope.merge_base !== false);
  const where = assignFiles(doc, changes.files, errors);
  if (errors.length) fail(errors);
  const stem = path.join(path.dirname(path.resolve(yamlPath)), path.basename(yamlPath).replace(/\.ya?ml$/, ""));
  const htmlOut = args.html === true ? `${stem}.html` : args.html;
  const mdOut = args.md === true ? `${stem}.md` : args.md;
  const html = renderHtml(doc, changes, where);
  const markdown = renderMarkdown(doc, changes, where);
  const counts = `${changes.files.length} files, ${asList(doc.stops).length} stops, ${asList(doc.skim).length} skim clusters, ${asList(doc.questions).length} questions`;
  if (args.check) { console.log(`ok (${counts})`); return; }
  const targets = [];
  const finalHtml = htmlOut || (mdOut ? null : `${stem}.html`);
  if (finalHtml) { fs.writeFileSync(finalHtml, html); targets.push(finalHtml); }
  if (mdOut) { fs.writeFileSync(mdOut, markdown); targets.push(mdOut); }
  console.log(`wrote ${targets.join(", ")} (${counts})`);
}

const args = parseArgs(process.argv.slice(2));
if (args._[0] === "init") cmdInit(args);
else if (args._[0] === "render") cmdRender(args);
else usage();
