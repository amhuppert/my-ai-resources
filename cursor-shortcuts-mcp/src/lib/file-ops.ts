import fs from "fs/promises";
import path from "path";
import writeFileAtomic from "write-file-atomic";
import lockfile from "proper-lockfile";
import {
  parseTree,
  printParseErrorCode,
  ParseError,
  parse,
} from "jsonc-parser";
import { FileOperationError, KeybindingEntry } from "./types.js";
import { getKeybindingsPath } from "./keybindings.js";

const LOCK_OPTIONS = {
  stale: 10000,
  retries: {
    retries: 3,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 2000,
    randomize: true,
  },
};

export async function createBackup(filePath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.backup.${timestamp}`;

  try {
    await fs.access(filePath);
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return backupPath;
    }
    throw new FileOperationError(
      `Failed to create backup: ${(error as Error).message}`,
      error as Error
    );
  }
}

export async function readKeybindings(): Promise<KeybindingEntry[]> {
  const filePath = getKeybindingsPath();

  try {
    await fs.access(filePath);
    const rawContent = await fs.readFile(filePath, "utf-8");

    if (!rawContent.trim()) {
      return [];
    }

    const errors: ParseError[] = [];
    const parsed = parse(rawContent, errors);

    if (errors.length > 0) {
      const errorMessages = errors
        .map(
          (err) => `${printParseErrorCode(err.error)} at offset ${err.offset}`
        )
        .join(", ");
      throw new FileOperationError(`JSON parse errors: ${errorMessages}`);
    }

    if (!Array.isArray(parsed)) {
      throw new FileOperationError("Keybindings file must contain an array");
    }

    return parsed as KeybindingEntry[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    if (error instanceof FileOperationError) {
      throw error;
    }
    throw new FileOperationError(
      `Failed to read keybindings: ${(error as Error).message}`,
      error as Error
    );
  }
}

export async function mergeKeybindings(
  existing: KeybindingEntry[],
  newEntries: KeybindingEntry[]
): Promise<{ merged: KeybindingEntry[]; conflicts: string[] }> {
  const conflicts: string[] = [];
  const merged = [...existing];

  for (const newEntry of newEntries) {
    const existingIndex = merged.findIndex(
      (entry) => entry.key === newEntry.key
    );

    if (existingIndex >= 0) {
      const existingEntry = merged[existingIndex];
      if (existingEntry.command !== newEntry.command) {
        conflicts.push(
          `Key ${newEntry.key} conflicts: existing "${existingEntry.command}" vs new "${newEntry.command}"`
        );
      }
      merged[existingIndex] = newEntry;
    } else {
      merged.push(newEntry);
    }
  }

  return { merged, conflicts };
}

export async function writeKeybindingsSafely(
  entries: KeybindingEntry[]
): Promise<void> {
  const filePath = getKeybindingsPath();
  const lockPath = `${filePath}.lock`;
  let backupPath: string | null = null;
  let release: (() => Promise<void>) | null = null;

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    release = await lockfile.lock(filePath, LOCK_OPTIONS);

    backupPath = await createBackup(filePath);

    const content = JSON.stringify(entries, null, 2);

    await writeFileAtomic(filePath, content, { encoding: "utf-8" });
  } catch (error) {
    if (
      backupPath &&
      backupPath !==
        `${filePath}.backup.${new Date().toISOString().replace(/[:.]/g, "-")}`
    ) {
      try {
        await fs.copyFile(backupPath, filePath);
      } catch (rollbackError) {
        throw new FileOperationError(
          `Failed to write keybindings and rollback failed: ${
            (rollbackError as Error).message
          }`,
          rollbackError as Error
        );
      }
    }

    throw new FileOperationError(
      `Failed to write keybindings: ${(error as Error).message}`,
      error as Error
    );
  } finally {
    if (release) {
      try {
        await release();
      } catch (releaseError) {
        console.error("Failed to release lock:", releaseError);
      }
    }
  }
}

export async function updateKeybindingsSafely(
  newEntries: KeybindingEntry[]
): Promise<string[]> {
  const existing = await readKeybindings();
  const { merged, conflicts } = await mergeKeybindings(existing, newEntries);
  await writeKeybindingsSafely(merged);
  return conflicts;
}
