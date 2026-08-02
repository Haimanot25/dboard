"use client";

import { useMutation } from "@tanstack/react-query";
import type { GenerationType, GenerationResult } from "@/lib/ai/generate";

interface GenerateParams {
  prompt: string;
  connectionId: string;
  type: GenerationType;
  modelId: string;
}

export function useAiGenerator() {
  return useMutation<GenerationResult, Error, GenerateParams>({
    mutationFn: async (params) => {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Generation failed");
      }
      return res.json();
    },
  });
}
