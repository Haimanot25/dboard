"use client";

import { useState } from "react";
import { Database, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConnectionSelector } from "@/components/db-monitor/ConnectionSelector";
import { MetricCards, SecondaryMetrics } from "@/components/db-monitor/MetricCards";
import { TableInventory } from "@/components/db-monitor/TableInventory";
import { HealthTimeline } from "@/components/db-monitor/HealthTimeline";
import { useConnectionInfo } from "@/hooks/use-connection-info";

const REFRESH_OPTIONS = [
  { label: "30s", value: 30_000 },
  { label: "1m", value: 60_000 },
  { label: "5m", value: 300_000 },
  { label: "Off", value: 0 },
];

export default function DbMonitorPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30_000);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const effectiveInterval = autoRefresh ? refreshInterval : 0;
  const { data, isLoading, error, refetch, isFetching } = useConnectionInfo(selectedId, {
    refetchInterval: effectiveInterval,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="DB Monitor"
        description="Real-time database monitoring and diagnostics"
        icon={<Database className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {selectedId && (
              <>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                    autoRefresh
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <RefreshCw className={`h-3 w-3 ${autoRefresh && isFetching ? "animate-spin" : ""}`} />
                  {autoRefresh ? "Auto" : "Paused"}
                </button>
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="h-8 text-xs rounded-lg border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {REFRESH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs hover:bg-accent transition-colors"
                >
                  {isFetching ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Refresh
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Connection Selector */}
      <div className="flex items-center gap-4">
        <ConnectionSelector value={selectedId} onChange={setSelectedId} />
        {data && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${data.status === "online" ? "bg-emerald-500" : "bg-red-500"}`} />
            <span>{data.status === "online" ? "Connected" : "Offline"}</span>
            <span>·</span>
            <span>{data.latencyMs}ms</span>
          </div>
        )}
      </div>

      {/* No connection selected */}
      {!selectedId && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
          <Database className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">Select a database connection</p>
          <p className="text-sm">Choose a connection above to view real-time monitoring data</p>
        </div>
      )}

      {/* Error */}
      {error && selectedId && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Connection Error</p>
            <p className="text-xs opacity-70">{error.message}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && selectedId && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-7 w-7 bg-muted rounded-lg" />
                </div>
                <div className="h-7 w-20 bg-muted rounded mb-1" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-card p-4 animate-pulse">
            <div className="h-5 w-32 bg-muted rounded mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data */}
      {data && !isLoading && (
        <>
          <MetricCards data={data} isLoading={false} />
          <SecondaryMetrics data={data} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <TableInventory data={data} isLoading={false} />
            </div>
            <div>
              <HealthTimeline
                connectionId={selectedId}
                latencyMs={data.latencyMs}
                status={data.status}
              />

              {/* Connection States */}
              {data.connectionStates && Object.keys(data.connectionStates).length > 0 && (
                <div className="rounded-xl border bg-card p-4 mt-4">
                  <h3 className="text-sm font-semibold mb-3">Connection States</h3>
                  <div className="space-y-2">
                    {Object.entries(data.connectionStates).map(([state, count]) => (
                      <div key={state} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{state || "unknown"}</span>
                        <span className="font-medium tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Storage Info (MongoDB) */}
              {data.storageInfo && (
                <div className="rounded-xl border bg-card p-4 mt-4">
                  <h3 className="text-sm font-semibold mb-3">Storage</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data Size</span>
                      <span className="font-medium">{data.storageInfo.dataSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage Size</span>
                      <span className="font-medium">{data.storageInfo.storageSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Indexes</span>
                      <span className="font-medium">{data.storageInfo.indexes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Index Size</span>
                      <span className="font-medium">{data.storageInfo.indexSize}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
