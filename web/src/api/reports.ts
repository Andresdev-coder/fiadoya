import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { CashClosing, DailySummary, Overdue } from "./types";

export function useOverdue(minDays: number) {
  return useQuery({
    queryKey: ["reports", "overdue", minDays],
    queryFn: () => api<Overdue>(`/reports/overdue?minDays=${minDays}`),
    placeholderData: keepPreviousData,
  });
}

export function useDailySummary(date: string) {
  return useQuery({
    queryKey: ["reports", "daily", date],
    queryFn: () => api<DailySummary>(`/reports/daily-summary?date=${date}`),
    placeholderData: keepPreviousData,
  });
}

export function useClosings() {
  return useQuery({
    queryKey: ["closings"],
    queryFn: () => api<CashClosing[]>("/cash-closings"),
  });
}

export function useCreateClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { date: string; countedAmount: number }) =>
      api<CashClosing>("/cash-closings", { method: "POST", body: input }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["closings"] }),
  });
}