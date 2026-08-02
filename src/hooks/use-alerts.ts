"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Alert {
  id: string;
  name: string;
  connectionId: string;
  tableName: string;
  condition: string;
  enabled: boolean;
  webhookUrl: string | null;
  email: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export function useAlerts(connectionId: string) {
  return useQuery<Alert[]>({
    queryKey: ["alerts", connectionId],
    queryFn: async () => {
      const res = await fetch(`/api/alerts/${connectionId}`);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
    enabled: !!connectionId,
  });
}

export function useCreateAlert(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      tableName: string;
      condition: string;
      webhookUrl?: string;
      email?: string;
    }) => {
      const res = await fetch(`/api/alerts/${connectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create alert");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", connectionId] }),
  });
}

export function useDeleteAlert(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const res = await fetch(`/api/alerts/${connectionId}?alertId=${alertId}`, {
        method: "DELETE",
        headers: { },
      });
      if (!res.ok) throw new Error("Failed to delete alert");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", connectionId] }),
  });
}

export function useToggleAlert(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ alertId, enabled }: { alertId: string; enabled: boolean }) => {
      const res = await fetch(`/api/alerts/${connectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, enabled }),
      });
      if (!res.ok) throw new Error("Failed to update alert");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", connectionId] }),
  });
}
