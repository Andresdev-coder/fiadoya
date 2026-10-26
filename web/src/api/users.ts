import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { StaffUser } from "./types";

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => api<StaffUser[]>("/users") });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      api<StaffUser>("/users", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export type UserChanges = { name?: string; password?: string; active?: boolean };

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserChanges) => api<StaffUser>(`/users/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}