import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { addCashier, http, ok, registerStore, type Store } from "./helpers";

const PASSWORD = "12345678"; // la que usa registerStore
const CODE_FORMAT = /^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){3}$/;

/** Un token emitido hace un minuto, para comprobar que un cambio de contraseña lo invalida. */
function staleToken(
  userId: string,
  storeId: string,
  role: "OWNER" | "CASHIER",
) {
  const issuedAt = Math.floor(Date.now() / 1000) - 60;
  return jwt.sign({ storeId, role, iat: issuedAt }, process.env.JWT_SECRET!, {
    subject: userId,
    expiresIn: "7d",
  });
}

describe("cuenta: contraseña y recuperación", () => {
  let owner: Store;
  let email: string;

  beforeEach(async () => {
    owner = await registerStore();
    email = ok(await http.get(owner.token, "/auth/me"), 200).email;
  });

  const login = (password: string) =>
    request(app).post("/auth/login").send({ email, password });
  const changePassword = (token: string, body: object) =>
    http.post(token, "/auth/change-password", body);
  const recover = (body: object) =>
    request(app).post("/auth/recover").send(body);
  const issueCode = async () =>
    ok(
      await http.post(owner.token, "/auth/recovery-code", {
        password: PASSWORD,
      }),
      200,
    ).recoveryCode as string;

  describe("cambiar la contraseña", () => {
    it("exige la contraseña actual correcta (400) y no cambia nada", async () => {
      const res = await changePassword(owner.token, {
        currentPassword: "equivocada",
        newPassword: "NuevaClave123",
      });
      expect(res.status).toBe(400);
      expect((await login(PASSWORD)).status).toBe(200);
    });

    it("con la actual correcta cambia la contraseña y devuelve una sesión nueva", async () => {
      const res = await changePassword(owner.token, {
        currentPassword: PASSWORD,
        newPassword: "NuevaClave123",
      });
      expect(res.status).toBe(200);
      expect((await http.get(res.body.token, "/customers")).status).toBe(200);
      expect((await login(PASSWORD)).status).toBe(401);
      expect((await login("NuevaClave123")).status).toBe(200);
    });

    it("cierra las sesiones anteriores", async () => {
      const stale = staleToken(owner.userId, owner.storeId, "OWNER");
      expect((await http.get(stale, "/customers")).status).toBe(200);

      const res = await changePassword(owner.token, {
        currentPassword: PASSWORD,
        newPassword: "NuevaClave123",
      });
      expect(res.status).toBe(200);

      expect((await http.get(stale, "/customers")).status).toBe(401);
      expect((await http.get(res.body.token, "/customers")).status).toBe(200);
    });

    it.each([
      [
        "una contraseña nueva corta",
        { currentPassword: PASSWORD, newPassword: "123" },
      ],
      [
        "la misma contraseña",
        { currentPassword: PASSWORD, newPassword: PASSWORD },
      ],
    ])("rechaza %s (400) señalando el campo", async (_caso, body) => {
      const res = await changePassword(owner.token, body);
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: { field: string }) => e.field)).toContain(
        "newPassword",
      );
    });

    it("también lo puede hacer un cajero con su propia sesión", async () => {
      const cashierToken = await addCashier(owner.storeId);
      const res = await changePassword(cashierToken, {
        currentPassword: PASSWORD,
        newPassword: "NuevaClave123",
      });
      expect(res.status).toBe(200);
    });
  });

  describe("código de recuperación", () => {
    it("empieza sin código y se genera con la contraseña (400 si es incorrecta)", async () => {
      expect(
        ok(await http.get(owner.token, "/auth/me"), 200).hasRecoveryCode,
      ).toBe(false);

      expect(
        (
          await http.post(owner.token, "/auth/recovery-code", {
            password: "equivocada",
          })
        ).status,
      ).toBe(400);

      const code = await issueCode();
      expect(code).toMatch(CODE_FORMAT);
      expect(
        ok(await http.get(owner.token, "/auth/me"), 200).hasRecoveryCode,
      ).toBe(true);
    });

    it("solo el dueño puede generarlo (403 al cajero)", async () => {
      const cashierToken = await addCashier(owner.storeId);
      const res = await http.post(cashierToken, "/auth/recovery-code", {
        password: PASSWORD,
      });
      expect(res.status).toBe(403);
    });

    it("generar uno nuevo invalida el anterior", async () => {
      const first = await issueCode();
      const second = await issueCode();
      expect(second).not.toBe(first);

      expect(
        (
          await recover({
            email,
            recoveryCode: first,
            newPassword: "NuevaClave123",
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await recover({
            email,
            recoveryCode: second,
            newPassword: "NuevaClave123",
          })
        ).status,
      ).toBe(200);
    });
  });

  describe("recuperar la cuenta", () => {
    it("con el código correcto (aun en minúsculas y sin guiones) cambia la contraseña y entra", async () => {
      const code = await issueCode();
      const typed = code.toLowerCase().replaceAll("-", "");

      const res = await recover({
        email,
        recoveryCode: typed,
        newPassword: "NuevaClave123",
      });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        role: "OWNER",
        hasRecoveryCode: false,
      });
      expect((await http.get(res.body.token, "/customers")).status).toBe(200);

      expect((await login(PASSWORD)).status).toBe(401);
      expect((await login("NuevaClave123")).status).toBe(200);
    });

    it("el código sirve una sola vez", async () => {
      const code = await issueCode();
      ok(
        await recover({
          email,
          recoveryCode: code,
          newPassword: "ClaveUno1234",
        }),
        200,
      );
      const again = await recover({
        email,
        recoveryCode: code,
        newPassword: "ClaveDos1234",
      });
      expect(again.status).toBe(400);
    });

    it("dos intentos simultáneos con el mismo código: solo uno pasa", async () => {
      const code = await issueCode();
      const results = await Promise.all([
        recover({ email, recoveryCode: code, newPassword: "ClaveUno1234" }),
        recover({ email, recoveryCode: code, newPassword: "ClaveDos1234" }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    });

    it("da el mismo error con un código incorrecto y con un correo inexistente", async () => {
      await issueCode();
      const wrongCode = await recover({
        email,
        recoveryCode: "AAAA-AAAA-AAAA-AAAA",
        newPassword: "NuevaClave123",
      });
      const unknownEmail = await recover({
        email: "nadie@test.com",
        recoveryCode: "AAAA-AAAA-AAAA-AAAA",
        newPassword: "NuevaClave123",
      });
      expect(wrongCode.status).toBe(400);
      expect(unknownEmail.status).toBe(400);
      expect(wrongCode.body.message).toBe(unknownEmail.body.message);
      expect((await login(PASSWORD)).status).toBe(200); // la contraseña no cambió
    });

    it("cierra las sesiones abiertas", async () => {
      const code = await issueCode();
      const stale = staleToken(owner.userId, owner.storeId, "OWNER");
      expect((await http.get(stale, "/customers")).status).toBe(200);

      ok(
        await recover({
          email,
          recoveryCode: code,
          newPassword: "NuevaClave123",
        }),
        200,
      );
      expect((await http.get(stale, "/customers")).status).toBe(401);
    });

    it("un cajero no puede recuperar así su cuenta (400)", async () => {
      const cashier = ok(
        await http.post(owner.token, "/users", {
          name: "Cajero Prueba",
          email: "cajero-recupera@test.com",
          password: "ClaveCajero123",
        }),
      );
      const res = await recover({
        email: cashier.email,
        recoveryCode: "AAAA-AAAA-AAAA-AAAA",
        newPassword: "NuevaClave123",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("equipo", () => {
    it("cambiarle la contraseña a un cajero cierra su sesión abierta", async () => {
      const cashier = ok(
        await http.post(owner.token, "/users", {
          name: "Cajero Prueba",
          email: "cajero-sesion@test.com",
          password: "ClaveCajero123",
        }),
      );
      const stale = staleToken(cashier.id, owner.storeId, "CASHIER");
      expect((await http.get(stale, "/customers")).status).toBe(200);

      ok(
        await http.patch(owner.token, `/users/${cashier.id}`, {
          password: "OtraClave12345",
        }),
        200,
      );
      expect((await http.get(stale, "/customers")).status).toBe(401);
    });
  });

  describe("cuentas de demostración", () => {
    it("una cuenta protegida no puede cambiar ni recuperar su contraseña (403)", async () => {
      const demoEmail = "demo-protegida@test.com";
      const reg = await request(app)
        .post("/auth/register")
        .send({
          storeName: "Tienda Demo",
          name: "Demo",
          email: demoEmail,
          password: PASSWORD,
        });
      const session =
        reg.status === 201
          ? reg.body
          : ok(
              await request(app)
                .post("/auth/login")
                .send({ email: demoEmail, password: PASSWORD }),
              200,
            );

      expect(ok(await http.get(session.token, "/auth/me"), 200).isDemo).toBe(
        true,
      );
      expect(
        (
          await changePassword(session.token, {
            currentPassword: PASSWORD,
            newPassword: "NuevaClave123",
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await http.post(session.token, "/auth/recovery-code", {
            password: PASSWORD,
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await recover({
            email: demoEmail,
            recoveryCode: "AAAA-AAAA-AAAA-AAAA",
            newPassword: "NuevaClave123",
          })
        ).status,
      ).toBe(403);
    });
  });
});
