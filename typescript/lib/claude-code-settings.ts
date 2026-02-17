import { z } from "zod";

/**
 * Valid hook types for Claude Code
 */
export const HookTypeSchema = z.enum(["command", "prompt", "agent"]);

/**
 * Valid hook events for Claude Code
 */
export const HookEventSchema = z.enum([
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PostToolUseFailure",
  "Notification",
  "SubagentStart",
  "SubagentStop",
  "Stop",
  "TeammateIdle",
  "TaskCompleted",
  "PreCompact",
  "SessionEnd",
]);

/**
 * Individual hook configuration.
 * Fields vary by type: command hooks use `command`, prompt/agent hooks use `prompt`.
 */
export const HookConfigSchema = z.object({
  type: HookTypeSchema,
  command: z.string().optional(),
  prompt: z.string().optional(),
  timeout: z.number().positive().optional(),
  async: z.boolean().optional(),
  model: z.string().optional(),
  statusMessage: z.string().optional(),
  once: z.boolean().optional(),
});

/**
 * Hook matcher configuration
 */
export const HookMatcherSchema = z.object({
  /** Pattern to match against (omit to match all) */
  matcher: z.string().optional(),
  /** Array of hooks to execute */
  hooks: z.array(HookConfigSchema),
});

/**
 * Hooks configuration for Claude Code.
 * Uses .passthrough() to accept new event types added in future Claude Code versions.
 */
export const HooksSchema = z
  .object({
    SessionStart: z.array(HookMatcherSchema).optional(),
    UserPromptSubmit: z.array(HookMatcherSchema).optional(),
    PreToolUse: z.array(HookMatcherSchema).optional(),
    PermissionRequest: z.array(HookMatcherSchema).optional(),
    PostToolUse: z.array(HookMatcherSchema).optional(),
    PostToolUseFailure: z.array(HookMatcherSchema).optional(),
    Notification: z.array(HookMatcherSchema).optional(),
    SubagentStart: z.array(HookMatcherSchema).optional(),
    SubagentStop: z.array(HookMatcherSchema).optional(),
    Stop: z.array(HookMatcherSchema).optional(),
    TeammateIdle: z.array(HookMatcherSchema).optional(),
    TaskCompleted: z.array(HookMatcherSchema).optional(),
    PreCompact: z.array(HookMatcherSchema).optional(),
    SessionEnd: z.array(HookMatcherSchema).optional(),
  })
  .passthrough();

/**
 * Permissions configuration for Claude Code
 */
export const PermissionsSchema = z.object({
  /** Array of allowed permission rules (e.g., "Bash(npm run lint)", "WebFetch") */
  allow: z.array(z.string()).optional(),
  /** Array of denied permission rules (e.g., "Bash(curl:*)", "WebFetch") */
  deny: z.array(z.string()).optional(),
  /** Additional directories that can be accessed */
  additionalDirectories: z.array(z.string()).optional(),
  /** Default permission mode */
  defaultMode: z.string().optional(),
  /** Disable bypass permissions mode */
  disableBypassPermissionsMode: z.literal("disable").optional(),
});

/**
 * Main Claude Code settings configuration
 */
export const ClaudeCodeSettingsSchema = z.object({
  /** Path to script for generating auth value */
  apiKeyHelper: z.string().optional(),
  /** Days to retain chat transcripts (default: 30) */
  cleanupPeriodDays: z.number().positive().optional(),
  /** Environment variables */
  env: z.record(z.string(), z.string()).optional(),
  /** Include "co-authored-by Claude" in git commits (default: true) */
  includeCoAuthoredBy: z.boolean().optional(),
  /** Permissions configuration */
  permissions: PermissionsSchema.optional(),
  /** Hooks configuration */
  hooks: HooksSchema.optional(),
});

// Export types
export type HookType = z.infer<typeof HookTypeSchema>;
export type HookEvent = z.infer<typeof HookEventSchema>;
export type HookConfig = z.infer<typeof HookConfigSchema>;
export type HookMatcher = z.infer<typeof HookMatcherSchema>;
export type Hooks = z.infer<typeof HooksSchema>;
export type Permissions = z.infer<typeof PermissionsSchema>;
export type ClaudeCodeSettings = z.infer<typeof ClaudeCodeSettingsSchema>;

/**
 * Validate Claude Code settings
 * TODO: We don't need this function, just use the Zod schema directly.
 */
export function validateSettings(settings: unknown): ClaudeCodeSettings {
  return ClaudeCodeSettingsSchema.parse(settings);
}

/**
 * Parse Claude Code settings with error handling
 * TODO: We don't need this function, just use the Zod schema directly.
 */
export function parseSettings(settings: unknown): {
  success: boolean;
  data?: ClaudeCodeSettings;
  error?: z.ZodError;
} {
  const result = ClaudeCodeSettingsSchema.safeParse(settings);
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    error: result.success ? undefined : result.error,
  };
}

/**
 * Create default Claude Code settings
 * TODO: Turn this into a const object instead of a function.
 */
export function createDefaultSettings(): ClaudeCodeSettings {
  return ClaudeCodeSettingsSchema.parse({});
}
