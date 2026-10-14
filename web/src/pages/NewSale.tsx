import { Banknote, HandCoins, Loader, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import { useCustomers } from "../api/customers";
import { useCreateSale } from "../api/sales";
import type { Customer } from "../api/types";
import { CustomerPicker } from "../components/CustomerPicker";
import { formatCOP } from "../lib/format";

type SaleType = "CASH" | "CREDIT";
type Row = { key: string; description: string; quantity: string; unitPrice: string };

const newRow = (): Row => ({ key: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" });
const subtotal = (r: Row) => (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
const isValid = (r: Row) =>
  Number.isInteger(Number(r.quantity)) &&
  Number(r.quantity) >= 1 &&
  Number.isInteger(Number(r.unitPrice)) &&
  Number(r.unitPrice) >= 1;

const inputCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";

export default function NewSale() {
  const create = useCreateSale();
  const [type, setType] = useState<SaleType>("CASH");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [rows, setRows] = useState<Row[]>([newRow()]);

  // Versión fresca del cliente (se actualiza al refrescar la lista).
  const { data: all } = useCustomers("", false);
  const customer = selected ? (all?.find((c) => c.id === selected.id) ?? selected) : null;

  // Las filas totalmente vacías se ignoran.
  const filled = rows.filter((r) => r.description.trim() !== "" || r.unitPrice !== "");
  const total = filled.reduce((sum, r) => sum + subtotal(r), 0);
  const itemsOk = filled.length > 0 && filled.every(isValid);

  const isCredit = type === "CREDIT";
  const balance = customer?.balance ?? 0;
  const overLimit = isCredit && customer !== null && balance + total > customer.creditLimit;

  const blockReason = !itemsOk
    ? "Agrega al menos un producto con precio."
    : isCredit && !customer
      ? "Elige el cliente al que le vas a fiar."
      : overLimit
        ? "La venta supera el cupo del cliente."
        : "";

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (blockReason || create.isPending) return;

    try {
      const sale = await create.mutateAsync({
        type,
        customerId: isCredit ? customer!.id : undefined,
        items: filled.map((r) => ({
          description: r.description.trim() || "Varios",
          quantity: Number(r.quantity),
          unitPrice: Number(r.unitPrice),
        })),
      });

      toast.success(
        isCredit
          ? `Fiado de ${formatCOP(sale.total)} a ${customer!.name}`
          : `Venta de ${formatCOP(sale.total)} registrada`,
      );
      setRows([newRow()]);
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo registrar la venta");
    }
  }

  // Enter dentro de un campo no debe registrar la venta por accidente.
  function blockEnter(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
  }

  const typeBtn = (value: SaleType, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      aria-pressed={type === value}
      onClick={() => setType(value)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold ${
        type === value
          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <form onSubmit={onSubmit} onKeyDown={blockEnter} noValidate className="space-y-5">
      <h1 className="text-2xl font-bold">Nueva venta</h1>

      <div className="flex gap-3">
        {typeBtn("CASH", "De contado", <Banknote size={20} />)}
        {typeBtn("CREDIT", "Fiado", <HandCoins size={20} />)}
      </div>

      {isCredit && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Cliente</h2>
          <CustomerPicker value={customer} onChange={setSelected} />
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Productos</h2>

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
              <input
                value={r.description}
                onChange={(e) => update(r.key, { description: e.target.value })}
                placeholder="Descripción (opcional)"
                aria-label="Descripción"
                className={`${inputCls} min-w-0 flex-[2_1_12rem]`}
              />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={r.quantity}
                onChange={(e) => update(r.key, { quantity: e.target.value })}
                placeholder="Cant"
                aria-label="Cantidad"
                className={`${inputCls} w-20`}
              />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={r.unitPrice}
                onChange={(e) => update(r.key, { unitPrice: e.target.value })}
                placeholder="Precio"
                aria-label="Precio unitario"
                className={`${inputCls} w-32`}
              />
              <span className="w-24 text-right font-medium">{formatCOP(subtotal(r))}</span>
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                disabled={rows.length === 1}
                aria-label="Quitar producto"
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, newRow()])}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          <Plus size={16} /> Agregar producto
        </button>
      </div>

      {overLimit && customer && (
        <div role="alert" className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <p>
            {customer.creditLimit === 0 ? (
              <>Este cliente no tiene cupo de fiado asignado.</>
            ) : (
              <>
                Esta venta es de <strong>{formatCOP(total)}</strong> y {customer.name} solo tiene{" "}
                <strong>{formatCOP(customer.available)}</strong> disponible. Se pasa por{" "}
                <strong>{formatCOP(balance + total - customer.creditLimit)}</strong>.
              </>
            )}
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Total</span>
          <span className="text-3xl font-bold">{formatCOP(total)}</span>
        </div>

        <button
          disabled={Boolean(blockReason) || create.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {create.isPending && <Loader size={18} className="animate-spin" />}
          {create.isPending ? "Registrando…" : isCredit ? "Registrar fiado" : "Registrar venta"}
        </button>

        {blockReason && <p className="text-center text-xs text-slate-500">{blockReason}</p>}
      </div>
    </form>
  );
}