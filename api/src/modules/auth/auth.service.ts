import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import type { User } from "../../generated/prisma/client";
import { AppError } from "../../middlewares/errorHandler";
import { DEMO_LOCKED, isDemoAccount } from "../../utils/demo";
import { changePasswordSchema, loginSchema, recoverSchema, registerSchema } from "./auth.schemas";

// Alfabeto sin caracteres que se confunden (0/O, 1/I/L): 31 símbolos x 16 posiciones ≈ 79 bits.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 16;
const DUMMY_HASH = bcrypt.hashSync("relleno-para-igualar-tiempos", 10);

function signToken(user: Pick<User, "id" | "storeId" | "role">) {
  return jwt.sign({ storeId: user.storeId, role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: "7d",
  });
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
    hasRecoveryCode: user.recoveryCodeHash !== null,
    isDemo: isDemoAccount(user.email),
  };
}

function makeRecoveryCode() {
  const raw = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return { raw, display: raw.match(/.{4}/g)!.join("-") };
}

/** Acepta el código en minúsculas, con espacios o sin guiones. */
const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

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

export async function changePassword(userId: string, input: z.infer<typeof changePasswordSchema>) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "Usuario no encontrado");
  if (isDemoAccount(user.email)) throw new AppError(403, DEMO_LOCKED);

  // 400 y no 401: el cliente web trata un 401 como sesión vencida y cerraría la sesión.
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new AppError(400, "La contraseña actual es incorrecta");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(input.newPassword, 10), passwordChangedAt: new Date() },
  });
  // Las demás sesiones se cierran; esta continúa con un token nuevo.
  return { token: signToken(updated), user: publicUser(updated) };
}

export async function issueRecoveryCode(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "Usuario no encontrado");
  if (isDemoAccount(user.email)) throw new AppError(403, DEMO_LOCKED);
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(400, "La contraseña es incorrecta");
  }

  const code = makeRecoveryCode();
  await prisma.user.update({
    where: { id: userId },
    data: { recoveryCodeHash: await bcrypt.hash(code.raw, 10) },
  });
  // Es la única vez que se muestra: en la base solo queda el hash.
  return { recoveryCode: code.display };
}

export async function recover(input: z.infer<typeof recoverSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (user && isDemoAccount(user.email)) throw new AppError(403, DEMO_LOCKED);

  // Se compara siempre contra un hash, exista o no el correo, para no delatar cuáles existen.
  const matches = await bcrypt.compare(normalizeCode(input.recoveryCode), user?.recoveryCodeHash ?? DUMMY_HASH);
  if (!user || !user.active || user.role !== "OWNER" || !user.recoveryCodeHash || !matches) {
    throw new AppError(400, "Correo o código de recuperación incorrectos");
  }

  // La condición sobre el hash hace que, si dos peticiones usan el mismo código a la vez, solo una lo consuma.
  const consumed = await prisma.user.updateMany({
    where: { id: user.id, recoveryCodeHash: user.recoveryCodeHash },
    data: {
      passwordHash: await bcrypt.hash(input.newPassword, 10),
      passwordChangedAt: new Date(),
      recoveryCodeHash: null, // un código sirve una sola vez
    },
  });
  if (consumed.count === 0) throw new AppError(400, "Correo o código de recuperación incorrectos");

  const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  return { token: signToken(updated), user: publicUser(updated) };
}