import { Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { OwnerRoute } from "./components/OwnerRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import CustomerDetail from "./pages/CustomerDetail";
import Customers from "./pages/Customers";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NewSale from "./pages/NewSale";
import Recover from "./pages/Recover";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";

function Home() {
  const { user } = useAuth();
  return (
    <Navigate to={user?.role === "OWNER" ? "/inicio" : "/clientes"} replace />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/recuperar" element={<Recover />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/clientes/:id" element={<CustomerDetail />} />
          <Route path="/ventas/nueva" element={<NewSale />} />
          <Route element={<OwnerRoute />}>
            <Route path="/inicio" element={<Dashboard />} />
            <Route path="/reportes" element={<Reports />} />
            <Route path="/configuracion" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
