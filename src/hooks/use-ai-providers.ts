"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AiModelDTO {
  id: string;
  modelId: string;
  displayName: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface AiProviderDTO {
  id: string;
  name: string;
  displayName: string;
  baseUrl: string | null;
  isEnabled: boolean;
  sortOrder: number;
  apiKey: string | null;
  hasKey: boolean;
  needsKey: boolean;
  models: AiModelDTO[];
}

export function useAiProviders() {
  return useQuery<AiProviderDTO[]>({
    queryKey: ["ai-providers"],
    queryFn: async () => {
      const res = await fetch("/api/ai/providers");
      if (!res.ok) throw new Error("Failed to load AI providers");
      return res.json();
    },
    staleTime: 30000,
  });
}

export function useSaveAiProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; apiKey?: string; baseUrl?: string; isEnabled?: boolean; defaultModelId?: string }) => {
      const res = await fetch(`/api/ai/providers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
    },
  });
}

export function useResetAiProviders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/providers/reset", {
        method: "POST",
        headers: { },
      });
      if (!res.ok) throw new Error("Reset failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
    },
  });
}

export function useSetDefaultModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ modelId }: { modelId: string }) => {
      const res = await fetch("/api/ai/default-model", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to set default model" }));
        throw new Error(err.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
    },
  });
}

export function useTestAiConnection() {
  return useMutation({
    mutationFn: async ({ providerId, modelId }: { providerId: string; modelId: string }) => {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, modelId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Test failed" }));
        throw new Error(err.error);
      }
      return res.json() as Promise<{ success: boolean; response: string }>;
    },
  });
}
