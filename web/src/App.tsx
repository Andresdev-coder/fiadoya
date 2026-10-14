import { Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Customers from "./pages/Customers";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NewSale from "./pages/NewSale";
import CustomerDetail from "./pages/CustomerDetail";
import { OwnerRoute } from "./components/OwnerRoute";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/clientes" replace />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/clientes/:id" element={<CustomerDetail />} />
          <Route path="/ventas/nueva" element={<NewSale />} />
          <Route element={<OwnerRoute />}>
            <Route path="/reportes" element={<Reports />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
