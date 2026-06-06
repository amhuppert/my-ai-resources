import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function sha256OfFile(absPath: string): string {
  return sha256(readFileSync(absPath, "utf8"));
}

// Stable digest of a directory subtree: every contained file's absolute path
// plus its content hash, sorted, so any add/remove/edit under the directory
// changes the digest. Computed from the filesystem so the engine (plan time)
// and the apply executor (apply time) derive an identical fingerprint, making
// directory-move staleness detectable.
export function fingerprintDirectory(dirPath: string): string {
  const lines: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const abs = join(dir, name);
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        walk(abs);
      } else if (stat.isFile()) {
        lines.push(`${abs}:${sha256OfFile(abs)}`);
      }
    }
  };
  walk(dirPath);
  return sha256(lines.sort().join("\n"));
}
