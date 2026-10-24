
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
  voidSale,
  type Store,
} from "./helpers";

describe("ventas", () => {
  let owner: Store;

  beforeEach(async () => {
    owner = await registerStore();
  });

  describe("crear", () => {
    it("calcula el total en el servidor e ignora el que envíe el cliente", async () => {
      const res = await http.post(owner.token, "/sales", {
        type: "CASH",
        total: 1,
        items: [{ description: "Arroz 1kg", quantity: 2, unitPrice: 4_500 }],
      });
      expect(res.status).toBe(201);
      expect(res.body.total).toBe(9_000);
    });

    it("un fiado suma al saldo y baja el disponible", async () => {
      const c = await createCustomer(owner.token, 200_000);
      ok(await sale(owner.token, "CREDIT", 120_000, c.id));
      const after = (await http.get(owner.token, `/customers/${c.id}`)).body;
      expect(after).toMatchObject({ balance: 120_000, available: 80_000 });
    });

    it("una venta de contado no cambia el saldo de nadie", async () => {
      const c = await createCustomer(owner.token, 200_000);
      ok(await sale(owner.token, "CASH", 50_000, c.id));
      expect(await balanceOf(owner.token, c.id)).toBe(0);
    });

    it("un fiado sin cliente es inválido (400)", async () => {
      const res = await sale(owner.token, "CREDIT", 1_000);
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: { field: string }) => e.field)).toContain("customerId");
    });

    it.each([
      ["sin productos", { type: "CASH", items: [] }],
      ["con cantidad 0", { type: "CASH", items: [{ description: "X", quantity: 0, unitPrice: 1_000 }] }],
      ["con precio negativo", { type: "CASH", items: [{ description: "X", quantity: 1, unitPrice: -5 }] }],
      ["con precio decimal", { type: "CASH", items: [{ description: "X", quantity: 1, unitPrice: 10.5 }] }],
    ])("rechaza una venta %s (400)", async (_caso, body) => {
      expect((await http.post(owner.token, "/sales", body)).status).toBe(400);
    });

    it("rechaza una venta con total 0 (400)", async () => {
      const res = await http.post(owner.token, "/sales", {
        type: "CASH",
        items: [{ description: "Obsequio", quantity: 1, unitPrice: 0 }],
      });
      expect(res.status).toBe(400);
    });
  });

  describe("cupo", () => {
    it("rechaza un fiado que supera el cupo (409) y no cambia el saldo", async () => {
      const c = await createCustomer(owner.token, 100_000);
      ok(await sale(owner.token, "CREDIT", 60_000, c.id));

      const res = await sale(owner.token, "CREDIT", 50_000, c.id);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/cupo/i);
      expect(await balanceOf(owner.token, c.id)).toBe(60_000);
    });

    it("permite llegar exactamente al cupo, y ni un peso más", async () => {
      const c = await createCustomer(owner.token, 100_000);
      ok(await sale(owner.token, "CREDIT", 100_000, c.id));
      expect((await sale(owner.token, "CREDIT", 1, c.id)).status).toBe(409);
    });

    it("un cliente con cupo 0 no puede fiar", async () => {
      const c = await createCustomer(owner.token, 0);
      expect((await sale(owner.token, "CREDIT", 1_000, c.id)).status).toBe(409);
    });

    it("un cliente inactivo no puede fiar (409)", async () => {
      const c = await createCustomer(owner.token, 100_000);
      ok(await http.patch(owner.token, `/customers/${c.id}`, { active: false }), 200);
      const res = await sale(owner.token, "CREDIT", 1_000, c.id);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/inactivo/i);
    });

    it("tras anular un fiado, el cupo vuelve a estar disponible", async () => {
      const c = await createCustomer(owner.token, 100_000);
      const s = ok(await sale(owner.token, "CREDIT", 100_000, c.id));
      ok(await voidSale(owner.token, s.id), 200);
      expect((await sale(owner.token, "CREDIT", 100_000, c.id)).status).toBe(201);
    });
  });

  describe("anular", () => {
    it("anular un fiado devuelve el saldo y deja el motivo", async () => {
      const c = await createCustomer(owner.token, 200_000);
      const s = ok(await sale(owner.token, "CREDIT", 120_000, c.id));

      const res = await voidSale(owner.token, s.id, "Cobré mal");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "VOIDED", voidReason: "Cobré mal" });
      expect(await balanceOf(owner.token, c.id)).toBe(0);
    });

    it("el cajero no puede anular (403)", async () => {
      const cashier = await addCashier(owner.storeId);
      const s = ok(await sale(owner.token, "CASH", 5_000));
      expect((await voidSale(cashier, s.id)).status).toBe(403);
    });

    it("exige un motivo (400)", async () => {
      const s = ok(await sale(owner.token, "CASH", 5_000));
      expect((await voidSale(owner.token, s.id, "ab")).status).toBe(400);
    });

    it("no se puede anular dos veces (409)", async () => {
      const s = ok(await sale(owner.token, "CASH", 5_000));
      ok(await voidSale(owner.token, s.id), 200);
      expect((await voidSale(owner.token, s.id)).status).toBe(409);
    });

    it("no deja anular un fiado si el cliente ya abonó más de lo que quedaría debiendo", async () => {
      const c = await createCustomer(owner.token, 200_000);
      const s = ok(await sale(owner.token, "CREDIT", 100_000, c.id));
      ok(await pay(owner.token, c.id, 80_000));

      const res = await voidSale(owner.token, s.id);
      expect(res.status).toBe(409);
      expect(await balanceOf(owner.token, c.id)).toBe(20_000);
    });

    it("una venta de contado se puede anular mientras la caja siga abierta", async () => {
      const s = ok(await sale(owner.token, "CASH", 20_000));
      expect((await voidSale(owner.token, s.id)).status).toBe(200);
    });

    it("una venta de contado NO se puede anular si la caja del día ya se cerró (409)", async () => {
      const s = ok(await sale(owner.token, "CASH", 20_000));
      ok(await closeCash(owner.token, 20_000));

      const res = await voidSale(owner.token, s.id);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/caja/i);
    });

    it("un fiado sí se puede anular con la caja cerrada, porque no mueve efectivo", async () => {
      const c = await createCustomer(owner.token, 100_000);
      const s = ok(await sale(owner.token, "CREDIT", 30_000, c.id));
      ok(await closeCash(owner.token, 0));
      expect((await voidSale(owner.token, s.id)).status).toBe(200);
    });
  });
});



