import { Loader } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../api/client";
import { useUpdateCustomer } from "../api/customers";
import type { CustomerChanges } from "../api/customers";
import { Field } from "./Field";

type Props = {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    notes: string | null;
  };
  onDone: () => void;
};

export function CustomerEditForm({ customer, onDone }: Props) {
  const update = useUpdateCustomer(customer.id);
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone ?? "",
    notes: customer.notes ?? "",
  });
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: e.target.value });

  const name = form.name.trim();
  const phone = form.phone.replace(/[\s-]/g, "");
  const notes = form.notes.trim();

  // Solo se envía lo que cambió. Así nunca se manda el cupo, y un cajero puede editar sin recibir un 403.
  const changes: CustomerChanges = {};
  if (name !== customer.name) changes.name = name;
  if (phone !== (customer.phone ?? "")) changes.phone = phone || null;
  if (notes !== (customer.notes ?? "")) changes.notes = notes || null;

  const dirty = Object.keys(changes).length > 0;
  const valid = name.length >= 2;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dirty || !valid || update.isPending) return;
    setError("");
    setFields({});
    try {
      await update.mutateAsync(changes);
      toast.success("Datos del cliente actualizados");
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(
          Object.fromEntries(err.fields.map((f) => [f.field, f.message])),
        );
      } else setError("No se pudo guardar");
    }
  }

  const hint = (key: string) =>
    fields[key] && <p className="mt-1 text-xs text-red-600">{fields[key]}</p>;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <Field
          label="Nombre"
          value={form.name}
          onChange={set("name")}
          autoFocus
        />
        {hint("name")}
      </div>
      <div>
        <Field
          label="Teléfono"
          inputMode="tel"
          value={form.phone}
          onChange={set("phone")}
        />
        {hint("phone")}
        <p className="mt-1 text-xs text-slate-500">
          Déjalo vacío para quitarlo.
        </p>
      </div>
      <div>
        <Field
          label="Notas"
          value={form.notes}
          onChange={set("notes")}
          maxLength={300}
        />
        {hint("notes")}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <button
        disabled={!dirty || !valid || update.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {update.isPending && <Loader size={18} className="animate-spin" />}
        Guardar cambios
      </button>
    </form>
  );
}
