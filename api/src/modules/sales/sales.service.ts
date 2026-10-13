import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { getBalance, lockCustomer } from "../customers/customers.service";
import { createSaleSchema, listSalesSchema } from "./sales.schemas";
import {dayRange} from "../../utils/dates"

type Ctx = { storeId: string; userId: string };


export async function create(ctx: Ctx, input: z.infer<typeof createSaleSchema>) {
  const total = input.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  if (total <= 0) throw new AppError(400, "El total debe ser mayor a 0");

  return prisma.$transaction(async (tx) => {
    if (input.customerId) {
      const customer = await lockCustomer(tx, ctx.storeId, input.customerId);
      if (!customer.active) throw new AppError(409, "El cliente está inactivo");

      if (input.type === "CREDIT") {
        const balance = await getBalance(ctx.storeId, input.customerId, tx);
        if (balance + total > customer.creditLimit) {
          const available = Math.max(customer.creditLimit - balance, 0);
          throw new AppError(
            409,
            `Supera el cupo del cliente. Saldo: ${balance}, cupo: ${customer.creditLimit}, disponible: ${available}`,
          );
        }
      }
    }

    return tx.sale.create({
      data: {
        storeId: ctx.storeId,
        customerId: input.customerId,
        type: input.type,
        total,
        createdById: ctx.userId,
        items: { create: input.items },
      },
      include: { items: true },
    });
  });
}

export async function list(storeId: string, q: z.infer<typeof listSalesSchema>) {

  return prisma.sale.findMany({
    where: {
      storeId,
      customerId: q.customerId,
      createdAt: dayRange(q.from, q.to),
    },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: q.limit,
  });
}

export async function getById(storeId: string, id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, storeId },
    include: {
      items: true,
      customer: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!sale) throw new AppError(404, "Venta no encontrada");
  return sale;
}

export async function voidSale(ctx: Ctx, id: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id, storeId: ctx.storeId } });
    if (!sale) throw new AppError(404, "Venta no encontrada");
    if (sale.status === "VOIDED") throw new AppError(409, "La venta ya está anulada");

    if (sale.type === "CREDIT" && sale.customerId) {
      await lockCustomer(tx, ctx.storeId, sale.customerId);
      const balance = await getBalance(ctx.storeId, sale.customerId, tx);
      if (balance - sale.total < 0) {
        throw new AppError(
          409,
          "No se puede anular: el cliente ya abonó más de lo que quedaría debiendo",
        );
      }
    }

    return tx.sale.update({
      where: { id },
      data: { status: "VOIDED", voidReason: reason },
    });
  });
}