import { ClipboardList, LogOut, ShoppingCart, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
    isActive ? "bg-emerald-100 text-emerald-800" : "text-slate-600 hover:bg-slate-100"
  }`;

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="text-lg font-bold text-emerald-700">FiadoYa</span>

          <nav className="flex flex-1 flex-wrap gap-1">
            <NavLink to="/clientes" className={link}>
              <Users size={16} /> Clientes
            </NavLink>
            <NavLink to="/ventas/nueva" className={link}>
              <ShoppingCart size={16} /> Nueva venta
            </NavLink>
            {user?.role === "OWNER" && (
              <NavLink to="/reportes" className={link}>
                <ClipboardList size={16} /> Reportes
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user?.name}</span>
            <button
              onClick={logout}
              aria-label="Salir"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 hover:bg-slate-100"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4">
        <Outlet />
      </main>
    </div>
  );
}