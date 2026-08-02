"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateChart, useUpdateChart, type Chart } from "@/hooks/use-dashboards";
import { useAiGenerator } from "@/hooks/use-ai-generator";
import { useAiProviders } from "@/hooks/use-ai-providers";
import { getAllWidgets, loadExternalWidgets } from "@/lib/widgets/registry";
import type { WidgetDefinition } from "@/lib/widgets/types";
import { Loader2, Sparkles, Wand2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddChartDialogProps {
  open: boolean;
  onClose: () => void;
  dashboardId: string;
  connections: Array<{ id: string; name: string }>;
  chart?: Chart | null;
}

export function AddChartDialog({ open, onClose, dashboardId, connections, chart = null }: AddChartDialogProps) {
  const { data: providers } = useAiProviders();
  const isEditing = !!chart;
  const [title, setTitle] = useState("");
  const [type, setType] = useState("bar");
  const [connectionId, setConnectionId] = useState(connections[0]?.id || "");
  const [query, setQuery] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModelId, setAiModelId] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [widgets, setWidgets] = useState<WidgetDefinition[]>([]);
  const createMutation = useCreateChart(dashboardId);
  const updateMutation = useUpdateChart(dashboardId);
  const generator = useAiGenerator();

  useEffect(() => {
    loadExternalWidgets().then(() => setWidgets(getAllWidgets()));
  }, []);

  useEffect(() => {
    if (open) {
      setTitle(chart?.title ?? "");
      setType(chart?.type ?? "bar");
      setConnectionId(chart?.connectionId ?? connections[0]?.id ?? "");
      setQuery(chart?.query ?? "");
      setAiPrompt("");
      setAiModelId("");
      setShowAi(false);
    }
  }, [open, chart, connections]);

  const enabledModels = providers
    ?.filter((p) => p.isEnabled)
    .flatMap((p) => p.models.map((m) => ({ ...m, providerName: p.displayName }))) ?? [];

  const defaultModel = enabledModels.find((m) => m.isDefault) ?? enabledModels[0];
  const activeModelId = aiModelId || defaultModel?.id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !query.trim() || !connectionId) return;
    if (isEditing && chart) {
      await updateMutation.mutateAsync({ chartId: chart.id, title, type, connectionId, query });
    } else {
      await createMutation.mutateAsync({ title, type, connectionId, query });
    }
    onClose();
  };

  const handleAiGenerate = async () => {
    const modelId = aiModelId || defaultModel?.id;
    if (!aiPrompt.trim() || !connectionId || !modelId) return;
    const result = await generator.mutateAsync({
      prompt: aiPrompt,
      connectionId,
      type: "query",
      modelId,
    });
    if (result.type === "query") {
      setQuery(result.sql);
      if (!title.trim()) {
        setTitle(aiPrompt.length > 40 ? aiPrompt.slice(0, 40) + "..." : aiPrompt);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{isEditing ? "Edit Chart" : "Add Chart"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="chart-title" className="text-xs">Chart Title</Label>
            <Input
              id="chart-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Monthly Revenue"
              required
              className="h-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="chart-type" className="text-xs">Chart Type</Label>
              <select
                id="chart-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {widgets.length === 0 && (
                  <>
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="table">Table</option>
                  </>
                )}
                {widgets.filter((w) => w.category === "chart").map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
                {widgets.filter((w) => w.category === "visualization").length > 0 && (
                  <optgroup label="Visualizations">
                    {widgets.filter((w) => w.category === "visualization").map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </optgroup>
                )}
                {widgets.filter((w) => w.category === "table").length > 0 && (
                  <optgroup label="Tables">
                    {widgets.filter((w) => w.category === "table").map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="chart-conn" className="text-xs">Connection</Label>
              <select
                id="chart-conn"
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SQL Query with AI */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="chart-query" className="text-xs">SQL Query</Label>
              <button
                type="button"
                onClick={() => setShowAi(!showAi)}
                className={cn(
                  "flex items-center gap-1 text-[10px] transition-colors",
                  showAi ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
                )}
              >
                <Sparkles className="h-3 w-3" />
                Generate with AI
              </button>
            </div>
            <textarea
              id="chart-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT category, SUM(amount) as total FROM orders GROUP BY category ORDER BY total DESC LIMIT 10"
              className="w-full min-h-[100px] p-3 text-sm font-mono rounded-lg border border-input bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"
              required
              rows={4}
            />
          </div>

          {/* AI Panel */}
          {showAi && (
            <div className="p-3 rounded-lg bg-muted/30 border space-y-3 animate-slide-down">
              <p className="text-[10px] text-muted-foreground/60">Describe what chart data you want:</p>
              {enabledModels.length > 0 && (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  <select
                    value={activeModelId}
                    onChange={(e) => setAiModelId(e.target.value)}
                    className="h-7 text-[10px] rounded-md border border-input bg-background px-2 pr-5 focus:outline-none focus:ring-1 focus:ring-ring appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                      backgroundPosition: "right 4px center",
                      paddingRight: "18px",
                    }}
                  >
                    {providers?.filter((p) => p.isEnabled).map((p) => (
                      <optgroup key={p.id} label={p.displayName}>
                        {p.models.map((m) => (
                          <option key={m.id} value={m.id}>{m.displayName}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='e.g. "Show me total sales by category for this year"'
                className="w-full min-h-[60px] p-2.5 text-xs rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleAiGenerate}
                  disabled={generator.isPending || !aiPrompt.trim() || !activeModelId}
                >
                  {generator.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  Generate
                </Button>
              </div>
              {generator.error && (
                <p className="text-[10px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {generator.error.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              size="sm"
              disabled={(createMutation.isPending || updateMutation.isPending) || !title.trim() || !query.trim()}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Chart"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
