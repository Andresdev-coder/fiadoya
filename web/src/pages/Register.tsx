import { Loader, Lock, Mail, Store, User } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { AuthShell, SlowHint } from "../components/AuthShell";
import { Field } from "../components/Field";
import { useAuth } from "../hooks/useAuth";
import { useDelayedFlag } from "../hooks/useDelayedFlag";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ storeName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const slow = useDelayedFlag(busy);

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
    <AuthShell title="Crea tu tienda" subtitle="Empieza a llevar tus fiados en minutos.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Field label="Nombre de la tienda" icon={<Store size={18} />} value={form.storeName} onChange={set("storeName")} required />
          {hint("storeName")}
        </div>
        <div>
          <Field label="Tu nombre" autoComplete="name" icon={<User size={18} />} value={form.name} onChange={set("name")} required />
          {hint("name")}
        </div>
        <div>
          <Field label="Correo" type="email" autoComplete="email" icon={<Mail size={18} />} value={form.email} onChange={set("email")} required />
          {hint("email")}
        </div>
        <div>
          <Field
            label="Contraseña (mínimo 8)"
            type="password"
            autoComplete="new-password"
            icon={<Lock size={18} />}
            value={form.password}
            onChange={set("password")}
            required
          />
          {hint("password")}
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <SlowHint show={slow} />

        <button
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy && <Loader size={18} className="animate-spin" />}
          {busy ? "Creando…" : "Crear tienda"}
        </button>

        <p className="text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Ingresa
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}