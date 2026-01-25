import { z } from "zod";
import { IdSchema, SlugSchema, StatusSchema } from "./common.js";

export const TaskSchema = z.object({
  id: IdSchema,
  objective_id: IdSchema,
  text: z.string().min(1),
  status: StatusSchema,
  order: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateTaskInputSchema = z.object({
  text: z.string().min(1),
  status: StatusSchema.optional(),
});

export const CreateTasksInputSchema = z.object({
  objective_slug: SlugSchema,
  tasks: z.array(CreateTaskInputSchema).min(1),
});

export const GetTaskInputSchema = z.object({
  id: IdSchema,
});

export const ListTasksInputSchema = z.object({
  objective_slug: SlugSchema,
  status: StatusSchema.optional(),
});

export const UpdateTaskInputSchema = z.object({
  id: IdSchema,
  text: z.string().min(1).optional(),
  status: StatusSchema.optional(),
});

export const DeleteTaskInputSchema = z.object({
  id: IdSchema,
});

export const ReorderTasksInputSchema = z.object({
  objective_slug: SlugSchema,
  task_ids: z.array(IdSchema).min(1),
});

export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
export type CreateTasksInput = z.infer<typeof CreateTasksInputSchema>;
export type GetTaskInput = z.infer<typeof GetTaskInputSchema>;
export type ListTasksInput = z.infer<typeof ListTasksInputSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskInputSchema>;
export type ReorderTasksInput = z.infer<typeof ReorderTasksInputSchema>;
