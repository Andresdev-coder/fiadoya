import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { Field } from "../components/Field";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ storeName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(Object.fromEntries(err.fields.map((f) => [f.field, f.message])));
      } else setError("Algo salió mal");
    } finally {
      setBusy(false);
    }
  }

  const hint = (name: string) =>
    fields[name] && <p className="mt-1 text-xs text-red-600">{fields[name]}</p>;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-emerald-700">Crea tu tienda</h1>

        <div>
          <Field label="Nombre de la tienda" value={form.storeName} onChange={set("storeName")} required />
          {hint("storeName")}
        </div>
        <div>
          <Field label="Tu nombre" value={form.name} onChange={set("name")} required />
          {hint("name")}
        </div>
        <div>
          <Field label="Correo" type="email" value={form.email} onChange={set("email")} required />
          {hint("email")}
        </div>
        <div>
          <Field label="Contraseña (mínimo 8)" type="password" value={form.password} onChange={set("password")} required />
          {hint("password")}
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Creando…" : "Crear tienda"}
        </button>

        <p className="text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Ingresa
          </Link>
        </p>
      </form>
    </main>
  );
}