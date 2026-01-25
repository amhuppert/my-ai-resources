import { z } from "zod";
import { IdSchema, SlugSchema } from "./common.js";

export const FeatureSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  name: z.string().min(1),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateFeatureInputSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1),
  description: z.string().optional(),
});

export const CreateFeaturesInputSchema = z.object({
  features: z.array(CreateFeatureInputSchema).min(1),
});

export const GetFeatureInputSchema = z.object({
  slug: SlugSchema,
});

export const ListFeaturesInputSchema = z.object({
  parent_slug: SlugSchema.optional(),
});

export const UpdateFeatureInputSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const DeleteFeatureInputSchema = z.object({
  slug: SlugSchema,
});

export type Feature = z.infer<typeof FeatureSchema>;
export type CreateFeatureInput = z.infer<typeof CreateFeatureInputSchema>;
export type CreateFeaturesInput = z.infer<typeof CreateFeaturesInputSchema>;
export type GetFeatureInput = z.infer<typeof GetFeatureInputSchema>;
export type ListFeaturesInput = z.infer<typeof ListFeaturesInputSchema>;
export type UpdateFeatureInput = z.infer<typeof UpdateFeatureInputSchema>;
export type DeleteFeatureInput = z.infer<typeof DeleteFeatureInputSchema>;
