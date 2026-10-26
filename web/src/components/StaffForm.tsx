import { Loader } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import { useCreateUser } from "../api/users";
import { generatePassword } from "../lib/password";
import { CredentialsCard } from "./CredentialsCard";
import { Field } from "./Field";

export function StaffForm({ onDone }: { onDone: () => void }) {
  const create = useCreateUser();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const valid = form.name.trim().length >= 2 && form.email.includes("@") && form.password.length >= 8;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || create.isPending) return;
    setError("");
    setFields({});
    try {
      const user = await create.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setCreated({ email: user.email, password: form.password });
      toast.success(`Cajero ${user.name} creado`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(Object.fromEntries(err.fields.map((f) => [f.field, f.message])));
      } else setError("No se pudo crear el cajero");
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Entrégale estos datos al cajero. <strong>La contraseña no se vuelve a mostrar</strong>, pero puedes
          cambiarla cuando quieras.
        </p>
        <CredentialsCard email={created.email} password={created.password} />
        <button
          onClick={onDone}
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700"
        >
          Listo
        </button>
      </div>
    );
  }

  const hint = (name: string) => fields[name] && <p className="mt-1 text-xs text-red-600">{fields[name]}</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <Field label="Nombre" value={form.name} onChange={set("name")} autoFocus />
        {hint("name")}
      </div>
      <div>
        <Field label="Correo" type="email" autoComplete="off" value={form.email} onChange={set("email")} />
        {hint("email")}
      </div>
      <div>
        <Field
          label="Contraseña (mínimo 8)"
          type="text"
          autoComplete="off"
          value={form.password}
          onChange={set("password")}
        />
        {hint("password")}
        <button
          type="button"
          onClick={() => setForm({ ...form, password: generatePassword() })}
          className="mt-1 text-xs font-medium text-emerald-700 hover:underline"
        >
          Generar una contraseña segura
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        disabled={!valid || create.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {create.isPending && <Loader size={18} className="animate-spin" />}
        Crear cajero
      </button>
    </form>
  );
}