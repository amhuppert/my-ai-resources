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
const HooksSchema = z
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
 * Claude Code settings file shape, narrowed to the `hooks` section the hook
 * installer manages. `.passthrough()` preserves every other key (permissions,
 * env, enabledPlugins, …) verbatim on the read-modify-write round trip.
 */
export const ClaudeCodeSettingsSchema = z
  .object({
    hooks: HooksSchema.optional(),
  })
  .passthrough();

// Export types
export type HookType = z.infer<typeof HookTypeSchema>;
export type HookEvent = z.infer<typeof HookEventSchema>;
export type HookConfig = z.infer<typeof HookConfigSchema>;
export type HookMatcher = z.infer<typeof HookMatcherSchema>;
export type ClaudeCodeSettings = z.infer<typeof ClaudeCodeSettingsSchema>;
