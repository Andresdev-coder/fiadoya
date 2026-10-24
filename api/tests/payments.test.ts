
import { beforeEach, describe, expect, it } from "vitest";
import {
  addCashier,
  balanceOf,
  closeCash,
  createCustomer,
  http,
  ok,
  pay,
  registerStore,
  sale,
  voidPayment,
  type Store,
  type TestCustomer,
} from "./helpers";

describe("abonos", () => {
  let owner: Store;
  let customer: TestCustomer;

  // Cada prueba arranca con un cliente que debe 120.000.
  beforeEach(async () => {
    owner = await registerStore();
    customer = await createCustomer(owner.token, 500_000);
    ok(await sale(owner.token, "CREDIT", 120_000, customer.id));
  });

  describe("registrar", () => {
    it("un abono parcial baja el saldo y devuelve el saldo restante", async () => {
      const res = await pay(owner.token, customer.id, 50_000);
      expect(res.status).toBe(201);
      expect(res.body.balanceAfter).toBe(70_000);
      expect(await balanceOf(owner.token, customer.id)).toBe(70_000);
    });

    it("pagar toda la deuda deja el saldo en 0, y después ya no se puede abonar", async () => {
      const res = await pay(owner.token, customer.id, 120_000);
      expect(res.body.balanceAfter).toBe(0);

      const again = await pay(owner.token, customer.id, 1);
      expect(again.status).toBe(409);
      expect(again.body.message).toMatch(/deuda/i);
    });

    it("rechaza un abono mayor a la deuda (409) y no cambia el saldo", async () => {
      const res = await pay(owner.token, customer.id, 120_001);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/supera/i);
      expect(await balanceOf(owner.token, customer.id)).toBe(120_000);
    });

    it.each([0, -5, 100.5])("rechaza un monto inválido (%s) con 400", async (amount) => {
      expect((await pay(owner.token, customer.id, amount)).status).toBe(400);
    });

    it("un cajero puede registrar abonos", async () => {
      const cashier = await addCashier(owner.storeId);
      expect((await pay(cashier, customer.id, 10_000)).status).toBe(201);
    });
  });

  describe("anular", () => {
    it("anular un abono hace que el saldo vuelva a subir", async () => {
      const p = ok(await pay(owner.token, customer.id, 50_000));
      expect(await balanceOf(owner.token, customer.id)).toBe(70_000);

      expect((await voidPayment(owner.token, p.id)).status).toBe(200);
      expect(await balanceOf(owner.token, customer.id)).toBe(120_000);
    });

    it("el cajero no puede anular (403)", async () => {
      const cashier = await addCashier(owner.storeId);
      const p = ok(await pay(owner.token, customer.id, 10_000));
      expect((await voidPayment(cashier, p.id)).status).toBe(403);
    });

    it("exige motivo (400) y no se puede anular dos veces (409)", async () => {
      const p = ok(await pay(owner.token, customer.id, 10_000));
      expect((await voidPayment(owner.token, p.id, "ab")).status).toBe(400);

      ok(await voidPayment(owner.token, p.id), 200);
      expect((await voidPayment(owner.token, p.id)).status).toBe(409);
    });

    it("un abono en efectivo NO se puede anular con la caja cerrada (409)", async () => {
      const p = ok(await pay(owner.token, customer.id, 10_000, "CASH"));
      ok(await closeCash(owner.token, 10_000));

      const res = await voidPayment(owner.token, p.id);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/caja/i);
    });

    it("un abono por transferencia sí se puede anular con la caja cerrada", async () => {
      const p = ok(await pay(owner.token, customer.id, 10_000, "TRANSFER"));
      ok(await closeCash(owner.token, 0));
      expect((await voidPayment(owner.token, p.id)).status).toBe(200);
    });
  });

  describe("estado de cuenta", () => {
    it("muestra ventas y abonos con el saldo acumulado", async () => {
      ok(await pay(owner.token, customer.id, 50_000));

      const res = await http.get(owner.token, `/customers/${customer.id}/statement`);
      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(70_000);
      expect(
        res.body.entries.map((e: { kind: string; balanceAfter: number }) => [e.kind, e.balanceAfter]),
      ).toEqual([
        ["SALE", 120_000],
        ["PAYMENT", 70_000],
      ]);
    });

    it("un abono anulado aparece marcado pero no cuenta en el saldo", async () => {
      const p = ok(await pay(owner.token, customer.id, 50_000));
      ok(await voidPayment(owner.token, p.id), 200);

      const res = await http.get(owner.token, `/customers/${customer.id}/statement`);
      expect(res.body.balance).toBe(120_000);
      const entry = res.body.entries.find((e: { id: string }) => e.id === p.id);
      expect(entry.status).toBe("VOIDED");
    });
  });
});



