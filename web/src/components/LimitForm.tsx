import { Loader } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import { useUpdateCustomer } from "../api/customers";
import { formatCOP } from "../lib/format";
import { Field } from "./Field";

type Props = {
  customer: { id: string; creditLimit: number; balance: number };
  onDone: () => void;
};

export function LimitForm({ customer, onDone }: Props) {
  const update = useUpdateCustomer(customer.id);
  const [limit, setLimit] = useState(String(customer.creditLimit));
  const [error, setError] = useState("");

  const value = Number(limit);
  const valid = limit !== "" && Number.isInteger(value) && value >= 0;
  const belowDebt = valid && value < customer.balance;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError("");
    try {
      await update.mutateAsync({ creditLimit: value });
      toast.success(`Cupo actualizado a ${formatCOP(value)}`);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el cupo");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        label="Cupo de fiado ($)"
        type="number"
        inputMode="numeric"
        min={0}
        value={limit}
        onChange={(e) => setLimit(e.target.value)}
        autoFocus
      />

      {belowDebt && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          El cliente ya debe {formatCOP(customer.balance)}. Con este cupo no podrá fiar más hasta que
          pague la diferencia.
        </p>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        disabled={!valid || update.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {update.isPending && <Loader size={18} className="animate-spin" />}
        Guardar cupo
      </button>
    </form>
  );
}