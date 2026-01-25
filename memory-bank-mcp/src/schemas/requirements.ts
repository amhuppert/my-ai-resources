import { z } from "zod";
import { IdSchema, SlugSchema } from "./common.js";

export const RequirementSchema = z.object({
  id: IdSchema,
  feature_id: IdSchema,
  text: z.string().min(1),
  notes: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateRequirementInputSchema = z.object({
  text: z.string().min(1),
  notes: z.array(z.string()).optional(),
});

export const CreateRequirementsInputSchema = z.object({
  feature_slug: SlugSchema,
  requirements: z.array(CreateRequirementInputSchema).min(1),
});

export const GetRequirementInputSchema = z.object({
  id: IdSchema,
});

export const ListRequirementsInputSchema = z.object({
  feature_slug: SlugSchema,
});

export const UpdateRequirementInputSchema = z.object({
  id: IdSchema,
  text: z.string().min(1).optional(),
  notes: z.array(z.string()).optional(),
});

export const DeleteRequirementInputSchema = z.object({
  id: IdSchema,
});

export type Requirement = z.infer<typeof RequirementSchema>;
export type CreateRequirementInput = z.infer<
  typeof CreateRequirementInputSchema
>;
export type CreateRequirementsInput = z.infer<
  typeof CreateRequirementsInputSchema
>;
export type GetRequirementInput = z.infer<typeof GetRequirementInputSchema>;
export type ListRequirementsInput = z.infer<typeof ListRequirementsInputSchema>;
export type UpdateRequirementInput = z.infer<
  typeof UpdateRequirementInputSchema
>;
export type DeleteRequirementInput = z.infer<
  typeof DeleteRequirementInputSchema
>;
