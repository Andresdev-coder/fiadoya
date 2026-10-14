import { Clock, Wallet } from "lucide-react";
import { useState } from "react";
import { CashTab } from "../components/reports/CashTab";
import { OverdueTab } from "../components/reports/OverdueTab";

const TABS = [
  { id: "overdue", label: "Morosos", icon: Clock },
  { id: "cash", label: "Caja", icon: Wallet },
] as const;

export default function Reports() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overdue");

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Reportes</h1>

      <div role="tablist" className="flex gap-1 border-b">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium ${
              tab === id
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "overdue" ? <OverdueTab /> : <CashTab />}
    </section>
  );
}
