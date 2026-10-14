import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export type NewPayment = {
  customerId: string;
  amount: number;
  method: "CASH" | "TRANSFER" | "OTHER";
  note?: string;
};

type PaymentResult = { id: string; amount: number; balanceAfter: number };

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewPayment) =>
      api<PaymentResult>("/payments", { method: "POST", body: input }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}