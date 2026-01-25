import { z } from "zod";

export const SlugSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/,
    "Slug must be lowercase alphanumeric with hyphens, separated by forward slashes for hierarchy",
  );

export const IdSchema = z.string().length(12);

export const StatusSchema = z.enum(["pending", "in_progress", "completed"]);

export const PathTypeSchema = z.enum(["file", "directory"]);

export const UseWhenSchema = z.array(z.string());

export const TimestampSchema = z.string().datetime();

export type Slug = z.infer<typeof SlugSchema>;
export type Id = z.infer<typeof IdSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type PathType = z.infer<typeof PathTypeSchema>;
export type UseWhen = z.infer<typeof UseWhenSchema>;

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}
