"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Webhook } from "@/types";

export function useWebhooks(connectionId?: string) {
  const params = connectionId ? `?connectionId=${connectionId}` : "";
  return useQuery<Webhook[]>({
    queryKey: ["webhooks", connectionId],
    queryFn: async () => {
      const res = await fetch(`/api/webhooks${params}`);
      if (!res.ok) throw new Error("Failed to fetch webhooks");
      return res.json();
    },
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create webhook");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks?id=${id}`, {
        method: "DELETE",
        headers: { },
      });
      if (!res.ok) throw new Error("Failed to delete webhook");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}
