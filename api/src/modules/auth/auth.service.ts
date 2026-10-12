import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/errorHandler";
import type { User } from "../../generated/prisma/client";
import { loginSchema, registerSchema } from "./auth.schemas";

function signToken(user: Pick<User, "id" | "storeId" | "role">) {
  return jwt.sign({ storeId: user.storeId, role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: "7d",
  });
}

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, storeId: user.storeId };
}

export async function register(input: z.infer<typeof registerSchema>) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new AppError(409, "Ese correo ya está registrado");

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const store = await tx.store.create({ data: { name: input.storeName } });
    return tx.user.create({
      data: {
        storeId: store.id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "OWNER",
      },
    });
  });

  return { token: signToken(user), user: publicUser(user) };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = user && user.active && (await bcrypt.compare(input.password, user.passwordHash));
  if (!user || !valid) throw new AppError(401, "Correo o contraseña incorrectos");

  return { token: signToken(user), user: publicUser(user) };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "Usuario no encontrado");
  return publicUser(user);
}