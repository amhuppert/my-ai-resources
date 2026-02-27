import { z } from "zod/v4";

export const WorktreeFilesSchema = z
  .object({
    $schema: z
      .string()
      .optional()
      .describe("JSON Schema reference for editor validation"),
    directories: z
      .array(z.string())
      .optional()
      .describe("Directories to copy from source repo to worktree"),
    files: z
      .array(z.string())
      .optional()
      .describe("Files to copy from source repo to worktree"),
  })
  .describe("Project-specific files to copy into new worktrees");

export type WorktreeFiles = z.infer<typeof WorktreeFilesSchema>;
