import { z } from "zod";

export const registerSchema = z.object({
  storeName: z.string().min(2).max(80),
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});