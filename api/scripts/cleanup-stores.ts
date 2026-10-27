import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Uso: --delete para borrar de verdad; --keep=correo para conservar más tiendas (por el correo de su dueño).
const args = process.argv.slice(2);
const apply = args.includes("--delete");
const keep = new Set(
  ["demo@fiadoya.app", ...args.filter((a) => a.startsWith("--keep=")).map((a) => a.slice("--keep=".length))].map(
    (email) => email.toLowerCase(),
  ),
);

async function main() {
  console.log("Base de datos:", new URL(connectionString!).host, "\n");

  const stores = await prisma.store.findMany({
    include: {
      users: { where: { role: "OWNER" }, select: { email: true } },
      _count: { select: { customers: true, sales: true, payments: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const toDelete: string[] = [];
  for (const store of stores) {
    const owner = store.users[0]?.email ?? "(sin dueño)";
    const keepIt = store.users.some((u) => keep.has(u.email.toLowerCase()));
    const { customers, sales, payments } = store._count;
    console.log(
      `${keepIt ? "CONSERVAR" : "BORRAR   "}  ${store.name} · ${owner} · ${customers} clientes, ${sales} ventas, ${payments} abonos`,
    );
    if (!keepIt) toDelete.push(store.id);
  }

  if (!apply) {
    console.log(`\nSimulación: se borrarían ${toDelete.length} tiendas. Para borrarlas de verdad, agrega --delete`);
    return;
  }
  if (toDelete.length === 0) {
    console.log("\nNo hay nada que borrar.");
    return;
  }

  const where = { storeId: { in: toDelete } };
  await prisma.$transaction([
    prisma.cashClosing.deleteMany({ where }),
    prisma.payment.deleteMany({ where }),
    prisma.sale.deleteMany({ where }), // los productos de cada venta se borran en cascada
    prisma.customer.deleteMany({ where }),
    prisma.user.deleteMany({ where }),
    prisma.store.deleteMany({ where: { id: { in: toDelete } } }),
  ]);
  console.log(`\nListo: ${toDelete.length} tiendas borradas.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());