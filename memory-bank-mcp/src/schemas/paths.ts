import { z } from "zod";
import {
  IdSchema,
  PathTypeSchema,
  SlugSchema,
  UseWhenSchema,
} from "./common.js";

export const PathSchema = z.object({
  id: IdSchema,
  path: z.string().min(1),
  type: PathTypeSchema,
  description: z.string().nullable(),
  use_when: UseWhenSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreatePathInputSchema = z.object({
  path: z.string().min(1),
  type: PathTypeSchema,
  description: z.string().optional(),
  use_when: UseWhenSchema.optional(),
});

export const CreatePathsInputSchema = z.object({
  paths: z.array(CreatePathInputSchema).min(1),
});

// For MCP tool registration - plain object schema (validation happens in tool)
export const GetPathInputSchema = z.object({
  id: IdSchema.optional(),
  path: z.string().min(1).optional(),
});

export const ListPathsInputSchema = z.object({
  feature_slug: SlugSchema.optional(),
  type: PathTypeSchema.optional(),
});

export const UpdatePathInputSchema = z.object({
  id: IdSchema,
  description: z.string().optional(),
  use_when: UseWhenSchema.optional(),
});

export const DeletePathInputSchema = z.object({
  id: IdSchema,
});

export const LinkPathsToFeatureInputSchema = z.object({
  feature_slug: SlugSchema,
  path_ids: z.array(IdSchema).min(1),
});

export const UnlinkPathFromFeatureInputSchema = z.object({
  feature_slug: SlugSchema,
  path_id: IdSchema,
});

export type Path = z.infer<typeof PathSchema>;
export type CreatePathInput = z.infer<typeof CreatePathInputSchema>;
export type CreatePathsInput = z.infer<typeof CreatePathsInputSchema>;
export type GetPathInput = z.infer<typeof GetPathInputSchema>;
export type ListPathsInput = z.infer<typeof ListPathsInputSchema>;
export type UpdatePathInput = z.infer<typeof UpdatePathInputSchema>;
export type DeletePathInput = z.infer<typeof DeletePathInputSchema>;
export type LinkPathsToFeatureInput = z.infer<
  typeof LinkPathsToFeatureInputSchema
>;
export type UnlinkPathFromFeatureInput = z.infer<
  typeof UnlinkPathFromFeatureInputSchema
>;
