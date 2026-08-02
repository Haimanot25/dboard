"use client";

import { useMutation } from "@tanstack/react-query";

export function useAiQuery(connectionId: string) {
  return useMutation({
    mutationFn: async (params: { prompt: string; modelId?: string }) => {
      const res = await fetch(`/api/query/${connectionId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI query failed");
      }
      return res.json() as Promise<{ sql: string }>;
    },
  });
}
