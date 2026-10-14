import { Ban, Banknote, HandCoins, Loader, Wallet } from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../api/client";
import {
  useClosings,
  useCreateClosing,
  useDailySummary,
} from "../../api/reports";
import { Field } from "../Field";
import { formatCOP, formatDateOnly, todayCO } from "../../lib/format";

function Diff({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="font-semibold text-emerald-700">Cuadra perfecto</span>
    );
  return (
    <span
      className={`font-semibold ${value < 0 ? "text-red-600" : "text-amber-700"}`}
    >
      {value < 0 ? "Faltan" : "Sobran"} {formatCOP(Math.abs(value))}
    </span>
  );
}

function Card({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="flex items-center gap-1.5 text-sm text-slate-500">
        {icon} {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function ClosingForm({
  date,
  expected,
}: {
  date: string;
  expected: number | undefined;
}) {
  const create = useCreateClosing();
  const [counted, setCounted] = useState("");
  const [error, setError] = useState("");

  const value = Number(counted);
  const valid = counted !== "" && Number.isInteger(value) && value >= 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || create.isPending) return;
    setError("");
    try {
      const closing = await create.mutateAsync({ date, countedAmount: value });
      toast.success(
        closing.difference === 0
          ? "Caja cerrada: cuadra perfecto"
          : `Caja cerrada: ${closing.difference < 0 ? "faltan" : "sobran"} ${formatCOP(Math.abs(closing.difference))}`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo cerrar la caja",
      );
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-3 rounded-xl border bg-white p-4"
    >
      <h3 className="font-semibold">Cerrar caja</h3>
      <Field
        label="Efectivo contado en el cajón ($)"
        type="number"
        inputMode="numeric"
        min={0}
        value={counted}
        onChange={(e) => setCounted(e.target.value)}
      />

      {valid && expected !== undefined && (
        <p className="text-sm">
          Diferencia: <Diff value={value - expected} />
        </p>
      )}

      <p className="text-xs text-slate-500">
        Cada día se cierra una sola vez y el cierre no se puede editar.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <button
        disabled={!valid || create.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {create.isPending && <Loader size={18} className="animate-spin" />}
        Cerrar caja
      </button>
    </form>
  );
}

export function CashTab() {
  const [date, setDate] = useState(todayCO);
  const summary = useDailySummary(date);
  const closings = useClosings();

  const s = summary.data;
  const closed = closings.data?.find((c) => c.date.slice(0, 10) === date);

  return (
    <div className="space-y-4">
      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Fecha
        </span>
        <input
          type="date"
          value={date}
          max={todayCO()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
      </label>

      {summary.isLoading && (
        <p className="flex items-center justify-center gap-2 py-8 text-slate-500">
          <Loader size={18} className="animate-spin" /> Cargando…
        </p>
      )}
      {summary.isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          No se pudo cargar el resumen del día.
        </p>
      )}

      {s && (
        <div
          className={`space-y-4 ${summary.isPlaceholderData ? "opacity-60" : ""}`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              icon={<Banknote size={16} />}
              label="Ventas de contado"
              value={formatCOP(s.sales.cash)}
              sub={`${s.sales.count} ventas en total`}
            />
            <Card
              icon={<HandCoins size={16} />}
              label="Fiados del día"
              value={formatCOP(s.sales.credit)}
            />
            <Card
              icon={<Wallet size={16} />}
              label="Abonos recibidos"
              value={formatCOP(s.payments.total)}
              sub={`Efectivo ${formatCOP(s.payments.byMethod.CASH)} · Transferencia ${formatCOP(
                s.payments.byMethod.TRANSFER,
              )} · Otro ${formatCOP(s.payments.byMethod.OTHER)}`}
            />
            <Card
              icon={<Ban size={16} />}
              label="Ventas anuladas"
              value={String(s.voidedSales)}
            />
          </div>

          <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-900">
              Efectivo esperado en caja
            </p>
            <p className="text-3xl font-bold text-emerald-800">
              {formatCOP(s.expectedCash)}
            </p>
            <p className="text-xs text-emerald-900/70">
              Ventas de contado + abonos en efectivo
            </p>
          </div>

          {closed ? (
            <div className="space-y-1 rounded-xl border bg-white p-4">
              <h3 className="font-semibold">Caja cerrada</h3>
              <p className="text-sm text-slate-600">
                Esperado {formatCOP(closed.expectedAmount)} · Contado{" "}
                {formatCOP(closed.countedAmount)}
              </p>
              <p className="text-sm">
                <Diff value={closed.difference} />
              </p>
              {closed.createdBy && (
                <p className="text-xs text-slate-400">
                  Cerró {closed.createdBy.name}
                </p>
              )}
            </div>
          ) : (
            <ClosingForm key={date} date={date} expected={s.expectedCash} />
          )}
        </div>
      )}

      {closings.data && closings.data.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Cierres anteriores</h3>
          <ul className="space-y-2">
            {closings.data.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3"
              >
                <div>
                  <p className="font-medium">{formatDateOnly(c.date)}</p>
                  <p className="text-xs text-slate-500">
                    Esperado {formatCOP(c.expectedAmount)} · Contado{" "}
                    {formatCOP(c.countedAmount)}
                  </p>
                </div>
                <p className="text-sm">
                  <Diff value={c.difference} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
