"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAiGenerator } from "@/hooks/use-ai-generator";
import { useAiProviders } from "@/hooks/use-ai-providers";
import { GenerationPreview } from "./GenerationPreview";
import {
  Loader2, Sparkles, Wand2, AlertCircle, Table2,
  BarChart3, FormInput, Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationType, GenerationResult } from "@/lib/ai/generate";

interface GenerationDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  connectionName?: string;
  connections?: { id: string; name: string; type: string }[];
  onConnectionChange?: (connectionId: string) => void;
  defaultType?: GenerationType;
  onApply?: (result: GenerationResult) => void;
}

const typeOptions: { value: GenerationType; label: string; icon: typeof Sparkles }[] = [
  { value: "panel", label: "Admin Panel", icon: Table2 },
  { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  { value: "form", label: "Form", icon: FormInput },
  { value: "query", label: "SQL Query", icon: Terminal },
];

export function GenerationDialog({
  open, onClose, connectionId, connectionName, connections, onConnectionChange, defaultType = "panel", onApply,
}: GenerationDialogProps) {
  const { data: providers } = useAiProviders();
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<GenerationType>(defaultType);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [result, setResult] = useState<GenerationResult | null>(null);

  const generator = useAiGenerator();

  const enabledModels = providers?.filter((p) => p.isEnabled).flatMap((p) =>
    p.models.map((m) => ({ ...m, providerName: p.displayName }))
  ) ?? [];

  const defaultModel = enabledModels.find((m) => m.isDefault) ?? enabledModels[0];
  const activeModelId = selectedModelId || defaultModel?.id || "";

  const handleGenerate = async () => {
    if (!prompt.trim() || !activeModelId) return;
    setResult(null);
    try {
      const res = await generator.mutateAsync({ prompt, connectionId, type, modelId: activeModelId });
      setResult(res);
    } catch (err) {
      console.error("AI generation failed:", err);
    }
  };

  const handleApply = () => {
    if (result && onApply) {
      onApply(result);
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt("");
    setResult(null);
    setSelectedModelId("");
    generator.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-base">AI Generation</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type selector */}
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

          {/* Connection selector */}
          {connections && connections.length > 1 && onConnectionChange && (
            <div className="space-y-1.5">
              <Label className="text-xs">Database Connection</Label>
              <select
                value={connectionId}
                onChange={(e) => { onConnectionChange(e.target.value); setResult(null); }}
                className="w-full h-9 text-sm rounded-lg border border-input bg-background px-3 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
          )}

          {/* Connection name (when single connection) */}
          {connectionName && (!connections || connections.length <= 1) && (
            <p className="text-xs text-muted-foreground/60">
              Connection: <span className="font-medium text-foreground/80">{connectionName}</span>
            </p>
          )}

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label className="text-xs">Describe what you want to create</Label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                type === "panel" ? 'e.g. "Create a user management panel with search and filtering by role"'
                : type === "dashboard" ? 'e.g. "Show me monthly revenue, top products, and orders by status"'
                : type === "form" ? 'e.g. "Create a new user registration form with name, email, and role fields"'
                : 'e.g. "Show me all users who signed up this month with their order counts"'
              }
              className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>

          {/* Model selector */}
          {enabledModels.length > 0 && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              <select
                value={activeModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="h-8 text-xs rounded-md border border-input bg-background px-2 pr-6 focus:outline-none focus:ring-1 focus:ring-ring appearance-none bg-no-repeat"
                style={{
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                  backgroundPosition: "right 6px center",
                  paddingRight: "24px",
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

          {/* Generate button */}
          <Button
            className="w-full gap-2 shadow-sm"
            onClick={handleGenerate}
            disabled={generator.isPending || !prompt.trim() || !activeModelId}
          >
            {generator.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {generator.isPending ? "Generating..." : "Generate"}
          </Button>

          {/* Error */}
          {generator.error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{generator.error.message}</p>
            </div>
          )}

          {/* Loading */}
          {generator.isPending && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {/* Result */}
          {result && !generator.isPending && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{type}</Badge>
              </div>
              <GenerationPreview result={result} />
              {onApply && (
                <Button className="w-full gap-2" size="sm" onClick={handleApply}>
                  <Wand2 className="h-4 w-4" />
                  Apply
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
