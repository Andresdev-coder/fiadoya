import { Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Customers from "./pages/Customers";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Soon from "./pages/Soon";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/clientes" replace />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/clientes/:id" element={<Soon title="Detalle del cliente" />} />
          <Route path="/ventas/nueva" element={<Soon title="Nueva venta" />} />
          <Route path="/reportes" element={<Soon title="Reportes" />} />
        </Route>
      </Route>
    </Routes>
  );
}