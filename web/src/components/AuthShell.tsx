import { Loader, Moon, ShieldCheck, Sun, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "../hooks/useTheme";
import { Logo } from "./Logo";

const POINTS = [
  { icon: Users, text: "Sabe quién te debe y cuánto, sin cuadernos" },
  { icon: ShieldCheck, text: "Cupos por cliente que el sistema siempre respeta" },
  { icon: Wallet, text: "Un cierre de caja que cuadra al final del día" },
];

export function SlowHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="status" className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      <Loader size={16} className="mt-0.5 shrink-0 animate-spin" />
      Despertando el servidor… la primera conexión puede tardar hasta un minuto.
    </p>
  );
}

type Props = { title: string; subtitle: string; children: ReactNode };

export function AuthShell({ title, subtitle, children }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Celular: cabecera con la marca */}
      <div className="bg-linear-to-br from-emerald-600 to-teal-800 px-6 pb-14 pt-8 lg:hidden">
        <Logo light />
      </div>

      {/* Escritorio: panel de marca */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-emerald-600 via-emerald-700 to-teal-900 p-12 pr-24 text-white lg:flex">
        <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 size-96 rounded-full bg-white/5" />

        <div className="relative">
          <Logo light />
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-tight">Tus fiados, bajo control.</h2>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-emerald-50">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15">
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-emerald-100/80">Hecho para tiendas de barrio.</p>
      </aside>

      {/* Formulario */}
      <main className="relative z-10 -mt-8 flex flex-1 flex-col rounded-t-[2rem] bg-white lg:mt-0 lg:-ml-12 lg:rounded-none lg:rounded-l-[3rem]">
        <button
          onClick={toggle}
          aria-label="Cambiar tema"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}