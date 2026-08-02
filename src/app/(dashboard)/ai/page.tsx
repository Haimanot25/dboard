"use client";

import { useState } from "react";
import Link from "next/link";
import { useConnections } from "@/hooks/use-connections";
import { useAiProviders } from "@/hooks/use-ai-providers";
import { useAiGenerator } from "@/hooks/use-ai-generator";
import { GenerationPreview } from "@/components/ai/GenerationPreview";
import { PanelRenderer } from "@/components/ai/PanelRenderer";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Wand2, Loader2, AlertCircle, Table2,
  BarChart3, FormInput, Terminal, Database, ChevronRight, Cog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationType, GenerationResult } from "@/lib/ai/generate";

const typeOptions: { value: GenerationType; label: string; icon: typeof Sparkles }[] = [
  { value: "panel", label: "Admin Panel", icon: Table2 },
  { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  { value: "form", label: "Form", icon: FormInput },
  { value: "query", label: "SQL Query", icon: Terminal },
];

export default function AIPage() {
  const { data: connections } = useConnections();
  const { data: providers } = useAiProviders();
  const [prompt, setPrompt] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [type, setType] = useState<GenerationType>("panel");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [appliedPanel, setAppliedPanel] = useState<{ config: Parameters<typeof PanelRenderer>[0]["config"]; connectionId: string } | null>(null);

  const generator = useAiGenerator();

  const enabledModels = providers?.filter((p) => p.isEnabled).flatMap((p) =>
    p.models.map((m) => ({ ...m, providerName: p.displayName, providerId: p.name }))
  ) ?? [];

  const defaultModel = enabledModels.find((m) => m.isDefault) ?? enabledModels[0];

  const handleGenerate = async () => {
    if (!prompt.trim() || !connectionId) return;
    const modelId = selectedModelId || defaultModel?.id;
    if (!modelId) return;
    setResult(null);
    setAppliedPanel(null);
    try {
      const res = await generator.mutateAsync({ prompt, connectionId, type, modelId });
      setResult(res);
    } catch (err) {
      console.error("AI generation failed:", err);
    }
  };

  const handleApply = () => {
    if (!result || !connectionId) return;
    if (result.type === "panel") {
      setAppliedPanel({ config: result.config, connectionId });
    } else if (result.type === "query") {
      navigator.clipboard.writeText(result.sql);
    }
  };

  const selectedConn = connections?.find((c) => c.id === connectionId);
  const noProvidersConfigured = providers && providers.length > 0 && !providers.some((p) => p.isEnabled && (p.hasKey || !p.needsKey));

  // Group models for the dropdown
  const modelsByProvider = providers?.filter((p) => p.isEnabled).reduce<Record<string, { id: string; modelId: string; displayName: string }[]>>((acc, p) => {
    if (p.models.length > 0) {
      acc[p.displayName] = p.models.map((m) => ({ id: m.id, modelId: m.modelId, displayName: m.displayName }));
    }
    return acc;
  }, {}) ?? {};

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Generator"
        description="Generate admin panels, dashboards, forms, and queries from natural language"
        icon={<Sparkles className="h-5 w-5" />}
        breadcrumbs={[{ label: "AI Generator" }]}
        actions={
          <Link href="/settings/ai">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Cog className="h-3.5 w-3.5" />
              AI Settings
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Input */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm border">
            <CardContent className="pt-5 space-y-4">
              {/* Connection selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Database Connection</Label>
                <select
                  value={connectionId}
                  onChange={(e) => setConnectionId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a connection...</option>
                  {connections?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              {/* Type selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Generation Type</Label>
                <div className="flex gap-1.5 p-1 bg-muted/60 rounded-xl w-fit">
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setType(opt.value); setResult(null); }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        type === opt.value
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground/60 hover:text-foreground"
                      )}
                    >
                      <opt.icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <Label className="text-xs">Describe what you want to create</Label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    type === "panel" ? 'e.g. "Create a user management panel with search and filtering by role"'
                    : type === "dashboard" ? 'e.g. "Show me monthly revenue and top products"'
                    : type === "form" ? 'e.g. "Create a new user registration form"'
                    : 'e.g. "Show me all users who signed up this month"'
                  }
                  className="w-full min-h-[100px] p-3 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={4}
                />
              </div>

              {/* Model selector from providers */}
              <div className="space-y-1.5">
                <Label className="text-xs">AI Model</Label>
                {Object.keys(modelsByProvider).length > 0 ? (
                  <select
                    value={selectedModelId || defaultModel?.id || ""}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {Object.entries(modelsByProvider).map(([providerName, models]) => (
                      <optgroup key={providerName} label={providerName}>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>{m.displayName}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-dashed bg-muted/20 text-xs text-muted-foreground/60">
                    No models available
                    <Link href="/settings/ai" className="text-primary hover:underline ml-1">Configure providers</Link>
                  </div>
                )}
              </div>

              <Button
                className="w-full gap-2 shadow-sm"
                onClick={handleGenerate}
                disabled={generator.isPending || !prompt.trim() || !connectionId || enabledModels.length === 0}
              >
                {generator.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {generator.isPending ? "Generating..." : "Generate"}
              </Button>
            </CardContent>
          </Card>

          {!connectionId && (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="pt-6 pb-6 text-center">
                <Database className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/60">
                  Select a database connection to start generating
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Result */}
        <div className="lg:col-span-3 space-y-4">
          {generator.error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-destructive">Generation failed</p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">{generator.error.message}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {generator.isPending && (
            <Card className="shadow-sm">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
                <p className="text-sm font-medium">Analyzing your schema and generating...</p>
                <p className="text-xs text-muted-foreground/60 mt-1">This usually takes a few seconds</p>
              </CardContent>
            </Card>
          )}

          {result && !generator.isPending && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <ChevronRight className="h-3 w-3" />
                    {type}
                  </Badge>
                  {selectedConn && (
                    <Badge variant="secondary" className="text-[10px]">{selectedConn.name}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {type !== "query" && (
                    <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleApply}>
                      <Wand2 className="h-3.5 w-3.5" />
                      {result.type === "panel" ? "Render Panel" : "Copy Config"}
                    </Button>
                  )}
                  {result.type === "query" && (
                    <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleApply}>
                      Copy SQL
                    </Button>
                  )}
                </div>
              </div>
              <GenerationPreview result={result} />
            </div>
          )}

          {!result && !generator.isPending && !generator.error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 ring-1 ring-primary/10">
                <Sparkles className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-base font-semibold mb-1">Ready to create</h3>
              <p className="text-xs text-muted-foreground/60 max-w-sm">
                Describe what you need in natural language and the AI will generate it based on your database schema.
              </p>
              {noProvidersConfigured && (
                <Link href="/settings/ai">
                  <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                    <Cog className="h-3.5 w-3.5" />
                    Configure API Key
                  </Button>
                </Link>
              )}
            </div>
          )}

          {appliedPanel && (
            <div className="space-y-4 animate-slide-up pt-4 border-t">
              <PanelRenderer config={appliedPanel.config} connectionId={appliedPanel.connectionId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
