"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  useDashboard, useDeleteChart, useDuplicateDashboard,
} from "@/hooks/use-dashboards";
import { useDashboardShares, useCreateDashboardShare, useDeleteDashboardShare } from "@/hooks/use-dashboard-shares";
import { useConnections } from "@/hooks/use-connections";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartWidget } from "@/components/dashboard/ChartWidget";
import { AddChartDialog } from "@/components/dashboard/AddChartDialog";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExportDashboardButton } from "@/components/shared/ExportDashboardButton";
import { DraggableGrid, DragHandle } from "@/components/shared/DraggableGrid";
import {
  LayoutDashboard, Plus, Trash2, Pencil, BarChart3, Maximize2, Minimize2,
  Database, Zap, Clock, RefreshCw, Copy, Loader2, Share2,
} from "lucide-react";
import { DateRangePicker, formatDateISO, type DateRange } from "@/components/shared/DateRangePicker";
import type { Chart } from "@/hooks/use-dashboards";

export default function DashboardDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: dashboard, isLoading } = useDashboard(params.id);
  const { data: connections } = useConnections();
  const deleteChartMutation = useDeleteChart(params.id);
  const duplicateMutation = useDuplicateDashboard();
  const { data: shares } = useDashboardShares(params.id);
  const createShareMutation = useCreateDashboardShare(params.id);
  const deleteShareMutation = useDeleteDashboardShare(params.id);
  const [shareEmail, setShareEmail] = useState("");
  const [showShareInput, setShowShareInput] = useState(false);
  const [showAddChart, setShowAddChart] = useState(false);
  const [editingChart, setEditingChart] = useState<Chart | null>(null);
  const [fullWidthCharts, setFullWidthCharts] = useState<Set<string>>(new Set());
  const [deleteChartId, setDeleteChartId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300_000);
  const [dateRange, setDateRange] = useState<DateRange>({
    label: "All time",
    from: null,
    to: null,
  });
  const [chartOrder, setChartOrder] = useState<string[]>([]);
  const chartGridRef = useRef<HTMLDivElement>(null);

  const REFRESH_OPTIONS = [
    { label: "30s", value: 30_000 },
    { label: "1m", value: 60_000 },
    { label: "5m", value: 300_000 },
    { label: "15m", value: 900_000 },
  ];

  const toggleFullWidth = (chartId: string) => {
    setFullWidthCharts((prev) => {
      const next = new Set(prev);
      if (next.has(chartId)) next.delete(chartId);
      else next.add(chartId);
      return next;
    });
  };

  // Initialize chart order when dashboard loads
  useEffect(() => {
    if (dashboard && chartOrder.length === 0 && dashboard.charts.length > 0) {
      setChartOrder(dashboard.charts.map((c) => c.id));
    }
  }, [dashboard, chartOrder.length]);

  const uniqueConnections = useMemo(() => dashboard ? new Set(dashboard.charts.map((c) => c.connectionId)).size : 0, [dashboard]);
  const uniqueTypes = useMemo(() => dashboard ? new Set(dashboard.charts.map((c) => c.type)).size : 0, [dashboard]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Loading..."
          icon={<LayoutDashboard className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Dashboards", href: "/dashboards" },
            { label: "Loading..." },
          ]}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Not found"
          icon={<LayoutDashboard className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Dashboards", href: "/dashboards" },
            { label: "Not Found" },
          ]}
        />
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Dashboard not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={dashboard.name}
        description={dashboard.description || "Dashboard"}
        icon={<LayoutDashboard className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboards", href: "/dashboards" },
          { label: dashboard.name },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="hidden sm:block">
              <ExportDashboardButton dashboardRef={chartGridRef} dashboardName={dashboard.name} />
            </div>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors ${
                  autoRefresh
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border hover:bg-accent"
                }`}
                title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
              >
                <RefreshCw className={`h-3 w-3 ${autoRefresh ? "animate-spin" : ""}`} />
                Auto
              </button>
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="h-7 text-xs rounded-md border border-input bg-background px-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {REFRESH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex gap-1.5"
              onClick={() => duplicateMutation.mutate(params.id)}
              disabled={duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Duplicate
            </Button>
            <Button size="sm" className="gap-1.5 shadow-sm" onClick={() => setShowAddChart(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Chart
            </Button>
          </div>
        }
      />

      {/* KPI Metric Strip */}
      {dashboard.charts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-slide-up">
          <MetricCard
            title="Charts"
            value={dashboard.charts.length}
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            compact
          />
          <MetricCard
            title="Connections"
            value={uniqueConnections}
            icon={<Database className="h-3.5 w-3.5" />}
            compact
          />
          <MetricCard
            title="Types"
            value={uniqueTypes}
            icon={<Zap className="h-3.5 w-3.5" />}
            compact
          />
          <MetricCard
            title="Updated"
            value={new Date(dashboard.updatedAt).toLocaleDateString()}
            icon={<Clock className="h-3.5 w-3.5" />}
            compact
          />
        </div>
      )}

      {dashboard.charts.length === 0 ? (
        <Card className="shadow-sm border">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-3 ring-1 ring-primary/10">
              <BarChart3 className="h-6 w-6 text-primary/60" />
            </div>
            <p className="text-sm font-medium mb-1">No charts yet</p>
            <p className="text-xs text-muted-foreground/60 mb-4 max-w-sm mx-auto">
              Add a chart by running a SQL query and choosing a visualization type.
            </p>
            <Button size="sm" onClick={() => setShowAddChart(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Your First Chart
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div ref={chartGridRef}>
          <DraggableGrid items={chartOrder.length > 0 ? chartOrder : dashboard.charts.map((c) => c.id)} onReorder={setChartOrder}>
            {(chartId, dragHandleProps) => {
              const chart = dashboard.charts.find((c) => c.id === chartId);
              if (!chart) return null;
              return (
                <div className={`relative group ${fullWidthCharts.has(chart.id) ? "md:col-span-2" : ""}`}>
                  <DragHandle {...dragHandleProps} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
                    onClick={() => toggleFullWidth(chart.id)}
                    title={fullWidthCharts.has(chart.id) ? "Half width" : "Full width"}
                  >
                    {fullWidthCharts.has(chart.id) ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-12 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
                    onClick={() => {
                      setEditingChart(chart);
                      setShowAddChart(true);
                    }}
                    title="Edit chart"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-20 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => setDeleteChartId(chart.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <ErrorBoundary>
                    <ChartWidget
                      chart={chart}
                      refetchInterval={autoRefresh ? refreshInterval : 300_000}
                      dateFrom={dateRange.from ? formatDateISO(dateRange.from) : undefined}
                      dateTo={dateRange.to ? formatDateISO(dateRange.to) : undefined}
                    />
                  </ErrorBoundary>
                </div>
              );
            }}
          </DraggableGrid>
        </div>
      )}

      <AddChartDialog
        open={showAddChart}
        onClose={() => { setShowAddChart(false); setEditingChart(null); }}
        dashboardId={params.id}
        connections={connections ?? []}
        chart={editingChart}
      />

      <ConfirmDialog
        open={!!deleteChartId}
        onOpenChange={(open) => { if (!open) setDeleteChartId(null); }}
        title="Delete chart"
        description="Are you sure you want to delete this chart?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteChartId) {
            deleteChartMutation.mutateAsync(deleteChartId);
            setDeleteChartId(null);
          }
        }}
      />

      {/* Shares Section */}
      {shares && shares.length > 0 && (
        <Card className="shadow-sm border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Shared with</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {shares.map((s) => (
                <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs">
                  <span className="font-medium">{s.sharedWith.email}</span>
                  <span className="text-muted-foreground/50 text-[10px] px-1.5 py-0.5 rounded border bg-background">{s.permission}</span>
                  <button
                    onClick={() => deleteShareMutation.mutate(s.id)}
                    className="text-muted-foreground/40 hover:text-destructive transition-colors ml-1"
                    title="Remove share"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Input */}
      {showShareInput ? (
        <Card className="shadow-sm border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Share Dashboard</h3>
            </div>
            <div className="flex gap-2">
              <input
                autoFocus
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && shareEmail.trim()) {
                    createShareMutation.mutate({ sharedWithEmail: shareEmail.trim() });
                    setShareEmail("");
                    setShowShareInput(false);
                  }
                  if (e.key === "Escape") setShowShareInput(false);
                }}
                placeholder="Enter email address"
                className="flex-1 h-8 text-xs rounded-lg border border-input bg-background px-3 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  if (shareEmail.trim()) {
                    createShareMutation.mutate({ sharedWithEmail: shareEmail.trim() });
                    setShareEmail("");
                    setShowShareInput(false);
                  }
                }}
                disabled={!shareEmail.trim() || createShareMutation.isPending}
              >
                Share
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setShowShareInput(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground"
          onClick={() => setShowShareInput(true)}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share Dashboard
        </Button>
      )}
    </div>
  );
}
