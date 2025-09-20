import { z } from "zod";

export const RecommendShortcutsInputSchema = z.object({
  frequency: z.string().min(1),
  task_description: z.string().min(1),
});

export const UpdateShortcutInputSchema = z.object({
  keystroke: z.string().min(1),
  command: z.string().min(1),
  when: z.string().optional(),
});

export const KeybindingEntrySchema = z.object({
  key: z.string(),
  command: z.string(),
  when: z.string().optional(),
  args: z.record(z.unknown()).optional(),
});

export const ShortcutRecommendationSchema = z.object({
  keystroke: z.string(),
  mnemonic: z.string(),
  justification: z.string(),
  conflicts: z.array(
    z.object({
      keystroke: z.string(),
      mnemonic: z.string(),
    }),
  ),
});

export const ShortcutRecommendationResponseSchema = z.object({
  when: z.string(),
  recommendations: z.array(ShortcutRecommendationSchema),
  errors: z.array(z.string()),
});

export type RecommendShortcutsInput = z.infer<
  typeof RecommendShortcutsInputSchema
>;
export type UpdateShortcutInput = z.infer<typeof UpdateShortcutInputSchema>;
