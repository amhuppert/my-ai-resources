#!/usr/bin/env bun

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, "list-servers.tsx");
const outfile = join(here, "..", "..", "scripts", "list-servers");

const result = await Bun.build({
  entrypoints: [entry],
  target: "bun",
  minify: true,
  external: ["react-devtools-core"],
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const bundle = result.outputs[0];
if (!bundle) {
  console.error("Build produced no outputs");
  process.exit(1);
}

const code = await bundle.text();
writeFileSync(outfile, `#!/usr/bin/env bun\n${code}`, { mode: 0o755 });
const sizeKb = (code.length / 1024).toFixed(1);
console.log(`Built ${outfile} (${sizeKb} KB)`);
