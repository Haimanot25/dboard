"use client";

import { cn } from "@/lib/utils";
import { Database, ChevronDown, Check, Circle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useConnections } from "@/hooks/use-connections";
import { getDriver } from "@/lib/db/drivers/registry";

interface ConnectionSelectorProps {
  value: string | null;
  onChange: (id: string) => void;
}

export function ConnectionSelector({ value, onChange }: ConnectionSelectorProps) {
  const { data: connections, isLoading } = useConnections();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = connections?.find((c) => c.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (isLoading) {
    return (
      <div className="h-10 rounded-xl border bg-card animate-pulse flex items-center px-3 gap-2">
        <Database className="h-4 w-4 text-muted-foreground/50" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <div className="h-10 rounded-xl border bg-card flex items-center px-3 gap-2 text-muted-foreground/50 text-sm">
        <Database className="h-4 w-4" />
        <span>No connections available</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "h-10 rounded-xl border bg-card flex items-center justify-between px-3 gap-2 w-full min-w-[240px] transition-all",
          "hover:border-primary/30 hover:bg-accent/30",
          open && "border-primary/30 ring-1 ring-primary/20"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Database className="h-4 w-4 text-primary shrink-0" />
          {selected ? (
            <div className="min-w-0 text-left">
              <span className="text-sm font-medium truncate block">{selected.name}</span>
              <span className="text-[10px] text-muted-foreground/60 truncate block">
                {selected.type} · {selected.host}:{selected.port}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground/60">Select connection...</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground/50 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border bg-card shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {connections.map((conn) => {
            const def = getDriver(conn.type);
            const isSelected = conn.id === value;
            return (
              <button
                key={conn.id}
                onClick={() => {
                  onChange(conn.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "bg-primary/5 text-foreground"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 border",
                  def?.color || "bg-muted"
                )}>
                  {def?.icon || conn.type.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conn.name}</p>
                  <p className="text-[10px] text-muted-foreground/60 truncate">
                    {conn.database} · {conn.host}:{conn.port}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
