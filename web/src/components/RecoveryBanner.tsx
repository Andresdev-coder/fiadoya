import { ShieldAlert } from "lucide-react";
import { Link } from "react-router";

export function RecoveryBanner() {
  return (
    <Link
      to="/configuracion"
      className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 hover:opacity-90"
    >
      <ShieldAlert size={18} className="mt-0.5 shrink-0" />
      <span>
        <strong>Genera tu código de recuperación.</strong> Sin él, si olvidas tu
        contraseña no podrás volver a entrar. Toca aquí para crearlo.
      </span>
    </Link>
  );
}
