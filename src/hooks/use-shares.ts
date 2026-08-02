"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ConnectionShare } from "@/types";

export function useShares(connectionId?: string) {
  const params = connectionId ? `?connectionId=${connectionId}` : "";
  return useQuery<ConnectionShare[]>({
    queryKey: ["shares", connectionId],
    queryFn: async () => {
      const res = await fetch(`/api/shares${params}`);
      if (!res.ok) throw new Error("Failed to fetch shares");
      return res.json();
    },
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to share connection");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
  });
}

export function useDeleteShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shares?id=${id}`, {
        method: "DELETE",
        headers: { },
      });
      if (!res.ok) throw new Error("Failed to remove share");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
  });
}
