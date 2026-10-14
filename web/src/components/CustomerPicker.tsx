import { Search } from "lucide-react";
import { useState } from "react";
import { useCustomers } from "../api/customers";
import type { Customer } from "../api/types";
import { useDebounce } from "../hooks/useDebounce";
import { formatCOP } from "../lib/format";

type Props = { value: Customer | null; onChange: (c: Customer | null) => void };

export function CustomerPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim());
  const { data } = useCustomers(debounced, false);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-600 bg-emerald-50 p-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{value.name}</p>
          <p className="text-xs text-slate-600">
            Debe {formatCOP(value.balance)} · Cupo {formatCOP(value.creditLimit)} · Disponible{" "}
            <strong>{formatCOP(value.available)}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          Cambiar
        </button>
      </div>
    );
  }

  const results = data?.slice(0, 6) ?? [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nombre o teléfono"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
      </div>

      <ul className="divide-y rounded-xl border bg-white">
        {results.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onChange(c)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50"
            >
              <span className="truncate font-medium">{c.name}</span>
              <span className="shrink-0 text-xs text-slate-500">Disponible {formatCOP(c.available)}</span>
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="p-3 text-sm text-slate-500">Ningún cliente coincide.</li>
        )}
      </ul>
    </div>
  );
}