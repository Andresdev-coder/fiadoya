import { describe, expect, it } from "vitest";
import { balanceOf, createCustomer, ok, pay, registerStore, sale } from "./helpers";

describe("concurrencia", () => {
  it("dos fiados simultáneos no pueden pasar el cupo entre los dos", async () => {
    const owner = await registerStore();

    // Varias rondas: una condición de carrera no siempre se manifiesta a la primera.
    for (let round = 1; round <= 5; round++) {
      const c = await createCustomer(owner.token, 200_000, `Cliente ronda ${round}`);

      // Cada fiado cabe solo (150.000 < 200.000), pero juntos no (300.000 > 200.000).
      const results = await Promise.all([
        sale(owner.token, "CREDIT", 150_000, c.id),
        sale(owner.token, "CREDIT", 150_000, c.id),
      ]);

      expect(results.map((r) => r.status).sort(), `ronda ${round}`).toEqual([201, 409]);
      expect(await balanceOf(owner.token, c.id), `ronda ${round}`).toBe(150_000);
    }
  });

  it("de 8 fiados simultáneos caben exactamente los que entran en el cupo", async () => {
    const owner = await registerStore();
    const c = await createCustomer(owner.token, 100_000);

    const results = await Promise.all(Array.from({ length: 8 }, () => sale(owner.token, "CREDIT", 30_000, c.id)));

    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    expect(await balanceOf(owner.token, c.id)).toBe(90_000);
  });

  it("dos abonos simultáneos no pueden dejar el saldo en negativo", async () => {
    const owner = await registerStore();

    for (let round = 1; round <= 5; round++) {
      const c = await createCustomer(owner.token, 200_000, `Cliente ronda ${round}`);
      ok(await sale(owner.token, "CREDIT", 100_000, c.id));

      // Cada abono cabe solo (70.000 < 100.000), pero juntos no.
      const results = await Promise.all([pay(owner.token, c.id, 70_000), pay(owner.token, c.id, 70_000)]);

      expect(results.map((r) => r.status).sort(), `ronda ${round}`).toEqual([201, 409]);
      expect(await balanceOf(owner.token, c.id), `ronda ${round}`).toBe(30_000);
    }
  });
});

