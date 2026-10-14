import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-center text-slate-500">Cargando…</p>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}