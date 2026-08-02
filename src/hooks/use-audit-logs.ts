"use client";

import { useQuery } from "@tanstack/react-query";
import type { AuditLog } from "@/types";

export function useAuditLogs(connectionId?: string) {
  const params = connectionId ? `?connectionId=${connectionId}` : "";
  return useQuery<AuditLog[]>({
    queryKey: ["audit-logs", connectionId],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs${params}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });
}
