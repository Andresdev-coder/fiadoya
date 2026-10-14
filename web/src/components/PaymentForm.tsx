import { Loader } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import { useCreatePayment } from "../api/payments";
import { formatCOP } from "../lib/format";
import { Field } from "./Field";

type Props = {
  customer: { id: string; name: string; balance: number };
  onDone: () => void;
};

type Method = "CASH" | "TRANSFER" | "OTHER";

const METHODS: { value: Method; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "OTHER", label: "Otro" },
];

export function PaymentForm({ customer, onDone }: Props) {
  const create = useCreatePayment();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const value = Number(amount);
  const isInteger = Number.isInteger(value) && value >= 1;
  const tooMuch = isInteger && value > customer.balance;
  const canSubmit = isInteger && !tooMuch && !create.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    try {
      const res = await create.mutateAsync({
        customerId: customer.id,
        amount: value,
        method,
        note: note.trim() || undefined,
      });
      toast.success(
        res.balanceAfter === 0
          ? `${customer.name} quedó al día`
          : `Abono de ${formatCOP(value)} registrado. Debe ${formatCOP(res.balanceAfter)}`,
      );
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el abono");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        {customer.name} debe <strong>{formatCOP(customer.balance)}</strong>.
      </p>

      <div>
        <Field
          label="Valor del abono ($)"
          type="number"
          inputMode="numeric"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          {tooMuch ? (
            <span className="text-red-600">No puede ser mayor a la deuda.</span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => setAmount(String(customer.balance))}
            className="font-medium text-emerald-700 hover:underline"
          >
            Pagar todo ({formatCOP(customer.balance)})
          </button>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Método</span>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <Field label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {create.isPending && <Loader size={18} className="animate-spin" />}
        Registrar abono
      </button>
    </form>
  );
}