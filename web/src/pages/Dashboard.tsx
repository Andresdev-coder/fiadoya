import { useAuth } from "../hooks/useAuth";

export default function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Hola, {user?.name}</h1>
      <p className="text-slate-500">Rol: {user?.role}</p>
      <button onClick={logout} className="mt-4 rounded-lg border px-4 py-2 hover:bg-slate-100">
        Salir
      </button>
    </main>
  );
}