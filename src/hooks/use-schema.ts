"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SchemaInfo, SchemaConfig } from "@/types";

export function useIntrospectSchema(connectionId: string) {
  return useQuery<SchemaInfo>({
    queryKey: ["schema-introspect", connectionId],
    queryFn: async () => {
      const res = await fetch("/api/schema/introspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to introspect schema");
      }
      return res.json();
    },
    enabled: !!connectionId,
  });
}

export function useSaveSchemaConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { connectionId: string; config: SchemaConfig }) => {
      const res = await fetch("/api/schema/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save config");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["schema-config", variables.connectionId],
      });
    },
  });
}

export function useSchemaConfig(connectionId: string) {
  return useQuery<SchemaConfig>({
    queryKey: ["schema-config", connectionId],
    queryFn: async () => {
      const res = await fetch(`/api/schema/config/${connectionId}`);
      if (!res.ok) throw new Error("Failed to load config");
      return res.json();
    },
    enabled: !!connectionId,
  });
}