#!/usr/bin/env bun

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const focusPath = process.argv[2] || "./memory-bank/focus.md";
const absolutePath = resolve(focusPath);

interface FocusFrontmatter {
  found: boolean;
  objective_slug: string | null;
  feature_slugs: string[];
}

function parseFrontmatter(content: string): FocusFrontmatter {
  const result: FocusFrontmatter = {
    found: false,
    objective_slug: null,
    feature_slugs: [],
  };

  // Check for frontmatter delimiters
  if (!content.startsWith("---\n")) {
    return result;
  }

  const endIndex = content.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return result;
  }

  const frontmatter = content.slice(4, endIndex);
  result.found = true;

  // Parse objective-slug
  const slugMatch = frontmatter.match(/^objective-slug:\s*(.+)$/m);
  if (slugMatch) {
    result.objective_slug = slugMatch[1].trim().replace(/^["']|["']$/g, "");
  }

  // Parse feature-slugs (YAML array)
  const featuresMatch = frontmatter.match(
    /^feature-slugs:\s*\n((?:\s+-\s+.+\n?)+)/m,
  );
  if (featuresMatch) {
    const lines = featuresMatch[1].split("\n");
    for (const line of lines) {
      const itemMatch = line.match(/^\s+-\s+(.+)$/);
      if (itemMatch) {
        result.feature_slugs.push(
          itemMatch[1].trim().replace(/^["']|["']$/g, ""),
        );
      }
    }
  }

  return result;
}

// Main
if (!existsSync(absolutePath)) {
  console.log(
    JSON.stringify({ found: false, objective_slug: null, feature_slugs: [] }),
  );
  process.exit(0);
}

const content = readFileSync(absolutePath, "utf-8");
const result = parseFrontmatter(content);
console.log(JSON.stringify(result));
