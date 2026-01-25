import { z } from "zod";
import { IdSchema, SlugSchema, StatusSchema } from "./common.js";

export const ObjectiveSchema = z.object({
  id: IdSchema,
  slug: SlugSchema,
  name: z.string().min(1),
  description: z.string().nullable(),
  status: StatusSchema,
  plan_file_path: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateObjectiveInputSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  status: StatusSchema.optional(),
  plan_file_path: z.string().optional(),
});

export const GetObjectiveInputSchema = z.object({
  slug: SlugSchema,
});

export const ListObjectivesInputSchema = z.object({
  status: StatusSchema.optional(),
});

export const UpdateObjectiveInputSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: StatusSchema.optional(),
  plan_file_path: z.string().optional(),
});

export const DeleteObjectiveInputSchema = z.object({
  slug: SlugSchema,
});

export const LinkObjectiveToFeaturesInputSchema = z.object({
  objective_slug: SlugSchema,
  feature_slugs: z.array(SlugSchema).min(1),
});

export const UnlinkObjectiveFromFeatureInputSchema = z.object({
  objective_slug: SlugSchema,
  feature_slug: SlugSchema,
});

export const LinkObjectiveToTicketsInputSchema = z.object({
  objective_slug: SlugSchema,
  ticket_keys: z.array(z.string().min(1)).min(1),
});

export const UnlinkObjectiveFromTicketInputSchema = z.object({
  objective_slug: SlugSchema,
  ticket_key: z.string().min(1),
});

export type Objective = z.infer<typeof ObjectiveSchema>;
export type CreateObjectiveInput = z.infer<typeof CreateObjectiveInputSchema>;
export type GetObjectiveInput = z.infer<typeof GetObjectiveInputSchema>;
export type ListObjectivesInput = z.infer<typeof ListObjectivesInputSchema>;
export type UpdateObjectiveInput = z.infer<typeof UpdateObjectiveInputSchema>;
export type DeleteObjectiveInput = z.infer<typeof DeleteObjectiveInputSchema>;
export type LinkObjectiveToFeaturesInput = z.infer<
  typeof LinkObjectiveToFeaturesInputSchema
>;
export type UnlinkObjectiveFromFeatureInput = z.infer<
  typeof UnlinkObjectiveFromFeatureInputSchema
>;
export type LinkObjectiveToTicketsInput = z.infer<
  typeof LinkObjectiveToTicketsInputSchema
>;
export type UnlinkObjectiveFromTicketInput = z.infer<
  typeof UnlinkObjectiveFromTicketInputSchema
>;
