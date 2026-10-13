import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { dayRange, todayCO } from "../../utils/dates";
import { balancesFor } from "../customers/customers.service";

const DAY_MS = 86_400_000;

export async function overdue(storeId: string, minDays: number) {
  const balances = await balancesFor(storeId);
  const debtorIds = [...balances].filter(([, b]) => b > 0).map(([id]) => id);
  if (debtorIds.length === 0) return { count: 0, totalDebt: 0, customers: [] };

  const [customers, payments, sales] = await Promise.all([
    prisma.customer.findMany({
      where: { storeId, id: { in: debtorIds } },
      select: { id: true, name: true, phone: true, creditLimit: true },
    }),
    prisma.payment.groupBy({
      by: ["customerId"],
      where: { storeId, customerId: { in: debtorIds } },
      _sum: { amount: true },
      _max: { createdAt: true },
    }),
    prisma.sale.findMany({
      where: { storeId, type: "CREDIT", status: "ACTIVE", customerId: { in: debtorIds } },
      select: { customerId: true, total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const paymentInfo = new Map(
    payments.map((p) => [p.customerId, { paid: p._sum.amount ?? 0, last: p._max.createdAt }]),
  );

  const salesByCustomer = new Map<string, { total: number; createdAt: Date }[]>();
  for (const s of sales) {
    if (!s.customerId) continue;
    const list = salesByCustomer.get(s.customerId) ?? [];
    list.push(s);
    salesByCustomer.set(s.customerId, list);
  }

  const now = Date.now();
  const rows = customers
    .map((c) => {
      const info = paymentInfo.get(c.id);
      let credit = info?.paid ?? 0;
      let oldest: Date | null = null;

      // FIFO: los abonos cubren primero las ventas más viejas.
      for (const s of salesByCustomer.get(c.id) ?? []) {
        if (credit >= s.total) credit -= s.total;
        else {
          oldest = s.createdAt;
          break;
        }
      }

      return {
        ...c,
        balance: balances.get(c.id) ?? 0,
        oldestDebtDate: oldest,
        daysOverdue: oldest ? Math.floor((now - oldest.getTime()) / DAY_MS) : 0,
        lastPaymentAt: info?.last ?? null,
      };
    })
    .filter((r) => r.daysOverdue >= minDays)
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.balance - a.balance);

  return {
    count: rows.length,
    totalDebt: rows.reduce((sum, r) => sum + r.balance, 0),
    customers: rows,
  };
}

export async function dailySummary(storeId: string, date: string = todayCO()) {
  const range = dayRange(date, date);

  const [sales, payments, voided] = await Promise.all([
    prisma.sale.groupBy({
      by: ["type"],
      where: { storeId, status: "ACTIVE", createdAt: range },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { storeId, createdAt: range },
      _sum: { amount: true },
    }),
    prisma.sale.count({ where: { storeId, status: "VOIDED", createdAt: range } }),
  ]);

  const cashSales = sales.find((s) => s.type === "CASH")?._sum.total ?? 0;
  const creditSales = sales.find((s) => s.type === "CREDIT")?._sum.total ?? 0;

  const byMethod = { CASH: 0, TRANSFER: 0, OTHER: 0 };
  for (const p of payments) byMethod[p.method] = p._sum.amount ?? 0;

  return {
    date,
    sales: {
      cash: cashSales,
      credit: creditSales,
      total: cashSales + creditSales,
      count: sales.reduce((n, s) => n + s._count._all, 0),
    },
    payments: { byMethod, total: byMethod.CASH + byMethod.TRANSFER + byMethod.OTHER },
    voidedSales: voided,
    expectedCash: cashSales + byMethod.CASH,
  };
}

export async function createClosing(
  ctx: { storeId: string; userId: string },
  input: { date?: string; countedAmount: number },
) {
  const date = input.date ?? todayCO();
  if (date > todayCO()) throw new AppError(400, "No puedes cerrar caja de una fecha futura");

  const summary = await dailySummary(ctx.storeId, date);

  try {
    const closing = await prisma.cashClosing.create({
      data: {
        storeId: ctx.storeId,
        date: new Date(`${date}T00:00:00Z`),
        expectedAmount: summary.expectedCash,
        countedAmount: input.countedAmount,
        difference: input.countedAmount - summary.expectedCash,
        createdById: ctx.userId,
      },
    });
    return { ...closing, summary };
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && err.code === "P2002") {
      throw new AppError(409, "Ya existe un cierre de caja para esa fecha");
    }
    throw err;
  }
}

export async function listClosings(storeId: string) {
  return prisma.cashClosing.findMany({
    where: { storeId },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
    take: 31,
  });
}