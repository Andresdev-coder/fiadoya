import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client";
import { useCreateCustomer } from "../api/customers";
import { useAuth } from "../hooks/useAuth";
import { Field } from "./Field";
import toast from "react-hot-toast";

export function CustomerForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const create = useCreateCustomer();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    creditLimit: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFields({});
    try {
      await create.mutateAsync({
        name: form.name,
        phone: form.phone.replace(/[\s-]/g, "") || undefined,
        creditLimit: isOwner ? Number(form.creditLimit || 0) : 0,
        notes: form.notes || undefined,
      });
      toast.success(`Cliente "${form.name}" creado`);
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(
          Object.fromEntries(err.fields.map((f) => [f.field, f.message])),
        );
      } else setError("Algo salió mal");
    }
  }

  const hint = (name: string) =>
    fields[name] && <p className="mt-1 text-xs text-red-600">{fields[name]}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Field
          label="Nombre"
          value={form.name}
          onChange={set("name")}
          required
          autoFocus
        />
        {hint("name")}
      </div>
      <div>
        <Field
          label="Teléfono (opcional)"
          inputMode="tel"
          value={form.phone}
          onChange={set("phone")}
        />
        {hint("phone")}
      </div>

      {isOwner ? (
        <div>
          <Field
            label="Cupo de fiado ($)"
            type="number"
            min={0}
            step={1000}
            value={form.creditLimit}
            onChange={set("creditLimit")}
          />
          {hint("creditLimit")}
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          El cupo lo define el dueño. El cliente se crea con cupo $0.
        </p>
      )}

      <div>
        <Field
          label="Notas (opcional)"
          value={form.notes}
          onChange={set("notes")}
        />
        {hint("notes")}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <button
        disabled={create.isPending}
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {create.isPending ? "Guardando…" : "Guardar cliente"}
      </button>
    </form>
  );
}
