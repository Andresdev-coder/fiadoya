import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Sale } from "./types";

export type NewSale = {
  type: "CASH" | "CREDIT";
  customerId?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
};

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewSale) => api<Sale>("/sales", { method: "POST", body: input }),
    // Incluso si falla (por ejemplo, por cupo), refrescamos los saldos.
    onSettled: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}