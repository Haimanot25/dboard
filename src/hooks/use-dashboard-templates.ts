"use client";

import { useQuery } from "@tanstack/react-query";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  charts: { title: string; type: string; query: string }[];
}

export function useDashboardTemplates() {
  return useQuery<DashboardTemplate[]>({
    queryKey: ["dashboard-templates"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });
}
