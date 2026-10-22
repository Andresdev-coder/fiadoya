import { ClipboardList, LogOut, Menu, Moon, ShoppingCart, Sun, Users, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Logo } from "./Logo";

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  const items = [
    { to: "/clientes", label: "Clientes", icon: Users },
    { to: "/ventas/nueva", label: "Nueva venta", icon: ShoppingCart },
    ...(user?.role === "OWNER" ? [{ to: "/reportes", label: "Reportes", icon: ClipboardList }] : []),
  ];

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen">
      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="rounded-lg p-2 hover:bg-slate-100">
          <Menu size={20} />
        </button>
        <Logo />
      </header>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white p-4 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <Logo />
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={link} onClick={() => setOpen(false)}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t pt-4">
          <button
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Tema claro" : "Tema oscuro"}
          </button>

          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role === "OWNER" ? "Dueño" : "Cajero"}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Salir"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-5xl p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}