import { z } from "zod";

const item = z.object({
  description: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(1000),
  unitPrice: z.number().int().min(0).max(100_000_000),
});

export const createSaleSchema = z
  .object({
    type: z.enum(["CASH", "CREDIT"]),
    customerId: z.string().uuid().optional(),
    items: z.array(item).min(1, "Agrega al menos un producto").max(100),
  })
  .refine((v) => v.type !== "CREDIT" || v.customerId, {
    message: "Un fiado requiere un cliente",
    path: ["customerId"],
  });

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD");

export const listSalesSchema = z.object({
  from: day.optional(),
  to: day.optional(),
  customerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const voidSaleSchema = z.object({
  reason: z.string().trim().min(3, "Indica el motivo").max(200),
});