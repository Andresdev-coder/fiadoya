import { Copy } from "lucide-react";
import toast from "react-hot-toast";

export function CredentialsCard({ email, password }: { email: string; password: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(`Correo: ${email}\nContraseña: ${password}`);
      toast.success("Datos copiados");
    } catch {
      toast.error("No se pudo copiar. Selecciónalos a mano.");
    }
  }

  return (
    <div className="space-y-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 p-4 text-sm">
      <p>
        <span className="text-slate-500">Correo:</span> <strong className="break-all">{email}</strong>
      </p>
      <p>
        <span className="text-slate-500">Contraseña:</span> <strong className="font-mono">{password}</strong>
      </p>
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
      >
        <Copy size={14} /> Copiar datos
      </button>
    </div>
  );
}