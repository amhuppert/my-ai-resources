#!/usr/bin/env bun

const input = process.argv[2];

if (!input) {
  console.log(
    JSON.stringify({
      success: false,
      error:
        "Usage: parse-quick-add-args.ts '<path> \"<description>\" <feature-slug>'",
    }),
  );
  process.exit(1);
}

// Parse: path "description" feature-slug
// Description is quoted, path and feature-slug are not
const regex = /^(\S+)\s+"([^"]+)"\s+(\S+)$/;
const match = input.match(regex);

if (!match) {
  console.log(
    JSON.stringify({
      success: false,
      error: 'Invalid format. Expected: <path> "<description>" <feature-slug>',
    }),
  );
  process.exit(1);
}

const [, path, description, feature_slug] = match;

// Normalize path (remove leading ./)
const normalizedPath = path.replace(/^\.\//, "");

// Determine type
const type = normalizedPath.endsWith("/") ? "directory" : "file";

console.log(
  JSON.stringify({
    success: true,
    path: normalizedPath,
    type,
    description,
    feature_slug,
  }),
);
