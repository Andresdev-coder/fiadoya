import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Customer, Statement } from "./types";

export function useCustomers(search: string, withDebt: boolean) {
  return useQuery({
    queryKey: ["customers", { search, withDebt }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (withDebt) params.set("withDebt", "true");
      const qs = params.toString();
      return api<Customer[]>(`/customers${qs ? `?${qs}` : ""}`);
    },
    placeholderData: keepPreviousData, // evita parpadeos mientras se busca
  });
}

export type NewCustomer = {
  name: string;
  phone?: string;
  creditLimit: number;
  notes?: string;
};

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCustomer) =>
      api<Customer>("/customers", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useStatement(id: string) {
  return useQuery({
    queryKey: ["customers", id, "statement"],
    queryFn: () => api<Statement>(`/customers/${id}/statement`),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { creditLimit: number }) =>
      api<Customer>(`/customers/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}