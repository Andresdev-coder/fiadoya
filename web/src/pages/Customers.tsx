import {
  ChevronRight,
  Loader,
  Phone,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useCustomers } from "../api/customers";
import type { CustomerStatus } from "../api/customers";
import { CustomerForm } from "../components/CustomerForm";
import { Modal } from "../components/Modal";
import { useDebounce } from "../hooks/useDebounce";
import { formatCOP } from "../lib/format";

const TABS: { id: CustomerStatus; label: string }[] = [
  { id: "active", label: "Activos" },
  { id: "inactive", label: "Inactivos" },
];

export default function Customers() {
  const [search, setSearch] = useState("");
  const [withDebt, setWithDebt] = useState(false);
  const [status, setStatus] = useState<CustomerStatus>("active");
  const [creating, setCreating] = useState(false);

  const debounced = useDebounce(search.trim());
  const isActive = status === "active";
  const { data, isLoading, isError, error } = useCustomers(
    debounced,
    isActive && withDebt,
    status,
  );

  const totalDebt = data?.reduce((sum, c) => sum + c.balance, 0) ?? 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
        >
          <UserPlus size={18} /> Nuevo cliente
        </button>
      </div>

      <div role="tablist" className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={status === t.id}
            onClick={() => setStatus(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              status === t.id
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
        {isActive && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={withDebt}
              onChange={(e) => setWithDebt(e.target.checked)}
            />
            Solo con deuda
          </label>
        )}
      </div>

      {data && (
        <p className="text-sm text-slate-500">
          {data.length} {data.length === 1 ? "cliente" : "clientes"}
          {isActive && (
            <>
              {" "}
              · Deuda en esta lista:{" "}
              <strong className="text-slate-800">{formatCOP(totalDebt)}</strong>
            </>
          )}
        </p>
      )}

      {isLoading && (
        <p className="flex items-center justify-center gap-2 py-8 text-slate-500">
          <Loader size={18} className="animate-spin" /> Cargando clientes…
        </p>
      )}
      {isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : "No se pudo cargar la lista"}
        </p>
      )}

      {data && data.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          <Users size={40} className="mx-auto mb-2 text-slate-300" />
          {debounced || (isActive && withDebt)
            ? "Ningún cliente coincide con el filtro."
            : isActive
              ? "Aún no tienes clientes. ¡Crea el primero!"
              : "No tienes clientes inactivos."}
        </div>
      )}

      <ul className="space-y-2">
        {data?.map((c) => {
          const exhausted = c.creditLimit > 0 && c.available === 0;
          return (
            <li key={c.id}>
              <Link
                to={`/clientes/${c.id}`}
                className={`flex items-center justify-between gap-4 rounded-xl border bg-white p-4 hover:border-emerald-600 ${
                  c.active ? "" : "opacity-75"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="flex items-center gap-1 text-sm text-slate-500">
                    <Phone size={14} /> {c.phone ?? "Sin teléfono"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {c.active ? (
                    <div className="text-right">
                      <p
                        className={`font-bold ${c.balance > 0 ? "text-amber-700" : "text-emerald-700"}`}
                      >
                        {c.balance > 0 ? formatCOP(c.balance) : "Al día"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {exhausted ? (
                          <span className="font-medium text-red-600">
                            Cupo agotado
                          </span>
                        ) : (
                          <>Disponible {formatCOP(c.available)}</>
                        )}
                      </p>
                    </div>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      Inactivo
                    </span>
                  )}
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {creating && (
        <Modal title="Nuevo cliente" onClose={() => setCreating(false)}>
          <CustomerForm onDone={() => setCreating(false)} />
        </Modal>
      )}
    </section>
  );
}
