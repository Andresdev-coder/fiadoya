import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { PaymentRow, SaleRow } from "./types";

export function useDayMovements(date: string) {
  return useQuery({
    queryKey: ["movements", date],
    queryFn: async () => {
      const qs = `from=${date}&to=${date}&limit=200`;
      const [sales, payments] = await Promise.all([
        api<SaleRow[]>(`/sales?${qs}`),
        api<PaymentRow[]>(`/payments?${qs}`),
      ]);
      return { sales, payments };
    },
  });
}

// Anular cambia saldos, reportes, cierres y la lista de movimientos.
function useRefreshAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ["customers", "reports", "movements", "closings"].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    );
}

type VoidInput = { id: string; reason: string };

export function useVoidSale() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, reason }: VoidInput) =>
      api<unknown>(`/sales/${id}/void`, { method: "POST", body: { reason } }),
    onSettled: refresh,
  });
}

export function useVoidPayment() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, reason }: VoidInput) =>
      api<unknown>(`/payments/${id}/void`, { method: "POST", body: { reason } }),
    onSettled: refresh,
  });
}