import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Prisma } from "../src/generated/prisma/client";

const OWNER_EMAIL = "demo@fiadoya.app";
const CASHIER_EMAIL = "cajero@fiadoya.app";
const PASSWORD = "Demo12345";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// ---------- Utilidades ----------
const coDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
const coToday = coDate(new Date());

/** Fecha de hace `days` días a la hora indicada, en hora de Colombia. */
function ago(days: number, hour = 10, minute = 0) {
  const d = new Date(`${coToday}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour + 5, minute, 0, 0);
  return d;
}

/** Para "hoy" se usa una hora atrás, y para días anteriores una hora del día. */
const stamp = (days: number, slot: number) =>
  days === 0
    ? new Date(Date.now() - (slot + 1) * 3_600_000)
    : ago(days, 9 + (slot % 9), (slot * 7) % 60);

// Generador pseudoaleatorio con semilla: la demo siempre queda igual.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(2026);

// ---------- Datos ----------
type CreditSale = {
  days: number;
  amount: number;
  note: string;
  voided?: string;
};
type Payment = {
  days: number;
  amount: number;
  method: "CASH" | "TRANSFER";
  note?: string;
};
type Scenario = {
  name: string;
  phone: string;
  limit: number;
  notes?: string;
  active?: boolean;
  sales?: CreditSale[];
  payments?: Payment[];
};

const SCENARIOS: Scenario[] = [
  {
    name: "Doña Amparo Gómez",
    phone: "3101110001",
    limit: 300_000,
    notes: "Vive frente a la tienda",
    sales: [
      { days: 70, amount: 120_000, note: "Mercado del mes" },
      { days: 45, amount: 80_000, note: "Mercado y aseo" },
    ],
    payments: [{ days: 40, amount: 100_000, method: "CASH" }],
  },
  {
    name: "Don Jairo Martínez",
    phone: "3101110002",
    limit: 500_000,
    notes: "Paga a fin de mes",
    sales: [
      { days: 35, amount: 150_000, note: "Víveres para el negocio" },
      { days: 20, amount: 90_000, note: "Mercado quincenal" },
      { days: 6, amount: 60_000, note: "Mercado" },
    ],
    payments: [
      { days: 10, amount: 50_000, method: "TRANSFER", note: "Abono por Nequi" },
    ],
  },
  {
    name: "Marta Lucía Ríos",
    phone: "3101110003",
    limit: 200_000,
    sales: [{ days: 22, amount: 70_000, note: "Mercado" }],
    payments: [{ days: 12, amount: 20_000, method: "CASH" }],
  },
  {
    name: "Carlos Peña",
    phone: "3101110004",
    limit: 150_000,
    sales: [
      { days: 8, amount: 45_000, note: "Gaseosas y pan" },
      { days: 2, amount: 30_000, note: "Mercado pequeño" },
    ],
  },
  {
    name: "Yolanda Castro",
    phone: "3101110005",
    limit: 400_000,
    notes: "Buena pagadora",
    sales: [{ days: 28, amount: 160_000, note: "Mercado del mes" }],
    payments: [
      { days: 5, amount: 160_000, method: "TRANSFER", note: "Pagó todo" },
    ],
  },
  {
    name: "Hernán Ospina",
    phone: "3101110006",
    limit: 250_000,
    sales: [
      { days: 14, amount: 85_000, note: "Mercado quincenal" },
      { days: 0, amount: 30_000, note: "Víveres" },
    ],
  },
  {
    name: "Luz Dary Moreno",
    phone: "3101110007",
    limit: 100_000,
    sales: [
      {
        days: 25,
        amount: 60_000,
        note: "Mercado",
        voided: "Error de digitación",
      },
      { days: 3, amount: 40_000, note: "Mercado" },
    ],
  },
  {
    name: "Pedro Nel Vargas",
    phone: "3101110008",
    limit: 120_000,
    sales: [
      { days: 50, amount: 90_000, note: "Mercado" },
      { days: 1, amount: 25_000, note: "Pan y leche" },
    ],
    payments: [{ days: 30, amount: 90_000, method: "CASH" }],
  },
  {
    name: "Gloria Patricia Sánchez",
    phone: "3101110009",
    limit: 80_000,
    notes: "Cupo bajo",
    sales: [{ days: 5, amount: 80_000, note: "Mercado completo" }],
  },
  {
    name: "Teresa Ibáñez",
    phone: "3101110010",
    limit: 350_000,
    sales: [{ days: 33, amount: 110_000, note: "Mercado del mes" }],
    payments: [{ days: 20, amount: 30_000, method: "CASH" }],
  },
  {
    name: "Julián Ariza",
    phone: "3101110011",
    limit: 200_000,
    sales: [{ days: 11, amount: 55_000, note: "Mercado" }],
    payments: [
      { days: 4, amount: 15_000, method: "CASH" },
      { days: 0, amount: 10_000, method: "TRANSFER", note: "Abono por Nequi" },
    ],
  },
  {
    name: "Ramiro Soto",
    phone: "3101110012",
    limit: 0,
    notes: "Se mudó de barrio",
    active: false,
    sales: [{ days: 60, amount: 40_000, note: "Mercado" }],
    payments: [{ days: 55, amount: 40_000, method: "CASH" }],
  },
  {
    name: "Andrés Felipe Cardona",
    phone: "3101110013",
    limit: 150_000,
    notes: "Cliente nuevo",
  },
];

const PRODUCTS = [
  ["Arroz 1 kg", 4_800],
  ["Aceite 1 L", 12_500],
  ["Huevos x30", 17_000],
  ["Panela", 3_200],
  ["Gaseosa 1.5 L", 6_500],
  ["Pan tajado", 5_500],
  ["Leche 1 L", 4_300],
  ["Papel higiénico x4", 9_800],
  ["Detergente 1 kg", 11_200],
  ["Café 250 g", 9_400],
  ["Azúcar 1 kg", 4_600],
  ["Frijol 500 g", 5_900],
] as const;

// ---------- Proceso ----------
async function wipeDemo() {
  const existing = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
  });
  if (!existing) return;
  const storeId = existing.storeId;
  console.log("Borrando la tienda demo anterior…");
  await prisma.$transaction([
    prisma.cashClosing.deleteMany({ where: { storeId } }),
    prisma.payment.deleteMany({ where: { storeId } }),
    prisma.sale.deleteMany({ where: { storeId } }), // los productos de cada venta se borran en cascada
    prisma.customer.deleteMany({ where: { storeId } }),
    prisma.user.deleteMany({ where: { storeId } }),
    prisma.store.delete({ where: { id: storeId } }),
  ]);
}

async function main() {
  console.log("Base de datos:", new URL(connectionString!).host);
  await wipeDemo();

  const storeId = randomUUID();
  const ownerId = randomUUID();
  const cashierId = randomUUID();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const customers: Prisma.CustomerCreateManyInput[] = [];
  const sales: Prisma.SaleCreateManyInput[] = [];
  const items: Prisma.SaleItemCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];

  // Fiados y abonos de cada cliente
  for (const s of SCENARIOS) {
    const customerId = randomUUID();
    customers.push({
      id: customerId,
      storeId,
      name: s.name,
      phone: s.phone,
      creditLimit: s.limit,
      notes: s.notes ?? null,
      active: s.active ?? true,
    });

    (s.sales ?? []).forEach((sale, i) => {
      const id = randomUUID();
      const createdAt = stamp(sale.days, i);
      sales.push({
        id,
        storeId,
        customerId,
        total: sale.amount,
        type: "CREDIT",
        status: sale.voided ? "VOIDED" : "ACTIVE",
        voidReason: sale.voided ?? null,
        voidedAt: sale.voided
          ? new Date(createdAt.getTime() + 86_400_000)
          : null,
        createdById: i % 2 === 0 ? ownerId : cashierId,
        createdAt,
      });
      items.push({
        id: randomUUID(),
        saleId: id,
        description: sale.note,
        quantity: 1,
        unitPrice: sale.amount,
      });
    });

    (s.payments ?? []).forEach((p, i) => {
      payments.push({
        id: randomUUID(),
        storeId,
        customerId,
        amount: p.amount,
        method: p.method,
        note: p.note ?? null,
        createdById: i % 2 === 0 ? ownerId : cashierId,
        createdAt: stamp(p.days, i + 3),
      });
    });
  }

  // Ventas de contado: unas pocas por día durante 30 días
  function cashSale(createdAt: Date) {
    const id = randomUUID();
    let total = 0;
    const lines = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < lines; i++) {
      const [description, unitPrice] =
        PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
      const quantity = 1 + Math.floor(rand() * 3);
      total += quantity * unitPrice;
      items.push({
        id: randomUUID(),
        saleId: id,
        description,
        quantity,
        unitPrice,
      });
    }
    sales.push({
      id,
      storeId,
      customerId: null,
      total,
      type: "CASH",
      status: "ACTIVE",
      createdById: rand() < 0.35 ? cashierId : ownerId,
      createdAt,
    });
  }

  for (let d = 1; d <= 30; d++) {
    const n = 2 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++)
      cashSale(ago(d, 8 + Math.floor(rand() * 11), Math.floor(rand() * 60)));
  }
  for (let h = 1; h <= 3; h++) cashSale(new Date(Date.now() - h * 3_600_000)); // hoy

  // Una venta de contado anulada, para que se vea en Movimientos
  const voidedId = randomUUID();
  sales.push({
    id: voidedId,
    storeId,
    customerId: null,
    total: 14_000,
    type: "CASH",
    status: "VOIDED",
    voidReason: "Producto devuelto",
    voidedAt: ago(2, 15, 40),
    createdById: ownerId,
    createdAt: ago(2, 15, 20),
  });
  items.push({
    id: randomUUID(),
    saleId: voidedId,
    description: "Detergente 1 kg",
    quantity: 1,
    unitPrice: 14_000,
  });

  // Cierres de caja de los últimos 5 días (uno con faltante y otro con sobrante)
  const cashIn = new Map<string, number>();
  const addCash = (d: Date, value: number) =>
    cashIn.set(coDate(d), (cashIn.get(coDate(d)) ?? 0) + value);
  for (const s of sales)
    if (s.type === "CASH" && s.status === "ACTIVE")
      addCash(s.createdAt as Date, s.total);
  for (const p of payments)
    if (p.method === "CASH") addCash(p.createdAt as Date, p.amount);

  const DIFFS: Record<number, number> = {
    1: 0,
    2: -2_000,
    3: 0,
    4: 1_000,
    5: 0,
  };
  const closings: Prisma.CashClosingCreateManyInput[] = Object.entries(
    DIFFS,
  ).map(([d, diff]) => {
    const date = coDate(ago(Number(d)));
    const expected = cashIn.get(date) ?? 0;
    return {
      storeId,
      date: new Date(`${date}T00:00:00Z`),
      expectedAmount: expected,
      countedAmount: expected + diff,
      difference: diff,
      createdById: ownerId,
    };
  });

  // Guardar todo
  await prisma.store.create({
    data: {
      id: storeId,
      name: "Tienda La Esperanza",
      users: {
        create: [
          {
            id: ownerId,
            name: "Diana Restrepo",
            email: OWNER_EMAIL,
            passwordHash,
            role: "OWNER",
          },
          {
            id: cashierId,
            name: "Mateo Giraldo",
            email: CASHIER_EMAIL,
            passwordHash,
            role: "CASHIER",
          },
        ],
      },
    },
  });
  await prisma.customer.createMany({ data: customers });
  await prisma.sale.createMany({ data: sales });
  await prisma.saleItem.createMany({ data: items });
  await prisma.payment.createMany({ data: payments });
  await prisma.cashClosing.createMany({ data: closings });

  const credit = sales
    .filter((s) => s.type === "CREDIT" && s.status === "ACTIVE")
    .reduce((n, s) => n + s.total, 0);
  const paid = payments.reduce((n, p) => n + p.amount, 0);
  console.log(
    `Listo: ${customers.length} clientes, ${sales.length} ventas, ${payments.length} abonos.`,
  );
  console.log(`Por cobrar esperado: ${credit - paid}`);
  console.log(`Dueño:  ${OWNER_EMAIL} / ${PASSWORD}`);
  console.log(`Cajero: ${CASHIER_EMAIL} / ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
