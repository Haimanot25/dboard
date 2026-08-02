"use client";

import { useQuery } from "@tanstack/react-query";

export interface ConnectionInfo {
  connectionId: string;
  connectionName: string;
  connectionType: string;
  host: string;
  port: number;
  database: string;
  status: "online" | "offline";
  latencyMs: number;
  version: string;
  databaseSize: string;
  tableCount: number;
  totalRecords: number;
  activeConnections: number;
  connectionStates: Record<string, number>;
  cacheHitRatio: number | null;
  uptime: string | null;
  tables: {
    name: string;
    type: "table" | "view";
    rowCount: number;
    totalSize: string;
    indexCount: number;
    deadTuples?: number;
    totalInserts?: number;
    totalUpdates?: number;
    totalDeletes?: number;
  }[];
  storageInfo?: {
    dataSize: string;
    storageSize: string;
    indexes: number;
    indexSize: string;
  };
  error?: string;
}

export function useConnectionInfo(connectionId: string | null, options?: { refetchInterval?: number }) {
  return useQuery<ConnectionInfo>({
    queryKey: ["connection-info", connectionId],
    queryFn: async () => {
      const res = await fetch(`/api/connections/${connectionId}/info`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to fetch connection info");
      }
      return res.json();
    },
    enabled: !!connectionId,
    refetchInterval: options?.refetchInterval ?? 30_000,
    retry: 1,
    staleTime: 15_000,
  });
}
