import { Loader } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/client";
import { Field } from "./Field";
import { Modal } from "./Modal";

type Props = {
  title: string;
  summary: string;
  hint: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
};

export function VoidDialog({ title, summary, hint, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length >= 3;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo anular");
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium">{summary}</p>
          <p className="mt-1 text-slate-600">{hint}</p>
          <p className="mt-1 text-slate-500">Esta acción no se puede deshacer.</p>
        </div>

        <Field
          label="Motivo de la anulación"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          autoFocus
        />

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          disabled={!valid || busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader size={18} className="animate-spin" />}
          Anular
        </button>
      </form>
    </Modal>
  );
}