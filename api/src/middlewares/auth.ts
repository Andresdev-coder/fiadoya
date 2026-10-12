import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "../generated/prisma/client";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

type TokenPayload = { sub: string; storeId: string; role: Role };

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(401, "Token requerido");

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as TokenPayload;
    req.user = { id: payload.sub, storeId: payload.storeId, role: payload.role };
    next();
  } catch {
    throw new AppError(401, "Token inválido o expirado");
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "No tienes permiso para esta acción");
    }
    next();
  };
}