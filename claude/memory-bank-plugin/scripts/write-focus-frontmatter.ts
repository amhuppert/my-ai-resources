#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { mkdirSync } from "fs";

const FOCUS_PATH = "./memory-bank/focus.md";

interface Frontmatter {
  "objective-slug"?: string;
  "feature-slugs"?: string[];
}

function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  if (!content.startsWith("---\n")) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = content.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const fmContent = content.slice(4, endIndex);
  const body = content.slice(endIndex + 5);
  const frontmatter: Frontmatter = {};

  // Parse objective-slug
  const slugMatch = fmContent.match(/^objective-slug:\s*(.+)$/m);
  if (slugMatch) {
    frontmatter["objective-slug"] = slugMatch[1]
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  // Parse feature-slugs
  const featuresMatch = fmContent.match(
    /^feature-slugs:\s*\n((?:\s+-\s+.+\n?)+)/m,
  );
  if (featuresMatch) {
    frontmatter["feature-slugs"] = [];
    const lines = featuresMatch[1].split("\n");
    for (const line of lines) {
      const itemMatch = line.match(/^\s+-\s+(.+)$/);
      if (itemMatch) {
        frontmatter["feature-slugs"].push(
          itemMatch[1].trim().replace(/^["']|["']$/g, ""),
        );
      }
    }
  }

  return { frontmatter, body };
}

function serializeFrontmatter(fm: Frontmatter): string {
  const lines: string[] = [];

  if (fm["objective-slug"]) {
    lines.push(`objective-slug: ${fm["objective-slug"]}`);
  }

  if (fm["feature-slugs"] && fm["feature-slugs"].length > 0) {
    lines.push("feature-slugs:");
    for (const slug of fm["feature-slugs"]) {
      lines.push(`  - ${slug}`);
    }
  }

  if (lines.length === 0) {
    return "";
  }

  return `---\n${lines.join("\n")}\n---\n`;
}

// Main
const action = process.argv[2];
const args = process.argv.slice(3);

if (!action) {
  console.log(
    JSON.stringify({
      success: false,
      message: "Usage: write-focus-frontmatter.ts <action> [args...]",
    }),
  );
  process.exit(1);
}

const absolutePath = resolve(FOCUS_PATH);

// Ensure directory exists
mkdirSync(dirname(absolutePath), { recursive: true });

// Read existing content or create default
let content = "";
if (existsSync(absolutePath)) {
  content = readFileSync(absolutePath, "utf-8");
}

const { frontmatter, body } = parseFrontmatter(content);

switch (action) {
  case "set-objective":
    if (!args[0]) {
      console.log(
        JSON.stringify({ success: false, message: "Missing slug argument" }),
      );
      process.exit(1);
    }
    frontmatter["objective-slug"] = args[0];
    break;

  case "clear-objective":
    delete frontmatter["objective-slug"];
    break;

  case "set-features":
    frontmatter["feature-slugs"] = args;
    break;

  case "clear-features":
    delete frontmatter["feature-slugs"];
    break;

  default:
    console.log(
      JSON.stringify({ success: false, message: `Unknown action: ${action}` }),
    );
    process.exit(1);
}

const newFrontmatter = serializeFrontmatter(frontmatter);
const newContent = newFrontmatter + body;

writeFileSync(absolutePath, newContent);
console.log(
  JSON.stringify({ success: true, message: `Updated focus.md frontmatter` }),
);
