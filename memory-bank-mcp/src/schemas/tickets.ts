import { z } from "zod";
import { IdSchema } from "./common.js";

export const TicketSchema = z.object({
  id: IdSchema,
  key: z.string().min(1),
  title: z.string().nullable(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateTicketInputSchema = z.object({
  key: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const CreateTicketsInputSchema = z.object({
  tickets: z.array(CreateTicketInputSchema).min(1),
});

export const GetTicketInputSchema = z.object({
  key: z.string().min(1),
});

export const ListTicketsInputSchema = z.object({});

export const UpdateTicketInputSchema = z.object({
  key: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const DeleteTicketInputSchema = z.object({
  key: z.string().min(1),
});

export type Ticket = z.infer<typeof TicketSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketInputSchema>;
export type CreateTicketsInput = z.infer<typeof CreateTicketsInputSchema>;
export type GetTicketInput = z.infer<typeof GetTicketInputSchema>;
export type ListTicketsInput = z.infer<typeof ListTicketsInputSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketInputSchema>;
export type DeleteTicketInput = z.infer<typeof DeleteTicketInputSchema>;
