
import { beforeEach, describe, expect, it } from "vitest";
import { addCashier, createCustomer, http, ok, pay, registerStore, sale, type Store } from "./helpers";

describe("clientes", () => {
  let owner: Store;

  beforeEach(async () => {
    owner = await registerStore();
  });

  it("crea un cliente con saldo 0 y todo el cupo disponible", async () => {
    const res = await http.post(owner.token, "/customers", {
      name: "DoÃ±a Marta",
      phone: "3001234567",
      creditLimit: 200_000,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "DoÃ±a Marta", balance: 0, available: 200_000 });
  });

  it("guarda y encuentra nombres con tildes y Ã±, sin importar mayÃºsculas", async () => {
    ok(await http.post(owner.token, "/customers", { name: "DoÃ±a Marta", creditLimit: 0 }));
    const res = await http.get(owner.token, `/customers?search=${encodeURIComponent("doÃ±a")}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("DoÃ±a Marta");
  });

  it("rechaza un telÃ©fono repetido en la misma tienda (409) pero lo permite en otra", async () => {
    const body = { name: "Cliente Uno", phone: "3001112233", creditLimit: 0 };
    ok(await http.post(owner.token, "/customers", body));
    expect((await http.post(owner.token, "/customers", body)).status).toBe(409);

    const other = await registerStore();
    expect((await http.post(other.token, "/customers", body)).status).toBe(201);
  });

  it.each([
    ["un nombre de una letra", { name: "A" }, "name"],
    ["un telÃ©fono invÃ¡lido", { name: "Cliente", phone: "abc" }, "phone"],
    ["un cupo negativo", { name: "Cliente", creditLimit: -1 }, "creditLimit"],
    ["un cupo con decimales", { name: "Cliente", creditLimit: 1000.5 }, "creditLimit"],
  ])("rechaza %s (400)", async (_caso, body, field) => {
    const res = await http.post(owner.token, "/customers", body);
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toContain(field);
  });

  it("rechaza un id que no es UUID (400)", async () => {
    expect((await http.get(owner.token, "/customers/no-es-un-uuid")).status).toBe(400);
  });

  it("el filtro withDebt solo trae a quien debe", async () => {
    const debtor = await createCustomer(owner.token, 100_000, "Deudor");
    await createCustomer(owner.token, 100_000, "Al dia");
    ok(await sale(owner.token, "CREDIT", 10_000, debtor.id));

    const res = await http.get(owner.token, "/customers?withDebt=true");
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(["Deudor"]);
  });

  describe("permisos", () => {
    it("el cajero crea clientes pero el cupo se fuerza a 0", async () => {
      const cashier = await addCashier(owner.storeId);
      const res = await http.post(cashier, "/customers", { name: "Cliente Cajero", creditLimit: 500_000 });
      expect(res.status).toBe(201);
      expect(res.body.creditLimit).toBe(0);
    });

    it("el cajero no puede cambiar el cupo (403)", async () => {
      const cashier = await addCashier(owner.storeId);
      const c = await createCustomer(owner.token, 100_000);
      const res = await http.patch(cashier, `/customers/${c.id}`, { creditLimit: 999_999 });
      expect(res.status).toBe(403);
    });

    it("el cajero sÃ­ puede editar otros datos sin alterar el cupo", async () => {
      const cashier = await addCashier(owner.storeId);
      const c = await createCustomer(owner.token, 100_000);
      const res = await http.patch(cashier, `/customers/${c.id}`, { notes: "Paga los viernes" });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ notes: "Paga los viernes", creditLimit: 100_000 });
    });
  });

  describe("ediciÃ³n", () => {
    it("el dueÃ±o cambia el cupo y el disponible se recalcula", async () => {
      const c = await createCustomer(owner.token, 100_000);
      ok(await sale(owner.token, "CREDIT", 40_000, c.id));
      const res = await http.patch(owner.token, `/customers/${c.id}`, { creditLimit: 300_000 });
      expect(res.body).toMatchObject({ creditLimit: 300_000, balance: 40_000, available: 260_000 });
    });

    it("editar otros campos no modifica el cupo", async () => {
      const c = await createCustomer(owner.token, 200_000);
      const res = await http.patch(owner.token, `/customers/${c.id}`, { notes: "Cliente antiguo" });
      expect(res.status).toBe(200);
      expect(res.body.creditLimit).toBe(200_000);
    });

    it("no deja desactivar a un cliente con deuda (409)", async () => {
      const c = await createCustomer(owner.token, 100_000);
      ok(await sale(owner.token, "CREDIT", 10_000, c.id));
      expect((await http.patch(owner.token, `/customers/${c.id}`, { active: false })).status).toBe(409);
    });

    it("un cliente sin deuda se desactiva y sale de la lista", async () => {
      const c = await createCustomer(owner.token, 100_000);
      expect((await http.patch(owner.token, `/customers/${c.id}`, { active: false })).status).toBe(200);
      expect((await http.get(owner.token, "/customers")).body).toHaveLength(0);
    });
  });

  it("una tienda no ve ni toca los clientes de otra", async () => {
    const mine = await createCustomer(owner.token, 100_000);
    const other = await registerStore();

    expect((await http.get(other.token, `/customers/${mine.id}`)).status).toBe(404);
    expect((await http.get(other.token, "/customers")).body).toHaveLength(0);
    expect((await http.patch(other.token, `/customers/${mine.id}`, { notes: "hack" })).status).toBe(404);
    expect((await sale(other.token, "CREDIT", 1_000, mine.id)).status).toBe(404);
    expect((await pay(other.token, mine.id, 1_000)).status).toBe(404);
  });
});



