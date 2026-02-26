#!/usr/bin/env bun

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConfigSchema } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");

mkdirSync(distDir, { recursive: true });

// "input" mode: fields with defaults are optional (users don't need to specify them)
const jsonSchema = z.toJSONSchema(ConfigSchema, {
  target: "draft-07",
  io: "input",
});

writeFileSync(
  join(distDir, "voice-schema.json"),
  JSON.stringify(jsonSchema, null, 2),
);

console.log("Generated dist/voice-schema.json");
