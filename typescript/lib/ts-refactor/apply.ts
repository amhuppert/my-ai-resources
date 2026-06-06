import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { StaleApplyError } from "./errors";
import { fingerprintDirectory, sha256 } from "./fingerprint";
import type { ApplyResult, EditPlan, FileEdits, TextEdit } from "./types";

async function readIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return undefined;
    }
    throw err;
  }
}

type PathKind = "file" | "directory" | "missing";

async function pathKind(path: string): Promise<PathKind> {
  try {
    return (await stat(path)).isDirectory() ? "directory" : "file";
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return "missing";
    }
    throw err;
  }
}

// A rename source's fingerprint matches the engine's: sha256 of contents for a
// file, a directory-subtree digest for a directory (move-dir).
async function fingerprintRenameSource(from: string, kind: PathKind): Promise<string> {
  if (kind === "directory") {
    return fingerprintDirectory(from);
  }
  return sha256(await readFile(from, "utf8"));
}

function applyTextEdits(source: string, edits: readonly TextEdit[]): string {
  // Apply end-to-start so earlier offsets remain valid as later spans change.
  const ordered = [...edits].sort((a, b) => b.start.offset - a.start.offset);
  let result = source;
  for (const edit of ordered) {
    result =
      result.slice(0, edit.start.offset) +
      edit.newText +
      result.slice(edit.end.offset);
  }
  return result;
}

interface PreparedEdit {
  fileEdits: FileEdits;
  contents: string;
}

export async function applyEditPlan(
  plan: EditPlan,
  opts: { allowStale?: boolean; warn?: (msg: string) => void }
): Promise<ApplyResult> {
  const allowStale = opts.allowStale ?? false;
  const stalePaths: string[] = [];
  const collisionPaths: string[] = [];
  const preparedEdits: PreparedEdit[] = [];
  let relaxedStaleContent = false;

  for (const fileEdits of plan.fileEdits) {
    const contents = await readIfExists(fileEdits.filePath);
    // A missing file can never be edited, even under --allow-stale.
    if (contents === undefined) {
      stalePaths.push(fileEdits.filePath);
      continue;
    }
    if (sha256(contents) !== fileEdits.baseSha256) {
      if (!allowStale) {
        stalePaths.push(fileEdits.filePath);
        continue;
      }
      relaxedStaleContent = true;
    }
    preparedEdits.push({ fileEdits, contents });
  }

  const plannedDestinations = new Set<string>();
  for (const fileRename of plan.fileRenames) {
    const sourceKind = await pathKind(fileRename.from);
    // A missing source can never be renamed, even under --allow-stale.
    if (sourceKind === "missing") {
      stalePaths.push(fileRename.from);
    } else if (
      (await fingerprintRenameSource(fileRename.from, sourceKind)) !==
      fileRename.fromSha256
    ) {
      if (allowStale) {
        relaxedStaleContent = true;
      } else {
        stalePaths.push(fileRename.from);
      }
    }

    if (!fileRename.overwrite) {
      // Reject a destination that exists on disk OR is the target of an earlier
      // rename in this same plan (intra-plan collision would silently clobber).
      const destinationExists = (await pathKind(fileRename.to)) !== "missing";
      if (destinationExists || plannedDestinations.has(fileRename.to)) {
        collisionPaths.push(fileRename.to);
      }
    }
    plannedDestinations.add(fileRename.to);
  }

  if (collisionPaths.length > 0 || stalePaths.length > 0) {
    const offending = [...stalePaths, ...collisionPaths];
    const collisionNote =
      collisionPaths.length > 0
        ? ` destination collision(s): ${collisionPaths.join(", ")};`
        : "";
    const staleNote =
      stalePaths.length > 0
        ? ` stale content: ${stalePaths.join(", ")};`
        : "";
    throw new StaleApplyError(
      `Apply aborted: codebase changed since planning or destination exists.${staleNote}${collisionNote}`,
      offending
    );
  }

  if (relaxedStaleContent) {
    opts.warn?.(
      "--allow-stale: content-staleness checks were RELAXED; edits are being applied against files that changed since planning. Verify the result with a type-check."
    );
  }

  const written: string[] = [];
  for (const prepared of preparedEdits) {
    const next = applyTextEdits(prepared.contents, prepared.fileEdits.edits);
    await writeFile(prepared.fileEdits.filePath, next, "utf8");
    written.push(prepared.fileEdits.filePath);
  }

  for (const fileRename of plan.fileRenames) {
    await mkdir(dirname(fileRename.to), { recursive: true });
    await rename(fileRename.from, fileRename.to);
  }

  return { written, renamed: plan.fileRenames };
}
