import { beforeEach, describe, expect, it } from "vitest";
import {
  addCashier,
  closeCash,
  createCustomer,
  daysAgo,
  http,
  ok,
  pay,
  prisma,
  registerStore,
  sale,
  voidPayment,
  voidSale,
  type Store,
} from "./helpers";
import { dateCO } from "../src/utils/dates";

describe("reportes", () => {
  let owner: Store;

  beforeEach(async () => {
    owner = await registerStore();
  });

  describe("resumen del día", () => {
    it("separa contado, fiado y abonos, y calcula el efectivo esperado", async () => {
      const c = await createCustomer(owner.token, 500_000);
      ok(await sale(owner.token, "CASH", 20_000));
      ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      ok(await pay(owner.token, c.id, 30_000, "CASH"));
      ok(await pay(owner.token, c.id, 10_000, "TRANSFER"));

      const res = await http.get(owner.token, "/reports/daily-summary");
      expect(res.status).toBe(200);
      expect(res.body.sales).toMatchObject({
        cash: 20_000,
        credit: 80_000,
        total: 100_000,
        count: 2,
      });
      expect(res.body.payments.byMethod).toEqual({
        CASH: 30_000,
        TRANSFER: 10_000,
        OTHER: 0,
      });
      // Solo entra efectivo: contado + abonos en efectivo. Ni el fiado ni la transferencia.
      expect(res.body.expectedCash).toBe(50_000);
    });

    it("no cuenta ventas ni abonos anulados", async () => {
      const c = await createCustomer(owner.token, 500_000);
      const cash = ok(await sale(owner.token, "CASH", 20_000));
      ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      const p = ok(await pay(owner.token, c.id, 30_000));
      ok(await voidSale(owner.token, cash.id), 200);
      ok(await voidPayment(owner.token, p.id), 200);

      const res = await http.get(owner.token, "/reports/daily-summary");
      expect(res.body.sales.cash).toBe(0);
      expect(res.body.payments.total).toBe(0);
      expect(res.body.expectedCash).toBe(0);
      expect(res.body.voidedSales).toBe(1);
    });

    it("un día sin movimientos devuelve ceros", async () => {
      const res = await http.get(
        owner.token,
        "/reports/daily-summary?date=2020-01-01",
      );
      expect(res.status).toBe(200);
      expect(res.body.expectedCash).toBe(0);
      expect(res.body.sales.count).toBe(0);
    });
  });

  describe("cierre de caja", () => {
    async function dayWith50kInCash() {
      const c = await createCustomer(owner.token, 500_000);
      ok(await sale(owner.token, "CASH", 20_000));
      ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      ok(await pay(owner.token, c.id, 30_000));
    }

    it("calcula la diferencia entre lo esperado y lo contado", async () => {
      await dayWith50kInCash();
      const res = await closeCash(owner.token, 48_000);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        expectedAmount: 50_000,
        countedAmount: 48_000,
        difference: -2_000,
      });
    });

    it("solo permite un cierre por día (409)", async () => {
      ok(await closeCash(owner.token, 0));
      expect((await closeCash(owner.token, 0)).status).toBe(409);
    });

    it("rechaza fechas futuras (400) y montos negativos (400)", async () => {
      const future = await http.post(owner.token, "/cash-closings", {
        date: "2999-01-01",
        countedAmount: 0,
      });
      expect(future.status).toBe(400);
      expect((await closeCash(owner.token, -1)).status).toBe(400);
    });

    it("el dueño ve el historial de cierres", async () => {
      ok(await closeCash(owner.token, 0));
      const res = await http.get(owner.token, "/cash-closings");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("el cajero puede cerrar caja pero no ver reportes ni el historial (403)", async () => {
      const cashier = await addCashier(owner.storeId);
      expect((await closeCash(cashier, 0)).status).toBe(201);
      expect((await http.get(cashier, "/cash-closings")).status).toBe(403);
      expect((await http.get(cashier, "/reports/overdue")).status).toBe(403);
      expect((await http.get(cashier, "/reports/daily-summary")).status).toBe(
        403,
      );
    });
  });

  describe("morosos", () => {
    const setSaleDate = (id: string, days: number) =>
      prisma.sale.update({ where: { id }, data: { createdAt: daysAgo(days) } });

    it("lista a quien debe, con días de mora y total adeudado", async () => {
      const c = await createCustomer(owner.token, 500_000, "Moroso");
      const s = ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      await setSaleDate(s.id, 40);

      const res = await http.get(owner.token, "/reports/overdue");
      expect(res.body.count).toBe(1);
      expect(res.body.totalDebt).toBe(80_000);
      expect(res.body.customers[0]).toMatchObject({
        name: "Moroso",
        balance: 80_000,
        daysOverdue: 40,
      });
    });

    it("el filtro minDays deja fuera a quien debe hace menos tiempo", async () => {
      const c = await createCustomer(owner.token, 500_000);
      const s = ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      await setSaleDate(s.id, 40);

      expect(
        (await http.get(owner.token, "/reports/overdue?minDays=30")).body.count,
      ).toBe(1);
      expect(
        (await http.get(owner.token, "/reports/overdue?minDays=60")).body.count,
      ).toBe(0);
    });

    it("los abonos cubren primero la deuda más antigua (FIFO)", async () => {
      const c = await createCustomer(owner.token, 500_000);
      const old = ok(await sale(owner.token, "CREDIT", 100_000, c.id));
      const recent = ok(await sale(owner.token, "CREDIT", 50_000, c.id));
      await setSaleDate(old.id, 60);
      await setSaleDate(recent.id, 5);

      // Paga justo la deuda vieja: lo que queda es la de hace 5 días, no la de 60.
      ok(await pay(owner.token, c.id, 100_000));

      const res = await http.get(owner.token, "/reports/overdue");
      expect(res.body.customers[0]).toMatchObject({
        balance: 50_000,
        daysOverdue: 5,
      });
    });

    it("quien paga todo desaparece del reporte", async () => {
      const c = await createCustomer(owner.token, 500_000);
      ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      ok(await pay(owner.token, c.id, 80_000));
      expect((await http.get(owner.token, "/reports/overdue")).body.count).toBe(
        0,
      );
    });

    it("un abono anulado no reduce la deuda del reporte", async () => {
      const c = await createCustomer(owner.token, 500_000);
      ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      const p = ok(await pay(owner.token, c.id, 30_000, "TRANSFER"));
      ok(await voidPayment(owner.token, p.id), 200);

      const res = await http.get(owner.token, "/reports/overdue");
      expect(res.body.totalDebt).toBe(80_000);
    });
  });

  describe("dashboard", () => {
    const setSaleDate = (id: string, days: number) =>
      prisma.sale.update({ where: { id }, data: { createdAt: daysAgo(days) } });

    it("una tienda sin movimientos devuelve ceros y 30 días de serie", async () => {
      const res = await http.get(owner.token, "/reports/dashboard");
      expect(res.status).toBe(200);
      expect(res.body.receivable).toMatchObject({ total: 0, customers: 0 });
      expect(res.body.receivable.aging).toHaveLength(4);
      expect(res.body.month).toMatchObject({
        credit: 0,
        collected: 0,
        cashSales: 0,
      });
      expect(res.body.daily).toHaveLength(30);
      expect(res.body.topDebtors).toEqual([]);
    });

    it("suma lo por cobrar y el movimiento del mes", async () => {
      const c = await createCustomer(owner.token, 500_000);
      ok(await sale(owner.token, "CASH", 20_000));
      ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      ok(await pay(owner.token, c.id, 30_000));

      const res = await http.get(owner.token, "/reports/dashboard");
      expect(res.body.receivable).toMatchObject({
        total: 50_000,
        customers: 1,
      });
      expect(res.body.month).toMatchObject({
        credit: 80_000,
        collected: 30_000,
        cashSales: 20_000,
      });
      expect(res.body.daily[29]).toMatchObject({
        credit: 80_000,
        payments: 30_000,
      });
    });

    it("reparte la cartera por antigüedad y ordena los mayores deudores", async () => {
      const old = await createCustomer(owner.token, 500_000, "Deudor antiguo");
      const recent = await createCustomer(
        owner.token,
        500_000,
        "Deudor reciente",
      );
      const s1 = ok(await sale(owner.token, "CREDIT", 100_000, old.id));
      const s2 = ok(await sale(owner.token, "CREDIT", 50_000, recent.id));
      await setSaleDate(s1.id, 40);
      await setSaleDate(s2.id, 5);

      const res = await http.get(owner.token, "/reports/dashboard");
      const aging = Object.fromEntries(
        res.body.receivable.aging.map((b: { key: string }) => [b.key, b]),
      );
      expect(aging["0-15"]).toMatchObject({ amount: 50_000, customers: 1 });
      expect(aging["16-30"]).toMatchObject({ amount: 0, customers: 0 });
      expect(aging["31-60"]).toMatchObject({ amount: 100_000, customers: 1 });
      expect(aging["60+"]).toMatchObject({ amount: 0, customers: 0 });
      expect(res.body.topDebtors.map((d: { name: string }) => d.name)).toEqual([
        "Deudor antiguo",
        "Deudor reciente",
      ]);

      // La venta de hace 40 días queda fuera de la serie de 30 días; la de hace 5 sí entra.
      const total30 = res.body.daily.reduce(
        (sum: number, d: { credit: number }) => sum + d.credit,
        0,
      );
      expect(total30).toBe(50_000);
      const day5 = res.body.daily.find(
        (d: { date: string }) => d.date === dateCO(daysAgo(5)),
      );
      expect(day5.credit).toBe(50_000);
    });

    it("ignora ventas y abonos anulados", async () => {
      const c = await createCustomer(owner.token, 500_000);
      const s = ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      const p = ok(await pay(owner.token, c.id, 30_000, "TRANSFER"));
      ok(await voidPayment(owner.token, p.id), 200);

      let res = await http.get(owner.token, "/reports/dashboard");
      expect(res.body.receivable.total).toBe(80_000);
      expect(res.body.month.collected).toBe(0);

      ok(await voidSale(owner.token, s.id), 200);
      res = await http.get(owner.token, "/reports/dashboard");
      expect(res.body.receivable.total).toBe(0);
      expect(res.body.month.credit).toBe(0);
    });

    it("solo el dueño lo ve (403 al cajero, 401 sin sesión)", async () => {
      const cashier = await addCashier(owner.storeId);
      expect((await http.get(cashier, "/reports/dashboard")).status).toBe(403);
      expect((await http.get("token-falso", "/reports/dashboard")).status).toBe(
        401,
      );
    });

    it("no mezcla datos de otra tienda", async () => {
      const c = await createCustomer(owner.token, 500_000);
      ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      const other = await registerStore();
      const res = await http.get(other.token, "/reports/dashboard");
      expect(res.body.receivable.total).toBe(0);
    });
  });
});
