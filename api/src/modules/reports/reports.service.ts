import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { dateCO, dayRange, todayCO } from "../../utils/dates";
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
      where: { storeId, status: "ACTIVE", customerId: { in: debtorIds } },
      _sum: { amount: true },
      _max: { createdAt: true },
    }),
    prisma.sale.findMany({
      where: {
        storeId,
        type: "CREDIT",
        status: "ACTIVE",
        customerId: { in: debtorIds },
      },
      select: { customerId: true, total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const paymentInfo = new Map(
    payments.map((p) => [
      p.customerId,
      { paid: p._sum.amount ?? 0, last: p._max.createdAt },
    ]),
  );

  const salesByCustomer = new Map<
    string,
    { total: number; createdAt: Date }[]
  >();
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
      where: { storeId, status: "ACTIVE", createdAt: range },
      _sum: { amount: true },
    }),
    prisma.sale.count({
      where: { storeId, status: "VOIDED", createdAt: range },
    }),
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
    payments: {
      byMethod,
      total: byMethod.CASH + byMethod.TRANSFER + byMethod.OTHER,
    },
    voidedSales: voided,
    expectedCash: cashSales + byMethod.CASH,
  };
}

export async function createClosing(
  ctx: { storeId: string; userId: string },
  input: { date?: string; countedAmount: number },
) {
  const date = input.date ?? todayCO();
  if (date > todayCO())
    throw new AppError(400, "No puedes cerrar caja de una fecha futura");

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
    if (
      typeof err === "object" &&
      err &&
      "code" in err &&
      err.code === "P2002"
    ) {
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

const AGING = [
  { key: "0-15", label: "0 a 15 días", max: 15 },
  { key: "16-30", label: "16 a 30 días", max: 30 },
  { key: "31-60", label: "31 a 60 días", max: 60 },
  { key: "60+", label: "Más de 60 días", max: Infinity },
] as const;

/** Las últimas n fechas (AAAA-MM-DD) terminando en `end`, de la más antigua a la más reciente. */
function lastDays(end: string, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(`${end}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** Suma valores por día calendario de Colombia. */
function sumByDay(rows: { createdAt: Date; value: number }[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const day = dateCO(r.createdAt);
    map.set(day, (map.get(day) ?? 0) + r.value);
  }
  return map;
}

export async function dashboard(storeId: string) {
  const today = todayCO();
  const monthStart = `${today.slice(0, 8)}01`;
  const days = lastDays(today, 30);
  const monthRange = dayRange(monthStart, today);
  const range30 = dayRange(days[0], today);

  const [debt, monthSales, monthPayments, sales30, payments30] = await Promise.all([
    overdue(storeId, 0),
    prisma.sale.groupBy({
      by: ["type"],
      where: { storeId, status: "ACTIVE", createdAt: monthRange },
      _sum: { total: true },
    }),
    prisma.payment.aggregate({
      where: { storeId, status: "ACTIVE", createdAt: monthRange },
      _sum: { amount: true },
    }),
    prisma.sale.findMany({
      where: { storeId, type: "CREDIT", status: "ACTIVE", createdAt: range30 },
      select: { total: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { storeId, status: "ACTIVE", createdAt: range30 },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const creditByDay = sumByDay(sales30.map((s) => ({ createdAt: s.createdAt, value: s.total })));
  const paymentsByDay = sumByDay(payments30.map((p) => ({ createdAt: p.createdAt, value: p.amount })));

  // Cada cliente se ubica según su deuda más antigua sin cubrir.
  const aging = AGING.map((bucket, i) => {
    const previousMax = i === 0 ? -1 : AGING[i - 1].max;
    const inBucket = debt.customers.filter((c) => c.daysOverdue > previousMax && c.daysOverdue <= bucket.max);
    return {
      key: bucket.key,
      label: bucket.label,
      amount: inBucket.reduce((sum, c) => sum + c.balance, 0),
      customers: inBucket.length,
    };
  });

  return {
    date: today,
    receivable: { total: debt.totalDebt, customers: debt.count, aging },
    month: {
      from: monthStart,
      to: today,
      credit: monthSales.find((s) => s.type === "CREDIT")?._sum.total ?? 0,
      cashSales: monthSales.find((s) => s.type === "CASH")?._sum.total ?? 0,
      collected: monthPayments._sum.amount ?? 0,
    },
    daily: days.map((date) => ({
      date,
      credit: creditByDay.get(date) ?? 0,
      payments: paymentsByDay.get(date) ?? 0,
    })),
    topDebtors: [...debt.customers]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
      .map((c) => ({ id: c.id, name: c.name, balance: c.balance, daysOverdue: c.daysOverdue })),
  };
}