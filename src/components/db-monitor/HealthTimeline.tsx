"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock, Wifi, Trash2 } from "lucide-react";

interface Measurement {
  timestamp: number;
  latencyMs: number;
  status: "online" | "offline";
}

interface HealthTimelineProps {
  connectionId: string | null;
  latencyMs: number | null;
  status: string | undefined;
}

export function HealthTimeline({ connectionId, latencyMs, status }: HealthTimelineProps) {
  const [history, setHistory] = useState<Measurement[]>([]);

  useEffect(() => {
    if (!connectionId) return;
    if (latencyMs != null && status) {
      setHistory((prev) => {
        const next = [
          ...prev,
          { timestamp: Date.now(), latencyMs, status: status as "online" | "offline" },
        ];
        return next.slice(-30);
      });
    }
  }, [connectionId, latencyMs, status]);

  if (!connectionId) return null;

  const maxLatency = Math.max(...history.map((m) => m.latencyMs), 1);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Latency Timeline</h3>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setHistory([])}
            className="text-[10px] text-muted-foreground/50 hover:text-destructive flex items-center gap-1 transition-colors"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
          <Wifi className="h-6 w-6 mb-2" />
          <p className="text-xs">Waiting for health checks...</p>
        </div>
      ) : (
        <div className="flex items-end gap-1 h-24">
          {history.map((m, i) => {
            const height = Math.max((m.latencyMs / maxLatency) * 100, 4);
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 group relative"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-popover border rounded-lg px-2 py-1 text-[10px] shadow-lg whitespace-nowrap">
                    {m.latencyMs}ms · {m.status}
                  </div>
                </div>
                <div
                  className={cn(
                    "w-full rounded-t transition-all min-h-[2px]",
                    m.status === "online" ? "bg-emerald-500/70 hover:bg-emerald-500" : "bg-red-500/70 hover:bg-red-500"
                  )}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground/50">
          <span>{history.length} samples</span>
          <span>
            Avg: {Math.round(history.reduce((s, m) => s + m.latencyMs, 0) / history.length)}ms
          </span>
        </div>
      )}
    </div>
  );
}
