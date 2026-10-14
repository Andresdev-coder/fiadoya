
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";

export { prisma };

export type Store = { token: string; storeId: string; userId: string };
export type TestCustomer = {
  id: string;
  name: string;
  creditLimit: number;
  balance: number;
  available: number;
};

type Res = { status: number; body: any };
type Method = "CASH" | "TRANSFER" | "OTHER";

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const http = {
  get: (token: string, path: string) => request(app).get(path).set(auth(token)),
  post: (token: string, path: string, body?: object) => request(app).post(path).set(auth(token)).send(body),
  patch: (token: string, path: string, body?: object) => request(app).patch(path).set(auth(token)).send(body),
};

/** Exige un cÃ³digo de respuesta y devuelve el body; si no coincide, el error muestra quÃ© llegÃ³. */
export function ok(res: Res, expected = 201) {
  if (res.status !== expected) {
    throw new Error(`Esperaba ${expected} y llegÃ³ ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

/** Tienda nueva con su dueÃ±o. Cada prueba usa la suya, asÃ­ quedan aisladas. */
export async function registerStore(): Promise<Store> {
  const res = await request(app)
    .post("/auth/register")
    .send({
      storeName: "Tienda de pruebas",
      name: "DueÃ±o",
      email: `owner-${randomUUID()}@test.com`,
      password: "12345678",
    });
  const body = ok(res);
  return { token: body.token, storeId: body.user.storeId, userId: body.user.id };
}

/** AÃºn no hay endpoint para crear cajeros, asÃ­ que se crea directo en la base. */
export async function addCashier(storeId: string) {
  const email = `cashier-${randomUUID()}@test.com`;
  await prisma.user.create({
    data: {
      storeId,
      name: "Cajero",
      email,
      passwordHash: await bcrypt.hash("12345678", 4),
      role: "CASHIER",
    },
  });
  const res = await request(app).post("/auth/login").send({ email, password: "12345678" });
  return ok(res, 200).token as string;
}

let phoneSeq = 0;

export async function createCustomer(token: string, creditLimit = 200_000, name = "Cliente de prueba") {
  const phone = `3${String(++phoneSeq).padStart(9, "0")}`;
  const res = await http.post(token, "/customers", { name, phone, creditLimit });
  return ok(res) as TestCustomer;
}

export const sale = (token: string, type: "CASH" | "CREDIT", amount: number, customerId?: string) =>
  http.post(token, "/sales", {
    type,
    customerId,
    items: [{ description: "Producto", quantity: 1, unitPrice: amount }],
  });

export const pay = (token: string, customerId: string, amount: number, method: Method = "CASH") =>
  http.post(token, "/payments", { customerId, amount, method });

export const voidSale = (token: string, id: string, reason = "Error de digitaciÃ³n") =>
  http.post(token, `/sales/${id}/void`, { reason });

export const voidPayment = (token: string, id: string, reason = "Error de digitaciÃ³n") =>
  http.post(token, `/payments/${id}/void`, { reason });

export const closeCash = (token: string, countedAmount = 0) =>
  http.post(token, "/cash-closings", { countedAmount });

export async function balanceOf(token: string, customerId: string) {
  return (await http.get(token, `/customers/${customerId}`)).body.balance as number;
}

export const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);


