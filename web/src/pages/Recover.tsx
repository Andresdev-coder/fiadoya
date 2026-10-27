import { Loader, Lock, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { AuthShell, SlowHint } from "../components/AuthShell";
import { Field } from "../components/Field";
import { useAuth } from "../hooks/useAuth";
import { useDelayedFlag } from "../hooks/useDelayedFlag";

export default function Recover() {
  const { user, recoverPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    recoveryCode: "",
    newPassword: "",
  });
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const slow = useDelayedFlag(busy);

  if (user) return <Navigate to="/" replace />;

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    try {
      await recoverPassword(form);
      toast.success(
        "Contraseña restablecida. Genera un código de recuperación nuevo en Configuración.",
      );
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(
          Object.fromEntries(err.fields.map((f) => [f.field, f.message])),
        );
      } else setError("Algo salió mal");
    } finally {
      setBusy(false);
    }
  }

  const hint = (name: string) =>
    fields[name] && <p className="mt-1 text-xs text-red-600">{fields[name]}</p>;

  return (
    <AuthShell
      title="Recupera tu cuenta"
      subtitle="Usa el código de recuperación que generaste en Configuración."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Field
            label="Correo"
            type="email"
            autoComplete="email"
            icon={<Mail size={18} />}
            value={form.email}
            onChange={set("email")}
            required
          />
          {hint("email")}
        </div>
        <div>
          <Field
            label="Código de recuperación"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            icon={<ShieldCheck size={18} />}
            value={form.recoveryCode}
            onChange={set("recoveryCode")}
            required
          />
          {hint("recoveryCode")}
        </div>
        <div>
          <Field
            label="Nueva contraseña (mínimo 8)"
            type="password"
            autoComplete="new-password"
            icon={<Lock size={18} />}
            value={form.newPassword}
            onChange={set("newPassword")}
            required
          />
          {hint("newPassword")}
        </div>

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
          {busy ? "Verificando…" : "Restablecer contraseña"}
        </button>

        <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
          Esto es solo para dueños. Si eres cajero, pídele a tu dueño que te
          cambie la contraseña desde Configuración.
        </p>

        <p className="text-center text-sm text-slate-500">
          <Link
            to="/login"
            className="font-medium text-emerald-700 hover:underline"
          >
            Volver a ingresar
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
