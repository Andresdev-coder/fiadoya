import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { Field } from "../components/Field";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

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
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-emerald-700">FiadoYa</h1>
        <p className="text-sm text-slate-500">Ingresa a tu tienda</p>

        <Field label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Ingresando…" : "Ingresar"}
        </button>

        <p className="text-center text-sm text-slate-500">
          ¿Tu tienda aún no está?{" "}
          <Link to="/register" className="font-medium text-emerald-700 hover:underline">
            Regístrala
          </Link>
        </p>
      </form>
    </main>
  );
}