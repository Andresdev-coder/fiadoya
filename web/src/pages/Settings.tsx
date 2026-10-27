import { KeyRound, Loader, UserCheck, UserPlus, UserX } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import type { StaffUser } from "../api/types";
import { useUpdateUser, useUsers } from "../api/users";
import { AccountCard } from "../components/AccountCard";
import { Modal } from "../components/Modal";
import { ResetPasswordForm } from "../components/ResetPasswordForm";
import { StaffForm } from "../components/StaffForm";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function DeactivateDialog({
  member,
  onClose,
}: {
  member: StaffUser;
  onClose: () => void;
}) {
  const update = useUpdateUser(member.id);

  async function confirm() {
    try {
      await update.mutateAsync({ active: false });
      toast.success(`${member.name} desactivado`);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo desactivar",
      );
    }
  }

  return (
    <Modal title="Desactivar cajero" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          <strong>{member.name}</strong> no podrá iniciar sesión, y si tiene una
          sesión abierta se cerrará en su próxima acción. Sus ventas y abonos
          anteriores se conservan, y puedes reactivarlo cuando quieras.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border py-2.5 font-medium hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={update.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {update.isPending && <Loader size={16} className="animate-spin" />}
            Desactivar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StaffRow({
  member,
  onResetPassword,
  onDeactivate,
}: {
  member: StaffUser;
  onResetPassword: () => void;
  onDeactivate: () => void;
}) {
  const update = useUpdateUser(member.id);
  const isCashier = member.role === "CASHIER";

  async function reactivate() {
    try {
      await update.mutateAsync({ active: true });
      toast.success(`${member.name} reactivado`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo reactivar",
      );
    }
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 ${member.active ? "" : "opacity-75"}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
        {initials(member.name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold">
          <span className="truncate">{member.name}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {isCashier ? "Cajero" : "Dueño"}
          </span>
          {member.isDemo && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              Demo
            </span>
          )}
          {!member.active && (
            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Inactivo
            </span>
          )}
        </p>
        <p className="truncate text-sm text-slate-500">{member.email}</p>
      </div>

      {isCashier && !member.isDemo && (
        <div className="flex gap-2">
          <button
            onClick={onResetPassword}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
          >
            <KeyRound size={14} /> Contraseña
          </button>
          {member.active ? (
            <button
              onClick={onDeactivate}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
            >
              <UserX size={14} /> Desactivar
            </button>
          ) : (
            <button
              onClick={reactivate}
              disabled={update.isPending}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
            >
              {update.isPending ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <UserCheck size={14} />
              )}
              Reactivar
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function SettingsPage() {
  const { data, isLoading, isError, error } = useUsers();
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<StaffUser | null>(null);
  const [deactivating, setDeactivating] = useState<StaffUser | null>(null);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-slate-500">
            Las personas que pueden entrar a tu tienda.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          <UserPlus size={18} /> Nuevo cajero
        </button>
      </div>

      <AccountCard />

      <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
        Los cajeros pueden registrar ventas, abonos y clientes. No ven los
        reportes ni pueden anular movimientos, cambiar cupos o desactivar
        clientes.
      </p>

      {isLoading && (
        <p className="flex items-center justify-center gap-2 py-8 text-slate-500">
          <Loader size={18} className="animate-spin" /> Cargando…
        </p>
      )}
      {isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : "No se pudo cargar el equipo"}
        </p>
      )}

      <ul className="space-y-2">
        {data?.map((member) => (
          <StaffRow
            key={member.id}
            member={member}
            onResetPassword={() => setResetting(member)}
            onDeactivate={() => setDeactivating(member)}
          />
        ))}
      </ul>

      {data && data.length === 1 && (
        <p className="py-4 text-center text-sm text-slate-500">
          Aún no tienes cajeros. Crea uno para que atienda el mostrador sin ver
          tus reportes.
        </p>
      )}

      {creating && (
        <Modal title="Nuevo cajero" onClose={() => setCreating(false)}>
          <StaffForm onDone={() => setCreating(false)} />
        </Modal>
      )}

      {resetting && (
        <Modal title="Cambiar contraseña" onClose={() => setResetting(null)}>
          <ResetPasswordForm
            member={resetting}
            onDone={() => setResetting(null)}
          />
        </Modal>
      )}

      {deactivating && (
        <DeactivateDialog
          member={deactivating}
          onClose={() => setDeactivating(null)}
        />
      )}
    </section>
  );
}
