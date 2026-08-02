"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BarChart3, PieChart, TrendingUp, Table2, Activity, Grid, Puzzle } from "lucide-react";
import { getWidget } from "@/lib/widgets/registry";
import { useEffect, useState, useMemo, memo } from "react";

interface ChartWidgetProps {
  chart: {
    id: string;
    title: string;
    type: string;
    connectionId: string;
    query: string;
    config: string;
  };
  refetchInterval?: number;
  dateFrom?: string;
  dateTo?: string;
}

const ICON_MAP: Record<string, typeof BarChart3> = {
  bar: BarChart3,
  pie: PieChart,
  line: TrendingUp,
  table: Table2,
  sparkline: Activity,
  heatmap: Grid,
};

export const ChartWidget = memo(function ChartWidget({ chart, refetchInterval = 300_000, dateFrom, dateTo }: ChartWidgetProps) {
  const [widgetsLoaded, setWidgetsLoaded] = useState(false);

  useEffect(() => {
    if (!widgetsLoaded) {
      import("@/lib/widgets/registry").then((m) => {
        m.loadExternalWidgets().then(() => setWidgetsLoaded(true));
      });
    }
  }, [widgetsLoaded]);

  const { data, isLoading, error } = useQuery<{
    columns: string[];
    data: Record<string, unknown>[];
  }>({
    queryKey: ["chart-data", chart.id, chart.connectionId, chart.query, dateFrom, dateTo],
    queryFn: async () => {
      const body: Record<string, unknown> = { sql: chart.query };
      if (dateFrom) body.dateFrom = dateFrom;
      if (dateTo) body.dateTo = dateTo;
      const res = await fetch(`/api/query/${chart.connectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Query failed");
      }
      return res.json();
    },
    enabled: !!chart.connectionId && !!chart.query,
    refetchInterval,
  });

  const widgetDef = getWidget(chart.type);
  const TypeIcon = ICON_MAP[chart.type] || (widgetDef ? Puzzle : BarChart3);

  const parsedConfig = useMemo<Record<string, unknown>>(() => {
    try { return JSON.parse(chart.config || "{}"); } catch { return {}; }
  }, [chart.config]);

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TypeIcon className="h-4 w-4 text-primary" />
          {chart.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error.message}</span>
          </div>
        ) : !data || data.data.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-8">No data returned</p>
        ) : widgetDef ? (
          <widgetDef.renderer data={data} config={parsedConfig} />
        ) : chart.type === "table" ? (
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  {data.columns.map((col) => (
                    <th key={col} className="text-left px-2 py-1.5 font-medium text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {data.columns.map((col) => (
                      <td key={col} className="px-2 py-1 font-mono text-[11px]">{formatValue(row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <SimpleChart data={data} type={chart.type} />
        )}
      </CardContent>
    </Card>
  );
});

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

function SimpleChart({ data, type }: { data: { columns: string[]; data: Record<string, unknown>[] }; type: string }) {
  const labelCol = data.columns[0];
  const valueCol = data.columns[1] || data.columns[0];
  const values = data.data.slice(0, 30);
  const maxVal = values.reduce((max, r) => Math.max(max, Number(r[valueCol]) || 0), 1) || 1;

  if (type === "pie") {
    return (
      <div className="flex flex-wrap gap-3 py-2">
        {values.map((row, i) => {
          const val = Number(row[valueCol]) || 0;
          const pct = ((val / maxVal) * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="truncate max-w-[120px]">{formatValue(row[labelCol])}</span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-2">
      {values.map((row, i) => {
        const val = Number(row[valueCol]) || 0;
        const pct = Math.max((val / maxVal) * 100, 1);
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-24 truncate text-muted-foreground shrink-0">{formatValue(row[labelCol])}</span>
            <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: `hsl(var(--primary) / ${0.3 + (val / maxVal) * 0.7})` }}
              />
            </div>
            <span className="w-12 text-right tabular-nums text-muted-foreground">{val.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
