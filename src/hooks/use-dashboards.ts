"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Chart {
  id: string;
  dashboardId: string;
  title: string;
  type: string;
  connectionId: string;
  query: string;
  config: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export function useDashboards() {
  return useQuery<Dashboard[]>({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const res = await fetch("/api/dashboards");
      if (!res.ok) throw new Error("Failed to fetch dashboards");
      return res.json();
    },
  });
}

export function useDashboard(id: string) {
  return useQuery<Dashboard & { charts: Chart[] }>({
    queryKey: ["dashboard", id],
    queryFn: async () => {
      const res = await fetch(`/api/dashboards/${id}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": "same-origin" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create dashboard");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards"] }),
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboards/${id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": "same-origin" },
      });
      if (!res.ok) throw new Error("Failed to delete dashboard");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards"] }),
  });
}

export function useDuplicateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboards/${id}/duplicate`, {
        method: "POST",
        headers: { "x-csrf-token": "same-origin" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to duplicate dashboard");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboards"] }),
  });
}

export function useCreateChart(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      type: string;
      connectionId: string;
      query: string;
    }) => {
      const res = await fetch(`/api/dashboards/${dashboardId}/charts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": "same-origin" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create chart");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard", dashboardId] }),
  });
}

export function useDeleteChart(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chartId: string) => {
      const res = await fetch(`/api/dashboards/${dashboardId}/charts?chartId=${chartId}`, {
        method: "DELETE",
        headers: { "x-csrf-token": "same-origin" },
      });
      if (!res.ok) throw new Error("Failed to delete chart");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard", dashboardId] }),
  });
}

export function useUpdateChart(dashboardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      chartId: string;
      title: string;
      type: string;
      connectionId: string;
      query: string;
    }) => {
      const res = await fetch(
        `/api/dashboards/${dashboardId}/charts?chartId=${data.chartId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": "same-origin" },
          body: JSON.stringify({
            title: data.title,
            type: data.type,
            connectionId: data.connectionId,
            query: data.query,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update chart");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard", dashboardId] }),
  });
}
