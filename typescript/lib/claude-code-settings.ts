import { z } from 'zod';

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
  disableBypassPermissionsMode: z.literal('disable').optional(),
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
});

// Export types
export type Permissions = z.infer<typeof PermissionsSchema>;
export type ClaudeCodeSettings = z.infer<typeof ClaudeCodeSettingsSchema>;

/**
 * Validate Claude Code settings
 */
export function validateSettings(settings: unknown): ClaudeCodeSettings {
  return ClaudeCodeSettingsSchema.parse(settings);
}

/**
 * Parse Claude Code settings with error handling
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
 */
export function createDefaultSettings(): ClaudeCodeSettings {
  return ClaudeCodeSettingsSchema.parse({});
}