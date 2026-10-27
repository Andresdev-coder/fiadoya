import { Copy, Loader } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { Field } from "./Field";
import { Modal } from "./Modal";

export function RecoveryCodeDialog({ onClose }: { onClose: () => void }) {
  const { issueRecoveryCode } = useAuth();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setError("");
    setBusy(true);
    try {
      setCode(await issueRecoveryCode(password));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo generar el código",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado");
    } catch {
      toast.error("No se pudo copiar. Escríbelo a mano.");
    }
  }

  return (
    <Modal title="Código de recuperación" onClose={onClose}>
      {code ? (
        <div className="space-y-4">
          <p className="rounded-xl border-2 border-emerald-600 bg-emerald-50 p-4 text-center font-mono text-xl font-bold tracking-wider">
            {code}
          </p>
          <button
            type="button"
            onClick={copy}
            className="mx-auto flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
          >
            <Copy size={14} /> Copiar código
          </button>
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Guárdalo en un lugar seguro (papel o un gestor de contraseñas).{" "}
            <strong>No se vuelve a mostrar</strong> y sirve una sola vez. Si
            generas otro, este deja de funcionar.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700"
          >
            Ya lo guardé
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-sm text-slate-600">
            Con este código podrás recuperar tu cuenta si olvidas la contraseña.
            Confirma tu contraseña para generarlo.
          </p>
          <Field
            label="Tu contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            disabled={!password || busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader size={18} className="animate-spin" />}
            Generar código
          </button>
        </form>
      )}
    </Modal>
  );
}
