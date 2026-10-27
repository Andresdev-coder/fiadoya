import { z } from "zod";

export const registerSchema = z.object({
  storeName: z.string().min(2).max(80),
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres").max(72),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "La nueva contraseña debe ser distinta de la actual",
    path: ["newPassword"],
  });

export const recoveryCodeSchema = z.object({
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const recoverSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  recoveryCode: z.string().trim().min(8).max(40),
  newPassword: z.string().min(8, "Mínimo 8 caracteres").max(72),
});