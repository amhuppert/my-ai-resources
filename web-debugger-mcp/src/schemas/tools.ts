import { z } from "zod";
import { ProviderNameSchema } from "./messages.js";

export const GetLogsInputSchema = z.object({});
export type GetLogsInput = z.infer<typeof GetLogsInputSchema>;

export const GetSnapshotInputSchema = z.object({
  provider: ProviderNameSchema.describe("Name of the state provider to snapshot"),
});
export type GetSnapshotInput = z.infer<typeof GetSnapshotInputSchema>;

export const ListProvidersInputSchema = z.object({});
export type ListProvidersInput = z.infer<typeof ListProvidersInputSchema>;
