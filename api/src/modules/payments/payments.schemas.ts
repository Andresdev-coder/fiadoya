import { z } from "zod";

export const createPaymentSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().int().min(1, "El abono debe ser mayor a 0").max(100_000_000),
  method: z.enum(["CASH", "TRANSFER", "OTHER"]).default("CASH"),
  note: z.string().trim().max(200).optional(),
});

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD");

export const listPaymentsSchema = z.object({
  from: day.optional(),
  to: day.optional(),
  customerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(3, "Indica el motivo").max(200),
});
