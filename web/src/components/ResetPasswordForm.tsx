import { Loader } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import { useUpdateUser } from "../api/users";
import { generatePassword } from "../lib/password";
import { CredentialsCard } from "./CredentialsCard";
import { Field } from "./Field";

type Props = { member: { id: string; name: string; email: string }; onDone: () => void };

export function ResetPasswordForm({ member, onDone }: Props) {
  const update = useUpdateUser(member.id);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const valid = password.length >= 8;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || update.isPending) return;
    setError("");
    try {
      await update.mutateAsync({ password });
      setDone(password);
      toast.success("Contraseña actualizada");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña");
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Entrégale la nueva contraseña a {member.name}. <strong>No se vuelve a mostrar.</strong>
        </p>
        <CredentialsCard email={member.email} password={done} />
        <button
          onClick={onDone}
          className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700"
        >
          Listo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Nueva contraseña para <strong>{member.name}</strong>. La anterior dejará de funcionar.
      </p>
      <div>
        <Field
          label="Nueva contraseña (mínimo 8)"
          type="text"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          onClick={() => setPassword(generatePassword())}
          className="mt-1 text-xs font-medium text-emerald-700 hover:underline"
        >
          Generar una contraseña segura
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        disabled={!valid || update.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {update.isPending && <Loader size={18} className="animate-spin" />}
        Guardar contraseña
      </button>
    </form>
  );
}