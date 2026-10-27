import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { createUserSchema, updateUserSchema } from "./users.schemas";
import { DEMO_LOCKED, isDemoAccount } from "../../utils/demo";

const MAX_USERS = 10; // por tienda: evita abuso en la demo pública

const publicFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export function list(storeId: string) {
  return prisma.user.findMany({
    where: { storeId },
    select: publicFields,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }], // el dueño primero
  });
}

/** Solo se crean cajeros: el rol de dueño nace únicamente al registrar la tienda. */
export async function createCashier(storeId: string, input: z.infer<typeof createUserSchema>) {
  if ((await prisma.user.count({ where: { storeId } })) >= MAX_USERS) {
    throw new AppError(409, `Cada tienda puede tener hasta ${MAX_USERS} usuarios`);
  }

  try {
    return await prisma.user.create({
      data: {
        storeId,
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: "CASHIER",
      },
      select: publicFields,
    });
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      throw new AppError(409, "Ese correo ya está registrado");
    }
    throw err;
  }
}

export async function updateCashier(storeId: string, id: string, input: z.infer<typeof updateUserSchema>) {
  const user = await prisma.user.findFirst({ where: { id, storeId } });
  if (!user) throw new AppError(404, "Usuario no encontrado");
  if (user.role !== "CASHIER") throw new AppError(403, "El dueño no se puede modificar desde aquí");
  if (isDemoAccount(user.email)) throw new AppError(403, DEMO_LOCKED);

  return prisma.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.active !== undefined && { active: input.active }),
      // Cambiar la contraseña también cierra las sesiones abiertas del cajero.
      ...(input.password !== undefined && {
        passwordHash: await bcrypt.hash(input.password, 10),
        passwordChangedAt: new Date(),
      }),
    },
    select: publicFields,
  });
}