"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AdminPage } from "@/types";

export function useAdminPages() {
  return useQuery<AdminPage[]>({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      const res = await fetch("/api/admin-pages");
      if (!res.ok) throw new Error("Failed to fetch admin pages");
      return res.json();
    },
  });
}

export function useAdminPage(id: string) {
  return useQuery<AdminPage>({
    queryKey: ["admin-pages", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin-pages/${id}`);
      if (!res.ok) throw new Error("Failed to fetch admin page");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateAdminPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      connectionId: string;
      config: { tables: { name: string; columns: string[] }[] };
    }) => {
      const res = await fetch("/api/admin-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create admin page");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    },
  });
}

export function useUpdateAdminPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string | null;
      config?: { tables: { name: string; columns: string[] }[] };
    }) => {
      const res = await fetch(`/api/admin-pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update admin page");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    },
  });
}

export function useDeleteAdminPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin-pages/${id}`, {
        method: "DELETE",
        headers: { },
      });
      if (!res.ok) throw new Error("Failed to delete admin page");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    },
  });
}
