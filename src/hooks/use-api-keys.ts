"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiKey } from "@/types";

export function useApiKeys(connectionId?: string) {
  const params = connectionId ? `?connectionId=${connectionId}` : "";
  return useQuery<ApiKey[]>({
    queryKey: ["api-keys", connectionId],
    queryFn: async () => {
      const res = await fetch(`/api/api-keys${params}`);
      if (!res.ok) throw new Error("Failed to fetch API keys");
      return res.json();
    },
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create API key");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/api-keys?id=${id}`, {
        method: "DELETE",
        headers: { },
      });
      if (!res.ok) throw new Error("Failed to delete API key");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}
