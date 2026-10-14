
import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { http, registerStore } from "./helpers";

const newUser = () => ({
  storeName: "Tienda Don Pepe",
  name: "Pepe",
  email: `pepe-${randomUUID()}@test.com`,
  password: "12345678",
});

describe("auth", () => {
  it("registra una tienda con su dueÃ±o y devuelve un token", async () => {
    const res = await request(app).post("/auth/register").send(newUser());
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.role).toBe("OWNER");
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("rechaza un correo repetido (409)", async () => {
    const user = newUser();
    await request(app).post("/auth/register").send(user);
    const res = await request(app).post("/auth/register").send(user);
    expect(res.status).toBe(409);
  });

  it("rechaza una contraseÃ±a corta (400) seÃ±alando el campo", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...newUser(), password: "123" });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toContain("password");
  });

  it("inicia sesiÃ³n con credenciales correctas", async () => {
    const user = newUser();
    await request(app).post("/auth/register").send(user);
    const res = await request(app).post("/auth/login").send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("da el mismo 401 con contraseÃ±a incorrecta y con correo inexistente", async () => {
    const user = newUser();
    await request(app).post("/auth/register").send(user);

    const wrongPassword = await request(app).post("/auth/login").send({ email: user.email, password: "otra-clave" });
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: `nadie-${randomUUID()}@test.com`, password: "12345678" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it("exige token en las rutas protegidas (401)", async () => {
    expect((await request(app).get("/customers")).status).toBe(401);
  });

  it("rechaza un token invÃ¡lido (401)", async () => {
    expect((await http.get("token-falso", "/customers")).status).toBe(401);
  });

  it("/auth/me devuelve el usuario del token", async () => {
    const store = await registerStore();
    const res = await http.get(store.token, "/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: store.userId, role: "OWNER", storeId: store.storeId });
  });
});



