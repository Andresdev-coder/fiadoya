import { Loader, Lock, Mail } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { AuthShell, SlowHint } from "../components/AuthShell";
import { Field } from "../components/Field";
import { useAuth } from "../hooks/useAuth";
import { useDelayedFlag } from "../hooks/useDelayedFlag";

// Cuentas de la demostración (se crean con `pnpm seed:demo:prod`).
const DEMO_PASSWORD = "Demo12345";
const DEMO_ACCOUNTS = [
  { label: "Cuenta de dueño", email: "demo@fiadoya.app" },
  { label: "Cuenta de cajero", email: "cajero@fiadoya.app" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const slow = useDelayedFlag(busy);

  if (user) return <Navigate to="/" replace />;

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo salió mal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle="Ingresa a tu tienda para ver tus cuentas."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Correo"
          type="email"
          autoComplete="email"
          icon={<Mail size={18} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          icon={<Lock size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <SlowHint show={slow} />

        <button
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy && <Loader size={18} className="animate-spin" />}
          {busy ? "Ingresando…" : "Ingresar"}
        </button>

        <div className="relative py-1 text-center">
          <div className="absolute inset-x-0 top-1/2 border-t" />
          <span className="relative bg-white px-3 text-xs text-slate-500">
            o prueba la demostración
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={busy}
              onClick={() => fillDemo(account.email)}
              className="rounded-lg border py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
            >
              {account.label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500">
          Llenan el formulario con una cuenta ficticia (contraseña{" "}
          <strong>{DEMO_PASSWORD}</strong>); solo falta pulsar Ingresar.
          Cualquier visitante puede modificar estos datos.
        </p>

        <p className="text-center text-sm text-slate-500">
          ¿Tu tienda aún no está?{" "}
          <Link
            to="/register"
            className="font-medium text-emerald-700 hover:underline"
          >
            Regístrala
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
