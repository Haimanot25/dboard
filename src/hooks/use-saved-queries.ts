"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  connectionId: string;
  createdAt: string;
}

export function useSavedQueries(connectionId: string) {
  return useQuery<SavedQuery[]>({
    queryKey: ["saved-queries", connectionId],
    queryFn: async () => {
      const res = await fetch(`/api/query/${connectionId}/saved`);
      if (!res.ok) throw new Error("Failed to fetch saved queries");
      return res.json();
    },
    enabled: !!connectionId,
  });
}

export function useSaveQuery(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; sql: string }) => {
      const res = await fetch(`/api/query/${connectionId}/saved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save query");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-queries", connectionId] }),
  });
}

export function useDeleteSavedQuery(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/query/${connectionId}/saved?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete query");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-queries", connectionId] }),
  });
}
