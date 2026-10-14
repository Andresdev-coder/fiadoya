import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { dayRange } from "../../utils/dates";
import { getBalance, lockCustomer } from "../customers/customers.service";
import { createPaymentSchema, listPaymentsSchema } from "./payments.schemas";
import { assertDayOpen } from "../../utils/cashGuard";

type Ctx = { storeId: string; userId: string };

export async function create(ctx: Ctx, input: z.infer<typeof createPaymentSchema>) {
  return prisma.$transaction(async (tx) => {
    await lockCustomer(tx, ctx.storeId, input.customerId);

    const balance = await getBalance(ctx.storeId, input.customerId, tx);
    if (balance <= 0) throw new AppError(409, "El cliente no tiene deuda pendiente");
    if (input.amount > balance) {
      throw new AppError(409, `El abono (${input.amount}) supera el saldo del cliente (${balance})`);
    }

    const payment = await tx.payment.create({
      data: {
        storeId: ctx.storeId,
        customerId: input.customerId,
        amount: input.amount,
        method: input.method,
        note: input.note,
        createdById: ctx.userId,
      },
    });

    return { ...payment, balanceAfter: balance - input.amount };
  });
}

export async function list(storeId: string, q: z.infer<typeof listPaymentsSchema>) {
  return prisma.payment.findMany({
    where: { storeId, customerId: q.customerId, createdAt: dayRange(q.from, q.to) },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: q.limit,
  });
}

export async function voidPayment(ctx: Ctx, id: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id, storeId: ctx.storeId } });
    if (!payment) throw new AppError(404, "Abono no encontrado");
    if (payment.status === "VOIDED") throw new AppError(409, "El abono ya está anulado");

    // Serializa con ventas y otros abonos del mismo cliente.
    await lockCustomer(tx, ctx.storeId, payment.customerId);
    if (payment.method === "CASH") await assertDayOpen(tx, ctx.storeId, payment.createdAt);

    // La condición status evita anular dos veces si llegan dos peticiones a la vez.
    const result = await tx.payment.updateMany({
      where: { id, storeId: ctx.storeId, status: "ACTIVE" },
      data: { status: "VOIDED", voidReason: reason, voidedAt: new Date() },
    });
    if (result.count === 0) throw new AppError(409, "El abono ya está anulado");

    return tx.payment.findUniqueOrThrow({ where: { id } });
  });
}