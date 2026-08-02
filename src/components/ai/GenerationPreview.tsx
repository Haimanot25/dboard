"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table2, Filter, Search, ArrowUpDown, BarChart3, PieChart,
  Activity, FormInput, CheckCheck, ListChecks,
} from "lucide-react";
import type {
  GenerationResult,
  PanelConfig,
  DashboardConfig,
  FormConfig,
  ChartConfig,
} from "@/lib/ai/generate";

interface GenerationPreviewProps {
  result: GenerationResult;
  className?: string;
}

export function GenerationPreview({ result, className }: GenerationPreviewProps) {
  if (result.type === "panel") {
    return <PanelPreview config={result.config} className={className} />;
  }
  if (result.type === "dashboard") {
    return <DashboardPreview config={result.config} className={className} />;
  }
  if (result.type === "form") {
    return <FormPreview config={result.config} className={className} />;
  }
  if (result.type === "query") {
    return (
      <Card className={cn("shadow-sm", className)}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2.5 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Generated SQL Query</span>
          </div>
          <pre className="p-3 rounded-lg bg-muted/50 border text-xs font-mono overflow-x-auto whitespace-pre-wrap">
            {result.sql}
          </pre>
        </CardContent>
      </Card>
    );
  }
  return null;
}

function PanelPreview({ config, className }: { config: PanelConfig; className?: string }) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Table2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <CardTitle className="text-sm">{config.title}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-[10px]">{config.table}</Badge>
        </div>
        {config.description && (
          <p className="text-xs text-muted-foreground/70 mt-1">{config.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {config.actions.map((a) => (
            <Badge key={a} variant="outline" className="text-[10px] gap-1">
              {a === "create" && <CheckCheck className="h-3 w-3" />}
              {a === "edit" && <FormInput className="h-3 w-3" />}
              {a === "delete" && <ListChecks className="h-3 w-3" />}
              {a}
            </Badge>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium flex items-center gap-1.5">
            <Filter className="h-3 w-3" /> Columns to display
          </p>
          <div className="flex flex-wrap gap-1">
            {config.columns.map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px] font-mono">{c}</Badge>
            ))}
          </div>
        </div>
        {config.filters.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">Filters</p>
            <div className="flex flex-wrap gap-1">
              {config.filters.map((f) => (
                <Badge key={f} variant="outline" className="text-[10px] font-mono">{f}</Badge>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1"><Search className="h-3 w-3" /> Search: {config.searchColumns.join(", ")}</span>
          <span className="flex items-center gap-1"><ArrowUpDown className="h-3 w-3" /> Sort: {config.defaultSort.column} ({config.defaultSort.direction})</span>
          <span>{config.pageSize} / page</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPreview({ config, className }: { config: DashboardConfig; className?: string }) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">{config.title}</CardTitle>
            {config.description && (
              <p className="text-xs text-muted-foreground/70">{config.description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {config.charts.map((chart, i) => (
            <ChartPreviewCard key={i} chart={chart} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartPreviewCard({ chart }: { chart: ChartConfig }) {
  return (
    <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium truncate">{chart.title}</span>
        <Badge variant="outline" className="text-[9px] font-mono">{chart.type}</Badge>
      </div>
      <pre className="text-[9px] font-mono text-muted-foreground/60 line-clamp-2 leading-relaxed">
        {chart.query}
      </pre>
      <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40">
        <span>{chart.width}x{chart.height}</span>
        {chart.type === "bar" && <BarChart3 className="h-3 w-3" />}
        {chart.type === "pie" && <PieChart className="h-3 w-3" />}
        {chart.type === "line" && <Activity className="h-3 w-3" />}
      </div>
    </div>
  );
}

function FormPreview({ config, className }: { config: FormConfig; className?: string }) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <FormInput className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">{config.title}</CardTitle>
            <p className="text-[10px] text-muted-foreground/60">Table: {config.table}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {config.fields.map((field) => (
            <div key={field.name} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/20">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{field.label}</span>
                  {field.required && <span className="text-[9px] text-destructive">*</span>}
                </div>
                <p className="text-[10px] text-muted-foreground/50 font-mono">{field.name}</p>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono shrink-0">{field.type}</Badge>
              {field.options && (
                <Badge variant="secondary" className="text-[9px] shrink-0">{field.options.length} options</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
