"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Favorite {
  id: string;
  kind: "dashboard" | "adminPage";
  targetId: string;
  createdAt: string;
}

export function useFavorites() {
  return useQuery<Favorite[]>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) throw new Error("Failed to fetch favorites");
      return res.json();
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { kind: "dashboard" | "adminPage"; targetId: string }) => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": "same-origin" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update favorite");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}