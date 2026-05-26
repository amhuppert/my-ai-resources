import { z } from "zod";
import { ProviderNameSchema } from "./messages.js";

export const GetLogsInputSchema = z.object({});

export const GetSnapshotInputSchema = z.object({
  provider: ProviderNameSchema.describe("Name of the state provider to snapshot"),
});

export const ListProvidersInputSchema = z.object({});
