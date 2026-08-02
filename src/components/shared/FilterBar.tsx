"use client";

import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Filter {
  id: string;
  label: string;
  value: string;
  onRemove: (id: string) => void;
}

interface FilterBarProps {
  filters: Filter[];
  onClearAll?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

export function FilterBar({
  filters,
  onClearAll,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-48 pl-8 pr-3 text-xs rounded-lg border bg-background placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}
      {filters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
        >
          {filter.label}: {filter.value}
          <button
            onClick={() => filter.onRemove(filter.id)}
            className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {filters.length > 0 && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors px-2 py-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
