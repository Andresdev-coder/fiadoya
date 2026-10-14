
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

describe("reportes", () => {
  let owner: Store;

  beforeEach(async () => {
    owner = await registerStore();
  });

  describe("resumen del dÃ­a", () => {
    it("separa contado, fiado y abonos, y calcula el efectivo esperado", async () => {
      const c = await createCustomer(owner.token, 500_000);
      ok(await sale(owner.token, "CASH", 20_000));
      ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      ok(await pay(owner.token, c.id, 30_000, "CASH"));
      ok(await pay(owner.token, c.id, 10_000, "TRANSFER"));

      const res = await http.get(owner.token, "/reports/daily-summary");
      expect(res.status).toBe(200);
      expect(res.body.sales).toMatchObject({ cash: 20_000, credit: 80_000, total: 100_000, count: 2 });
      expect(res.body.payments.byMethod).toEqual({ CASH: 30_000, TRANSFER: 10_000, OTHER: 0 });
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

    it("un dÃ­a sin movimientos devuelve ceros", async () => {
      const res = await http.get(owner.token, "/reports/daily-summary?date=2020-01-01");
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
      expect(res.body).toMatchObject({ expectedAmount: 50_000, countedAmount: 48_000, difference: -2_000 });
    });

    it("solo permite un cierre por dÃ­a (409)", async () => {
      ok(await closeCash(owner.token, 0));
      expect((await closeCash(owner.token, 0)).status).toBe(409);
    });

    it("rechaza fechas futuras (400) y montos negativos (400)", async () => {
      const future = await http.post(owner.token, "/cash-closings", { date: "2999-01-01", countedAmount: 0 });
      expect(future.status).toBe(400);
      expect((await closeCash(owner.token, -1)).status).toBe(400);
    });

    it("el dueÃ±o ve el historial de cierres", async () => {
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
      expect((await http.get(cashier, "/reports/daily-summary")).status).toBe(403);
    });
  });

  describe("morosos", () => {
    const setSaleDate = (id: string, days: number) =>
      prisma.sale.update({ where: { id }, data: { createdAt: daysAgo(days) } });

    it("lista a quien debe, con dÃ­as de mora y total adeudado", async () => {
      const c = await createCustomer(owner.token, 500_000, "Moroso");
      const s = ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      await setSaleDate(s.id, 40);

      const res = await http.get(owner.token, "/reports/overdue");
      expect(res.body.count).toBe(1);
      expect(res.body.totalDebt).toBe(80_000);
      expect(res.body.customers[0]).toMatchObject({ name: "Moroso", balance: 80_000, daysOverdue: 40 });
    });

    it("el filtro minDays deja fuera a quien debe hace menos tiempo", async () => {
      const c = await createCustomer(owner.token, 500_000);
      const s = ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      await setSaleDate(s.id, 40);

      expect((await http.get(owner.token, "/reports/overdue?minDays=30")).body.count).toBe(1);
      expect((await http.get(owner.token, "/reports/overdue?minDays=60")).body.count).toBe(0);
    });

    it("los abonos cubren primero la deuda mÃ¡s antigua (FIFO)", async () => {
      const c = await createCustomer(owner.token, 500_000);
      const old = ok(await sale(owner.token, "CREDIT", 100_000, c.id));
      const recent = ok(await sale(owner.token, "CREDIT", 50_000, c.id));
      await setSaleDate(old.id, 60);
      await setSaleDate(recent.id, 5);

      // Paga justo la deuda vieja: lo que queda es la de hace 5 dÃ­as, no la de 60.
      ok(await pay(owner.token, c.id, 100_000));

      const res = await http.get(owner.token, "/reports/overdue");
      expect(res.body.customers[0]).toMatchObject({ balance: 50_000, daysOverdue: 5 });
    });

    it("quien paga todo desaparece del reporte", async () => {
      const c = await createCustomer(owner.token, 500_000);
      ok(await sale(owner.token, "CREDIT", 80_000, c.id));
      ok(await pay(owner.token, c.id, 80_000));
      expect((await http.get(owner.token, "/reports/overdue")).body.count).toBe(0);
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
});



