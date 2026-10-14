import { Loader, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useOverdue } from "../../api/reports";
import { formatCOP, formatDay } from "../../lib/format";
import { whatsappUrl } from "../../lib/whatsapp";

const FILTERS = [
  { days: 0, label: "Todos" },
  { days: 15, label: "15+ días" },
  { days: 30, label: "30+ días" },
  { days: 60, label: "60+ días" },
];

function severity(days: number) {
  if (days >= 60) return "bg-red-100 text-red-700";
  if (days >= 30) return "bg-orange-100 text-orange-700";
  if (days >= 15) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export function OverdueTab() {
  const [minDays, setMinDays] = useState(0);
  const { data, isLoading, isError, error, isPlaceholderData } =
    useOverdue(minDays);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.days}
            onClick={() => setMinDays(f.days)}
            aria-pressed={minDays === f.days}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              minDays === f.days
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="flex items-center justify-center gap-2 py-8 text-slate-500">
          <Loader size={18} className="animate-spin" /> Cargando…
        </p>
      )}
      {isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : "No se pudo cargar el reporte"}
        </p>
      )}

      {data && (
        <div className={isPlaceholderData ? "opacity-60" : ""}>
          <div className="mb-3 rounded-xl border bg-white p-4">
            <p className="text-sm text-slate-500">
              {data.count} {data.count === 1 ? "cliente" : "clientes"} con deuda
            </p>
            <p className="text-3xl font-bold text-amber-700">
              {formatCOP(data.totalDebt)}
            </p>
          </div>

          {data.customers.length === 0 && (
            <p className="rounded-xl border bg-white py-8 text-center text-slate-500">
              {minDays === 0
                ? "Nadie te debe nada. ¡Todo al día!"
                : "Ningún cliente supera esos días de mora."}
            </p>
          )}

          <ul className="space-y-2">
            {data.customers.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/clientes/${c.id}`}
                    className="block truncate font-semibold hover:text-emerald-700 hover:underline"
                  >
                    {c.name}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {c.phone ?? "Sin teléfono"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Deuda más antigua:{" "}
                    {c.oldestDebtDate ? formatDay(c.oldestDebtDate) : "—"} ·
                    Último abono:{" "}
                    {c.lastPaymentAt ? formatDay(c.lastPaymentAt) : "nunca"}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severity(c.daysOverdue)}`}
                >
                  {c.daysOverdue === 0 ? "Reciente" : `${c.daysOverdue} días`}
                </span>

                <p className="w-28 text-right font-bold text-amber-700">
                  {formatCOP(c.balance)}
                </p>

                {c.phone && (
                  <a
                    href={whatsappUrl(c.phone, c.name, c.balance)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Cobrar a ${c.name} por WhatsApp`}
                    className="rounded-lg border p-2 text-emerald-700 hover:bg-emerald-50"
                  >
                    <MessageCircle size={18} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
