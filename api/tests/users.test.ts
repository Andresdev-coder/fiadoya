import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { addCashier, http, ok, registerStore, type Store } from "./helpers";

const PASSWORD = "Clave12345";
const uniqueEmail = () => `cajero-${randomUUID()}@test.com`;
const login = (email: string, password: string) => request(app).post("/auth/login").send({ email, password });
const newCashier = (token: string, body: object = {}) =>
  http.post(token, "/users", { name: "Mateo Giraldo", email: uniqueEmail(), password: PASSWORD, ...body });

describe("usuarios (equipo)", () => {
  let owner: Store;

  beforeEach(async () => {
    owner = await registerStore();
  });

  it("el dueño crea un cajero que inicia sesión con rol de cajero", async () => {
    const email = uniqueEmail();
    const res = await newCashier(owner.token, { email });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email, role: "CASHIER", active: true });
    expect(res.body).not.toHaveProperty("passwordHash");

    const session = ok(await login(email, PASSWORD), 200);
    expect(session.user.role).toBe("CASHIER");
    expect(session.user.storeId).toBe(owner.storeId);

    // Ve los clientes de su tienda, pero no los reportes.
    expect((await http.get(session.token, "/customers")).status).toBe(200);
    expect((await http.get(session.token, "/reports/overdue")).status).toBe(403);
  });

  it("rechaza un correo repetido, también si es de otra tienda (409)", async () => {
    const email = uniqueEmail();
    ok(await newCashier(owner.token, { email }));
    expect((await newCashier(owner.token, { email })).status).toBe(409);

    const other = await registerStore();
    expect((await newCashier(other.token, { email })).status).toBe(409);
  });

  it.each([
    ["una contraseña corta", { password: "123" }, "password"],
    ["un correo inválido", { email: "no-es-correo" }, "email"],
    ["un nombre de una letra", { name: "A" }, "name"],
  ])("rechaza %s (400)", async (_caso, body, field) => {
    const res = await newCashier(owner.token, body);
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toContain(field);
  });

  it("un cajero no puede gestionar usuarios (403)", async () => {
    const cashier = await addCashier(owner.storeId);
    expect((await http.get(cashier, "/users")).status).toBe(403);
    expect((await newCashier(cashier)).status).toBe(403);
  });

  it("lista solo a los usuarios de la propia tienda, con el dueño primero", async () => {
    ok(await newCashier(owner.token));
    const res = await http.get(owner.token, "/users");
    expect(res.body.map((u: { role: string }) => u.role)).toEqual(["OWNER", "CASHIER"]);

    const other = await registerStore();
    expect((await http.get(other.token, "/users")).body).toHaveLength(1);
  });

  it("cambiar la contraseña deja de aceptar la anterior", async () => {
    const email = uniqueEmail();
    const cashier = ok(await newCashier(owner.token, { email }));

    ok(await http.patch(owner.token, `/users/${cashier.id}`, { password: "NuevaClave987" }), 200);

    expect((await login(email, PASSWORD)).status).toBe(401);
    expect((await login(email, "NuevaClave987")).status).toBe(200);
  });

  it("desactivar a un cajero bloquea el login y cierra su sesión abierta; reactivarlo lo devuelve", async () => {
    const email = uniqueEmail();
    const cashier = ok(await newCashier(owner.token, { email }));
    const session = ok(await login(email, PASSWORD), 200);
    expect((await http.get(session.token, "/customers")).status).toBe(200);

    ok(await http.patch(owner.token, `/users/${cashier.id}`, { active: false }), 200);

    expect((await login(email, PASSWORD)).status).toBe(401);
    // El token que ya tenía deja de servir de inmediato.
    expect((await http.get(session.token, "/customers")).status).toBe(401);

    ok(await http.patch(owner.token, `/users/${cashier.id}`, { active: true }), 200);
    expect((await login(email, PASSWORD)).status).toBe(200);
  });

  it("el dueño no se puede modificar a sí mismo desde aquí (403)", async () => {
    const res = await http.patch(owner.token, `/users/${owner.userId}`, { active: false });
    expect(res.status).toBe(403);
  });

  it("no se puede tocar a un usuario de otra tienda (404)", async () => {
    const cashier = ok(await newCashier(owner.token));
    const other = await registerStore();
    expect((await http.patch(other.token, `/users/${cashier.id}`, { active: false })).status).toBe(404);
  });

  it("una edición vacía o con un id inválido se rechaza (400)", async () => {
    const cashier = ok(await newCashier(owner.token));
    expect((await http.patch(owner.token, `/users/${cashier.id}`, {})).status).toBe(400);
    expect((await http.patch(owner.token, "/users/no-es-uuid", { active: false })).status).toBe(400);
  });

  it("limita el equipo a 10 usuarios por tienda (409)", async () => {
    for (let i = 0; i < 9; i++) ok(await newCashier(owner.token)); // 9 cajeros + el dueño = 10
    const res = await newCashier(owner.token);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/10 usuarios/);
  });
});