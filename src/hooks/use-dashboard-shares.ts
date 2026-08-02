"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DashboardShare {
  id: string;
  dashboardId: string;
  sharedWithId: string;
  sharedById: string;
  permission: string;
  createdAt: string;
  sharedWith: { id: string; email: string; name: string | null };
  sharedBy: { id: string; email: string; name: string | null };
}

export function useDashboardShares(dashboardId: string) {
  return useQuery<DashboardShare[]>({
    queryKey: ["dashboard-shares", dashboardId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboards/${dashboardId}/shares`);
      if (!res.ok) throw new Error("Failed to fetch shares");
      return res.json();
    },
    enabled: !!dashboardId,
  });
}

export function useCreateDashboardShare(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { sharedWithEmail: string; permission?: string }) => {
      const res = await fetch(`/api/dashboards/${dashboardId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": "same-origin" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to share dashboard");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-shares", dashboardId] }),
  });
}

export function useDeleteDashboardShare(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shareId: string) => {
      const res = await fetch(`/api/dashboards/${dashboardId}/shares?shareId=${shareId}`, {
        method: "DELETE",
        headers: { "x-csrf-token": "same-origin" },
      });
      if (!res.ok) throw new Error("Failed to remove share");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-shares", dashboardId] }),
  });
}
