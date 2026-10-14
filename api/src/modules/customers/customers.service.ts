import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";
import type { Prisma, Role } from "../../generated/prisma/client";
import {
  createCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from "./customers.schemas";
import { z } from "zod";

type Ctx = { storeId: string; role: Role };
export type Db = Prisma.TransactionClient;

/** Bloquea la fila del cliente hasta que termine la transacción. */
export async function lockCustomer(
  tx: Db,
  storeId: string,
  customerId: string,
) {
  const rows = await tx.$queryRaw<{ creditLimit: number; active: boolean }[]>`
    SELECT "creditLimit", "active" FROM "Customer"
    WHERE "id" = ${customerId} AND "storeId" = ${storeId}
    FOR UPDATE`;
  if (!rows[0]) throw new AppError(404, "Cliente no encontrado");
  return rows[0];
}

export async function balancesFor(
  storeId: string,
  customerIds?: string[],
  db: Db = prisma,
) {
  const customerFilter = customerIds ? { in: customerIds } : { not: null };

  const [sales, payments] = await Promise.all([
    db.sale.groupBy({
      by: ["customerId"],
      where: {
        storeId,
        type: "CREDIT",
        status: "ACTIVE",
        customerId: customerFilter,
      },
      _sum: { total: true },
    }),
    db.payment.groupBy({
      by: ["customerId"],
      where: {
        storeId,
        status: "ACTIVE",
        customerId: customerIds ? { in: customerIds } : undefined,
      },
      _sum: { amount: true },
    }),
  ]);

  const balances = new Map<string, number>();
  for (const s of sales) {
    if (s.customerId) balances.set(s.customerId, s._sum.total ?? 0);
  }
  for (const p of payments) {
    balances.set(
      p.customerId,
      (balances.get(p.customerId) ?? 0) - (p._sum.amount ?? 0),
    );
  }
  return balances;
}

export async function getBalance(
  storeId: string,
  customerId: string,
  db: Db = prisma,
) {
  const balances = await balancesFor(storeId, [customerId], db);
  return balances.get(customerId) ?? 0;
}

function withBalance<T extends { creditLimit: number; id: string }>(
  c: T,
  balance: number,
) {
  return { ...c, balance, available: Math.max(c.creditLimit - balance, 0) };
}

function handleUnique(err: unknown): never {
  if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
    throw new AppError(409, "Ya existe un cliente con ese teléfono");
  }
  throw err;
}

export async function list(
  ctx: Ctx,
  query: z.infer<typeof listCustomersSchema>,
) {
  const customers = await prisma.customer.findMany({
    where: {
      storeId: ctx.storeId,
      active: true,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search } },
        ],
      }),
    },
    orderBy: { name: "asc" },
  });

  const balances = await balancesFor(ctx.storeId);
  let result = customers.map((c) => withBalance(c, balances.get(c.id) ?? 0));

  if (query.withDebt === "true") result = result.filter((c) => c.balance > 0);
  return result;
}

export async function getById(ctx: Ctx, id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, storeId: ctx.storeId },
  });
  if (!customer) throw new AppError(404, "Cliente no encontrado");
  return withBalance(customer, await getBalance(ctx.storeId, id));
}

export async function create(
  ctx: Ctx,
  input: z.infer<typeof createCustomerSchema>,
) {
  // Solo el dueño define cupos; un cajero crea clientes con cupo 0.
  const creditLimit = ctx.role === "OWNER" ? input.creditLimit : 0;
  try {
    const customer = await prisma.customer.create({
      data: { ...input, creditLimit, storeId: ctx.storeId },
    });
    return withBalance(customer, 0);
  } catch (err) {
    handleUnique(err);
  }
}

export async function update(
  ctx: Ctx,
  id: string,
  input: z.infer<typeof updateCustomerSchema>,
) {
  if (input.creditLimit !== undefined && ctx.role !== "OWNER") {
    throw new AppError(403, "Solo el dueño puede cambiar el cupo");
  }

  const current = await getById(ctx, id);

  if (input.active === false && current.balance > 0) {
    throw new AppError(409, "No puedes desactivar un cliente que tiene deuda");
  }

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: input,
    });
    return withBalance(customer, current.balance);
  } catch (err) {
    handleUnique(err);
  }
}

type StatementEntry = {
  kind: "SALE" | "PAYMENT";
  id: string;
  date: Date;
  amount: number;
  status: "ACTIVE" | "VOIDED";
  detail: string;
};

export async function statement(ctx: Ctx, id: string) {
  const customer = await getById(ctx, id);

  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { storeId: ctx.storeId, customerId: id, type: "CREDIT" },
      include: { items: true },
    }),
    prisma.payment.findMany({
      where: { storeId: ctx.storeId, customerId: id },
    }),
  ]);

  const entries: StatementEntry[] = [
    ...sales.map((s) => ({
      kind: "SALE" as const,
      id: s.id,
      date: s.createdAt,
      amount: s.total,
      status: s.status,
      detail:
        s.status === "VOIDED"
          ? `Anulada: ${s.voidReason ?? "sin motivo"}`
          : s.items.map((i) => `${i.quantity} x ${i.description}`).join(", "),
    })),
    ...payments.map((p) => ({
      kind: "PAYMENT" as const,
      id: p.id,
      date: p.createdAt,
      amount: p.amount,
      status: p.status,
      detail:
        p.status === "VOIDED"
          ? `Anulado: ${p.voidReason ?? "sin motivo"}`
          : (p.note ?? `Abono (${p.method})`),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const lines = entries.map((e) => {
    if (e.status === "ACTIVE")
      running += e.kind === "SALE" ? e.amount : -e.amount;
    return { ...e, balanceAfter: running };
  });

  return { customer, balance: running, entries: lines };
}
