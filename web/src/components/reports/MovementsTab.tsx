import { Ban, HandCoins, Loader, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDayMovements, useVoidPayment, useVoidSale } from "../../api/voids";
import { formatCOP, formatDateTime, todayCO } from "../../lib/format";
import { VoidDialog } from "../VoidDialog";

type Row = {
  kind: "SALE" | "PAYMENT";
  id: string;
  createdAt: string;
  amount: number;
  voided: boolean;
  title: string;
  detail: string;
  hint: string;
};

const METHOD = { CASH: "Efectivo", TRANSFER: "Transferencia", OTHER: "Otro" } as const;

export function MovementsTab() {
  const [date, setDate] = useState(todayCO);
  const { data, isLoading, isError } = useDayMovements(date);
  const voidSale = useVoidSale();
  const voidPayment = useVoidPayment();
  const [voiding, setVoiding] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const sales: Row[] = data.sales.map((s) => ({
      kind: "SALE",
      id: s.id,
      createdAt: s.createdAt,
      amount: s.total,
      voided: s.status === "VOIDED",
      title: s.type === "CASH" ? "Venta de contado" : `Fiado a ${s.customer?.name ?? "—"}`,
      detail:
        s.status === "VOIDED"
          ? `Anulada: ${s.voidReason ?? "sin motivo"}`
          : s.items.map((i) => `${i.quantity} x ${i.description}`).join(", "),
      hint:
        s.type === "CASH"
          ? "Se descontará de las ventas y del efectivo esperado en caja."
          : "El saldo del cliente bajará por este valor.",
    }));
    const payments: Row[] = data.payments.map((p) => ({
      kind: "PAYMENT",
      id: p.id,
      createdAt: p.createdAt,
      amount: p.amount,
      voided: p.status === "VOIDED",
      title: `Abono de ${p.customer.name}`,
      detail:
        p.status === "VOIDED"
          ? `Anulado: ${p.voidReason ?? "sin motivo"}`
          : (p.note ?? METHOD[p.method]),
      hint:
        p.method === "CASH"
          ? "El saldo del cliente volverá a subir y se descontará del efectivo esperado."
          : "El saldo del cliente volverá a subir por este valor.",
    }));
    return [...sales, ...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data]);

  async function confirmVoid(reason: string) {
    if (!voiding) return;
    if (voiding.kind === "SALE") await voidSale.mutateAsync({ id: voiding.id, reason });
    else await voidPayment.mutateAsync({ id: voiding.id, reason });
    toast.success(voiding.kind === "SALE" ? "Venta anulada" : "Abono anulado");
    setVoiding(null);
  }

  return (
    <div className="space-y-4">
      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-medium text-slate-700">Fecha</span>
        <input
          type="date"
          value={date}
          max={todayCO()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
      </label>

      {isLoading && (
        <p className="flex items-center justify-center gap-2 py-8 text-slate-500">
          <Loader size={18} className="animate-spin" /> Cargando…
        </p>
      )}
      {isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">No se pudieron cargar los movimientos.</p>
      )}

      {data && rows.length === 0 && (
        <p className="rounded-xl border bg-white py-8 text-center text-slate-500">Sin movimientos este día.</p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={`${r.kind}-${r.id}`} className="flex items-center gap-3 rounded-xl border bg-white p-3">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full ${
                r.voided
                  ? "bg-slate-100 text-slate-400"
                  : r.kind === "SALE"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {r.kind === "SALE" ? <ShoppingBag size={18} /> : <HandCoins size={18} />}
            </span>

            <div className="min-w-0 flex-1">
              <p className={`truncate font-medium ${r.voided ? "text-slate-400 line-through" : ""}`}>
                {r.title}
                {r.voided && (
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 align-middle text-xs font-normal text-slate-500 no-underline">
                    Anulado
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-slate-500">{r.detail}</p>
              <p className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</p>
            </div>

            <div className="shrink-0 text-right">
              <p className={`font-bold ${r.voided ? "text-slate-400 line-through" : ""}`}>{formatCOP(r.amount)}</p>
              {!r.voided && (
                <button
                  onClick={() => setVoiding(r)}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600"
                >
                  <Ban size={12} /> Anular
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {voiding && (
        <VoidDialog
          title={voiding.kind === "SALE" ? "Anular venta" : "Anular abono"}
          summary={`${voiding.title} · ${formatCOP(voiding.amount)}`}
          hint={voiding.hint}
          onConfirm={confirmVoid}
          onClose={() => setVoiding(null)}
        />
      )}
    </div>
  );
}