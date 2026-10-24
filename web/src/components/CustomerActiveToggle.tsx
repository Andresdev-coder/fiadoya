import { Loader, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import { useUpdateCustomer } from "../api/customers";
import { formatCOP } from "../lib/format";
import { Modal } from "./Modal";

type Props = {
  customer: { id: string; name: string; active: boolean; balance: number };
};

export function CustomerActiveToggle({ customer }: Props) {
  const update = useUpdateCustomer(customer.id);
  const [confirming, setConfirming] = useState(false);
  const hasDebt = customer.balance > 0;

  async function setActive(active: boolean) {
    try {
      await update.mutateAsync({ active });
      toast.success(
        active ? `${customer.name} reactivado` : `${customer.name} desactivado`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar el cliente",
      );
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div className="min-w-0">
          <p className="font-medium">
            {customer.active ? "Desactivar cliente" : "Reactivar cliente"}
          </p>
          <p className="text-sm text-slate-500">
            {customer.active
              ? hasDebt
                ? `Primero debe quedar al día: aún debe ${formatCOP(customer.balance)}.`
                : "Deja de aparecer en la lista y no podrá recibir fiados. Su historial se conserva."
              : "Volverá a aparecer en la lista y podrá recibir fiados."}
          </p>
        </div>

        <button
          onClick={() =>
            customer.active ? setConfirming(true) : setActive(true)
          }
          disabled={update.isPending || (customer.active && hasDebt)}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {update.isPending ? (
            <Loader size={16} className="animate-spin" />
          ) : customer.active ? (
            <UserX size={16} />
          ) : (
            <UserCheck size={16} />
          )}
          {customer.active ? "Desactivar" : "Reactivar"}
        </button>
      </div>

      {confirming && (
        <Modal title="Desactivar cliente" onClose={() => setConfirming(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>{customer.name}</strong> dejará de aparecer en la lista de
              clientes y no podrá recibir fiados. Su historial se conserva y
              puedes reactivarlo cuando quieras.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg border py-2.5 font-medium hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => setActive(false)}
                disabled={update.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {update.isPending && (
                  <Loader size={16} className="animate-spin" />
                )}
                Desactivar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
