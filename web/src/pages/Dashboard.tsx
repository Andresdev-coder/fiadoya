import { Clock, HandCoins, Loader, TrendingUp, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "../api/reports";
import type { AgingBucket, DashboardData } from "../api/types";
import { useAuth } from "../hooks/useAuth";
import {
  formatCOP,
  formatCompact,
  formatMonth,
  formatShortDate,
} from "../lib/format";
import { RecoveryBanner } from "../components/RecoveryBanner";

const AGING_STYLE: Record<AgingBucket["key"], { color: string; dot: string }> =
  {
    "0-15": { color: "#10b981", dot: "bg-emerald-500" },
    "16-30": { color: "#fbbf24", dot: "bg-amber-400" },
    "31-60": { color: "#f97316", dot: "bg-orange-500" },
    "60+": { color: "#ef4444", dot: "bg-red-500" },
  };

function severity(days: number) {
  if (days >= 60) return "bg-red-100 text-red-700";
  if (days >= 30) return "bg-orange-100 text-orange-700";
  if (days >= 15) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

type TipItem = {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: { color?: string };
};
type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: TipItem[];
};

/** Tooltip propio: usa las clases de la app, así respeta el tema claro y oscuro. */
function ChartTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-white px-3 py-2 text-sm shadow-lg">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p) => (
        <p
          key={String(p.name)}
          className="flex items-center gap-2 text-slate-600"
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: p.color ?? p.payload?.color }}
          />
          {p.name}:{" "}
          <strong className="text-slate-900">
            {formatCOP(Number(p.value))}
          </strong>
        </p>
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "text-slate-900",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="flex items-center gap-1.5 text-sm text-slate-500">
        {icon} {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Donut({ buckets, total }: { buckets: AgingBucket[]; total: number }) {
  const hasDebt = buckets.some((b) => b.amount > 0);
  const data = hasDebt
    ? buckets
        .filter((b) => b.amount > 0)
        .map((b) => ({
          name: b.label,
          amount: b.amount,
          color: AGING_STYLE[b.key].color,
        }))
    : [{ name: "Sin deuda", amount: 1, color: "#cbd5e1" }];

  return (
    <div className="relative size-44 shrink-0 text-slate-500">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          {hasDebt && <Tooltip content={<ChartTooltip />} />}
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xs">Por cobrar</p>
          <p className="text-base font-bold text-slate-900">
            {formatCOP(total)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DailyBars({ daily }: { daily: DashboardData["daily"] }) {
  const data = daily.map((d) => ({ ...d, label: formatShortDate(d.date) }));
  const tick = { fill: "currentColor", fontSize: 12 };

  return (
    <div className="h-64 w-full text-slate-500">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          barGap={1}
        >
          <CartesianGrid
            vertical={false}
            stroke="currentColor"
            strokeOpacity={0.2}
          />
          <XAxis
            dataKey="label"
            tick={tick}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={tick}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) => formatCompact(Number(v))}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "currentColor", fillOpacity: 0.08 }}
          />
          <Bar
            dataKey="credit"
            name="Fiado"
            fill="#fbbf24"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="payments"
            name="Abonos"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useDashboard();

  if (isLoading) {
    return (
      <p className="flex items-center justify-center gap-2 py-12 text-slate-500">
        <Loader size={18} className="animate-spin" /> Cargando…
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {error instanceof Error
          ? error.message
          : "No se pudo cargar el resumen"}
      </p>
    );
  }

  const { receivable, month, daily, topDebtors } = data;
  const late = receivable.aging.filter(
    (b) => b.key === "31-60" || b.key === "60+",
  );
  const lateAmount = late.reduce((s, b) => s + b.amount, 0);
  const lateCustomers = late.reduce((s, b) => s + b.customers, 0);
  const hasActivity = daily.some((d) => d.credit > 0 || d.payments > 0);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Hola, {user?.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">
          {formatMonth(month.from).charAt(0).toUpperCase() +
            formatMonth(month.from).slice(1)}
        </p>
      </div>
      {user && !user.hasRecoveryCode && !user.isDemo && <RecoveryBanner />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Wallet size={16} />}
          label="Por cobrar"
          value={formatCOP(receivable.total)}
          hint={`${receivable.customers} ${receivable.customers === 1 ? "cliente" : "clientes"} con deuda`}
          tone="text-amber-700"
        />
        <StatCard
          icon={<HandCoins size={16} />}
          label="Fiado del mes"
          value={formatCOP(month.credit)}
          hint="Ventas a crédito este mes"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Cobrado del mes"
          value={formatCOP(month.collected)}
          hint="Abonos recibidos este mes"
          tone="text-emerald-700"
        />
        <StatCard
          icon={<Clock size={16} />}
          label="En mora (+30 días)"
          value={formatCOP(lateAmount)}
          hint={`${lateCustomers} ${lateCustomers === 1 ? "cliente" : "clientes"}`}
          tone={lateAmount > 0 ? "text-red-600" : "text-emerald-700"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="min-w-0 rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Cartera por antigüedad</h2>
          <p className="mb-4 text-xs text-slate-500">
            Cada cliente se ubica según su deuda más antigua.
          </p>

          <div className="flex flex-wrap items-center gap-6">
            <Donut buckets={receivable.aging} total={receivable.total} />
            <ul className="min-w-0 flex-1 space-y-2 text-sm">
              {receivable.aging.map((b) => (
                <li key={b.key} className="flex items-center gap-2">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${AGING_STYLE[b.key].dot}`}
                  />
                  <span className="flex-1 text-slate-600">{b.label}</span>
                  <span className="font-semibold">{formatCOP(b.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Fiados y abonos</h2>
              <p className="text-xs text-slate-500">Últimos 30 días</p>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-400" /> Fiado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500" /> Abonos
              </span>
            </div>
          </div>

          {hasActivity ? (
            <DailyBars daily={daily} />
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">
              Aún no hay movimientos en los últimos 30 días.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Mayores deudores</h2>
          <Link
            to="/reportes"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            Ver morosos
          </Link>
        </div>

        {topDebtors.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nadie te debe nada. ¡Todo al día!
          </p>
        ) : (
          <ul className="divide-y">
            {topDebtors.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/clientes/${d.id}`}
                  className="flex items-center gap-3 py-3 hover:opacity-80"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {d.name}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severity(d.daysOverdue)}`}
                  >
                    {d.daysOverdue === 0 ? "Reciente" : `${d.daysOverdue} días`}
                  </span>
                  <span className="w-28 text-right font-bold text-amber-700">
                    {formatCOP(d.balance)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
