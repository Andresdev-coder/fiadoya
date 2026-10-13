import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD");

export const overdueSchema = z.object({
  minDays: z.coerce.number().int().min(0).default(0),
});

export const dailySummarySchema = z.object({
  date: day.optional(),
});

export const createClosingSchema = z.object({
  date: day.optional(),
  countedAmount: z.number().int().min(0).max(1_000_000_000),
});