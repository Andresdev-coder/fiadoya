import { KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { Modal } from "./Modal";
import { RecoveryCodeDialog } from "./RecoveryCodeDialog";

export function AccountCard() {
  const { user } = useAuth();
  const [changing, setChanging] = useState(false);
  const [recovery, setRecovery] = useState(false);

  if (!user) return null;

  if (user.isDemo) {
    return (
      <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
        Esta es una cuenta de demostración: su contraseña y su código de
        recuperación no se pueden modificar.
      </p>
    );
  }

  return (
    <div className="divide-y rounded-2xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold">Mi contraseña</p>
          <p className="text-sm text-slate-500">
            Cámbiala cuando quieras. Pedimos la actual para confirmar.
          </p>
        </div>
        <button
          onClick={() => setChanging(true)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
        >
          <KeyRound size={14} /> Cambiar
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            Código de recuperación
            {user.hasRecoveryCode ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <ShieldCheck size={12} /> Configurado
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <ShieldAlert size={12} /> Sin configurar
              </span>
            )}
          </p>
          <p className="text-sm text-slate-500">
            {user.hasRecoveryCode
              ? "Si olvidas tu contraseña, lo usas en «¿Olvidaste tu contraseña?». Generar uno nuevo invalida el anterior."
              : "Sin él, si olvidas tu contraseña no podrás volver a entrar."}
          </p>
        </div>
        <button
          onClick={() => setRecovery(true)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
        >
          <ShieldCheck size={14} />{" "}
          {user.hasRecoveryCode ? "Generar uno nuevo" : "Generar código"}
        </button>
      </div>

      {changing && (
        <Modal title="Cambiar mi contraseña" onClose={() => setChanging(false)}>
          <ChangePasswordForm onDone={() => setChanging(false)} />
        </Modal>
      )}
      {recovery && <RecoveryCodeDialog onClose={() => setRecovery(false)} />}
    </div>
  );
}
