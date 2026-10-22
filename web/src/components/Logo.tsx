import { HandCoins } from "lucide-react";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`grid size-9 place-items-center rounded-xl text-white ${
          light ? "bg-white/20" : "bg-emerald-600"
        }`}
      >
        <HandCoins size={20} />
      </span>
      <span className={`text-xl font-bold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
        FiadoYa
      </span>
    </span>
  );
}