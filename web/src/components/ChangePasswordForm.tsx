import { Loader } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { Field } from "./Field";

export function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sameAsCurrent = next.length > 0 && next === current;
  const valid = current.length > 0 && next.length >= 8 && !sameAsCurrent;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setError("");
    setBusy(true);
    try {
      await changePassword(current, next);
      toast.success("Contraseña actualizada");
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo cambiar la contraseña",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoFocus
      />
      <div>
        <Field
          label="Nueva contraseña (mínimo 8)"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        {sameAsCurrent && (
          <p className="mt-1 text-xs text-red-600">
            Debe ser distinta de la actual.
          </p>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Al cambiarla, las demás sesiones abiertas con tu cuenta se cerrarán.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <button
        disabled={!valid || busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && <Loader size={18} className="animate-spin" />}
        Guardar contraseña
      </button>
    </form>
  );
}
