import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^\+?\d{7,15}$/, "Teléfono inválido (solo dígitos, 7 a 15)");

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phone.optional(),
  creditLimit: z.number().int().min(0).default(0),
  notes: z.string().trim().max(300).optional(),
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .extend({ active: z.boolean().optional() });

export const listCustomersSchema = z.object({
  search: z.string().trim().optional(),
  withDebt: z.enum(["true", "false"]).optional(),
});