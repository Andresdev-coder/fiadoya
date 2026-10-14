import { ArrowLeft, HandCoins, Loader, Pencil, Phone, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client";
import { useStatement } from "../api/customers";
import { LimitForm } from "../components/LimitForm";
import { Modal } from "../components/Modal";
import { PaymentForm } from "../components/PaymentForm";
import { useAuth } from "../hooks/useAuth";
import { formatCOP, formatDateTime } from "../lib/format";

export default function CustomerDetail() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const { data, isLoading, isError, error } = useStatement(id);

  const [paying, setPaying] = useState(false);
  const [editingLimit, setEditingLimit] = useState(false);

  if (isLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-12 text-slate-500">
        <Loader size={18} className="animate-spin" /> Cargando…
      </p>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-slate-600">
          {error instanceof ApiError ? error.message : "No se pudo cargar el cliente"}
        </p>
        <Link to="/clientes" className="font-medium text-emerald-700 hover:underline">
          Volver a clientes
        </Link>
      </div>
    );
  }

  const { customer, balance } = data;
  const entries = [...data.entries].reverse(); // más recientes primero

  return (
    <section className="space-y-5">
      <Link to="/clientes" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Clientes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{customer.name}</h1>
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <Phone size={14} /> {customer.phone ?? "Sin teléfono"}
          </p>
          {customer.notes && <p className="mt-1 text-sm text-slate-500">{customer.notes}</p>}
        </div>

        <button
          onClick={() => setPaying(true)}
          disabled={balance <= 0}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <HandCoins size={18} /> Registrar abono
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Debe" value={formatCOP(balance)} tone={balance > 0 ? "warn" : "ok"} />
        <Stat
          label="Cupo"
          value={formatCOP(customer.creditLimit)}
          action={
            isOwner && (
              <button
                onClick={() => setEditingLimit(true)}
                aria-label="Editar cupo"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Pencil size={14} />
              </button>
            )
          }
        />
        <Stat label="Disponible" value={formatCOP(customer.available)} />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Estado de cuenta</h2>

        {entries.length === 0 && (
          <p className="rounded-xl border bg-white py-8 text-center text-slate-500">
            Este cliente aún no tiene movimientos.
          </p>
        )}

        <ul className="space-y-2">
          {entries.map((e) => {
            const isSale = e.kind === "SALE";
            const voided = e.status === "VOIDED";
            return (
              <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 rounded-xl border bg-white p-3">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${
                    voided
                      ? "bg-slate-100 text-slate-400"
                      : isSale
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isSale ? <ShoppingBag size={18} /> : <HandCoins size={18} />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${voided ? "text-slate-400 line-through" : ""}`}>
                    {isSale ? "Fiado" : "Abono"}
                    {voided && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 align-middle text-xs font-normal text-slate-500 no-underline">
                        Anulado
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-slate-500">{e.detail}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(e.date)}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`font-bold ${
                      voided ? "text-slate-400 line-through" : isSale ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {isSale ? "+" : "−"} {formatCOP(e.amount)}
                  </p>
                  {!voided && (
                    <p className="text-xs text-slate-500">Saldo {formatCOP(e.balanceAfter)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {paying && (
        <Modal title="Registrar abono" onClose={() => setPaying(false)}>
          <PaymentForm
            customer={{ id: customer.id, name: customer.name, balance }}
            onDone={() => setPaying(false)}
          />
        </Modal>
      )}

      {editingLimit && (
        <Modal title="Editar cupo" onClose={() => setEditingLimit(false)}>
          <LimitForm
            customer={{ id: customer.id, creditLimit: customer.creditLimit, balance }}
            onDone={() => setEditingLimit(false)}
          />
        </Modal>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  action,
}: {
  label: string;
  value: string;
  tone?: "warn" | "ok";
  action?: React.ReactNode;
}) {
  const color = tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-slate-900";
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{label}</p>
        {action}
      </div>
      <p className={`mt-1 text-lg font-bold sm:text-xl ${color}`}>{value}</p>
    </div>
  );
}