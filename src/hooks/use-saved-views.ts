"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SavedView {
  id: string;
  name: string;
  connectionId: string;
  tableName: string;
  config: string;
  createdAt: string;
}

export function useSavedViews(connectionId: string, tableName?: string) {
  return useQuery<SavedView[]>({
    queryKey: ["saved-views", connectionId, tableName],
    queryFn: async () => {
      const params = tableName ? `?table=${encodeURIComponent(tableName)}` : "";
      const res = await fetch(`/api/views/${connectionId}${params}`);
      if (!res.ok) throw new Error("Failed to fetch views");
      return res.json();
    },
    enabled: !!connectionId,
  });
}

export function useSaveView(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; tableName: string; config: unknown }) => {
      const res = await fetch(`/api/views/${connectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save view");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["saved-views", connectionId, vars.tableName] });
    },
  });
}

export function useDeleteView(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (viewId: string) => {
      const res = await fetch(`/api/views/${connectionId}?viewId=${viewId}`, {
        method: "DELETE",
        headers: { },
      });
      if (!res.ok) throw new Error("Failed to delete view");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-views", connectionId] });
    },
  });
}
