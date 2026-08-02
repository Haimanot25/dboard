"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";

interface FavoriteButtonProps {
  kind: "dashboard" | "adminPage";
  targetId: string;
  className?: string;
}

export function FavoriteButton({ kind, targetId, className }: FavoriteButtonProps) {
  const { data: favorites } = useFavorites();
  const toggleMutation = useToggleFavorite();

  const isFavorited = useMemo(
    () => (favorites ?? []).some((f) => f.kind === kind && f.targetId === targetId),
    [favorites, kind, targetId]
  );

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMutation.mutate({ kind, targetId });
      }}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "flex items-center justify-center h-8 w-8 rounded-lg transition-colors",
        isFavorited
          ? "text-amber-500 hover:bg-amber-500/10"
          : "text-muted-foreground/40 hover:text-amber-500 hover:bg-accent",
        className
      )}
    >
      <Star
        className={cn("h-4 w-4 transition-transform", isFavorited && "fill-amber-500 scale-110")}
      />
    </button>
  );
}