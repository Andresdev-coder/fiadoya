import { prisma } from "../src/config/prisma";

export async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("_test")) {
    throw new Error("Las pruebas solo corren contra una base que termine en _test. Revisa .env.test");
  }

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "CashClosing","Payment","SaleItem","Sale","Customer","User","Store" RESTART IDENTITY CASCADE`,
  );
  await prisma.$disconnect();
}

