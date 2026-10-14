import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^\+?\d{7,15}$/, "Teléfono inválido (solo dígitos, 7 a 15)");

const base = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phone.optional(),
  creditLimit: z.number().int().min(0),
  notes: z.string().trim().max(300).optional(),
});

export const createCustomerSchema = base.extend({
  creditLimit: base.shape.creditLimit.default(0),
});

export const updateCustomerSchema = base.partial().extend({ active: z.boolean().optional() });

export const listCustomersSchema = z.object({
  search: z.string().trim().optional(),
  withDebt: z.enum(["true", "false"]).optional(),
});