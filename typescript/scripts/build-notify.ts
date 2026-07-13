#!/usr/bin/env bun

import { chmodSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, "notify.ts");
const outfile = join(here, "..", "..", "scripts", "notify");

const proc = Bun.spawn(
  [
    process.execPath,
    "build",
    "--compile",
    "--minify",
    entry,
    "--outfile",
    outfile,
  ],
  { cwd: join(here, ".."), stdout: "pipe", stderr: "pipe" },
);
const [exitCode, stdout, stderr] = await Promise.all([
  proc.exited,
  new Response(proc.stdout).text(),
  new Response(proc.stderr).text(),
]);

if (exitCode !== 0) {
  console.error("Build failed:");
  if (stdout.trim().length > 0) console.error(stdout.trim());
  if (stderr.trim().length > 0) console.error(stderr.trim());
  process.exit(1);
}

chmodSync(outfile, 0o755);
const sizeMb = (statSync(outfile).size / 1024 / 1024).toFixed(1);
console.log(`Built ${outfile} (${sizeMb} MB)`);
