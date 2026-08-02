"use client";

import { cn } from "@/lib/utils";
import {
  Activity, Table, Hash, HardDrive,
  Shield, Wifi, WifiOff,
} from "lucide-react";
import type { ConnectionInfo } from "@/hooks/use-connection-info";

interface MetricCardsProps {
  data: ConnectionInfo | undefined;
  isLoading: boolean;
}

function MetricSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-7 w-7 bg-muted rounded-lg" />
      </div>
      <div className="h-7 w-20 bg-muted rounded mb-1" />
      <div className="h-3 w-24 bg-muted rounded" />
    </div>
  );
}

export function MetricCards({ data, isLoading }: MetricCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const isOnline = data.status === "online";

  const metrics = [
    {
      title: "Status",
      value: isOnline ? "Online" : "Offline",
      description: `${data.latencyMs}ms latency`,
      icon: isOnline
        ? <Wifi className="h-4 w-4" />
        : <WifiOff className="h-4 w-4" />,
      color: isOnline
        ? "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        : "from-red-500/15 to-red-500/5 border-red-500/20 text-red-600 dark:text-red-400",
    },
    {
      title: "Version",
      value: data.version?.split(" ").slice(0, 2).join(" ") || "N/A",
      description: data.connectionType.toUpperCase(),
      icon: <Shield className="h-4 w-4" />,
      color: "from-blue-500/15 to-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400",
    },
    {
      title: "DB Size",
      value: data.databaseSize || "N/A",
      description: data.storageInfo
        ? `${data.storageInfo.dataSize} data`
        : "Total size",
      icon: <HardDrive className="h-4 w-4" />,
      color: "from-violet-500/15 to-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400",
    },
    {
      title: "Tables",
      value: data.tableCount,
      description: `${data.totalRecords.toLocaleString()} total rows`,
      icon: <Table className="h-4 w-4" />,
      color: "from-amber-500/15 to-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400",
    },
    {
      title: "Records",
      value: data.totalRecords.toLocaleString(),
      description: `Across ${data.tableCount} tables`,
      icon: <Hash className="h-4 w-4" />,
      color: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    },
    {
      title: "Connections",
      value: data.activeConnections,
      description: data.uptime ? `Up ${data.uptime}` : "Active sessions",
      icon: <Activity className="h-4 w-4" />,
      color: "from-rose-500/15 to-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map((m) => (
        <div
          key={m.title}
          className={cn(
            "relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-all",
            m.color
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {m.title}
            </p>
            <div className="rounded-lg bg-background/50 p-1.5">
              {m.icon}
            </div>
          </div>
          <p className="text-xl font-bold tracking-tight tabular-nums">{m.value}</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{m.description}</p>
        </div>
      ))}
    </div>
  );
}

export function SecondaryMetrics({ data }: { data: ConnectionInfo | undefined }) {
  if (!data) return null;

  const items = [
    {
      label: "Cache Hit Ratio",
      value: data.cacheHitRatio != null ? `${data.cacheHitRatio}%` : "N/A",
      bar: data.cacheHitRatio ?? 0,
      color: (data.cacheHitRatio ?? 0) > 95 ? "bg-emerald-500" : (data.cacheHitRatio ?? 0) > 80 ? "bg-amber-500" : "bg-red-500",
    },
    {
      label: "Index Count",
      value: data.tables?.reduce((s, t) => s + (t.indexCount || 0), 0).toString() || "0",
      bar: 0,
      color: "bg-blue-500",
    },
    {
      label: "Dead Tuples",
      value: data.tables?.reduce((s, t) => s + (t.deadTuples || 0), 0).toLocaleString() || "0",
      bar: 0,
      color: "bg-orange-500",
    },
    {
      label: "Uptime",
      value: data.uptime || "N/A",
      bar: 0,
      color: "bg-violet-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
            {item.label}
          </p>
          <p className="text-lg font-bold tracking-tight tabular-nums">{item.value}</p>
          {item.bar > 0 && (
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", item.color)}
                style={{ width: `${Math.min(item.bar, 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
