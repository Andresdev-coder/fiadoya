import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

export function OwnerRoute() {
  const { user } = useAuth();
  return user?.role === "OWNER" ? <Outlet /> : <Navigate to="/clientes" replace />;
}