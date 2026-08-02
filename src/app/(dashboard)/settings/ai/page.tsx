"use client";

import { useState } from "react";
import { useAiProviders, useSaveAiProvider, useSetDefaultModel, useResetAiProviders, useTestAiConnection } from "@/hooks/use-ai-providers";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, ChevronDown, ChevronRight, Eye, EyeOff,
  CheckCircle2, AlertCircle, RefreshCw, FlaskConical,
  Globe, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDER_ICONS: Record<string, string> = {
  chatgpt: "OpenAI",
  groq: "Groq",
  gemini: "Google",
  ollama: "Ollama",
};

export default function AISettingsPage() {
  const { data: providers, isLoading, error } = useAiProviders();
  const saveMutation = useSaveAiProvider();
  const setDefaultMutation = useSetDefaultModel();
  const resetMutation = useResetAiProviders();
  const testMutation = useTestAiConnection();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [baseUrlInputs, setBaseUrlInputs] = useState<Record<string, string>>({});
  const [savedProvider, setSavedProvider] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleToggleExpand = (id: string) => {
    const wasExpanded = expandedId === id;
    setExpandedId(wasExpanded ? null : id);
    if (!wasExpanded) {
      const prov = providers?.find((p) => p.id === id);
      if (prov) {
        setApiKeyInputs((prev) => ({ ...prev, [id]: prev[id] ?? "" }));
        setBaseUrlInputs((prev) => ({ ...prev, [id]: prev[id] ?? prov.baseUrl ?? "" }));
      }
    }
  };

  const handleSave = async (id: string) => {
    setSavedProvider(null);
    setSaveError(null);
    const data: Record<string, unknown> = {};
    // Only send apiKey if user actually typed something
    if (apiKeyInputs[id]?.trim()) {
      data.apiKey = apiKeyInputs[id].trim();
    }
    if (baseUrlInputs[id] !== undefined) {
      data.baseUrl = baseUrlInputs[id] || null;
    }
    try {
      await saveMutation.mutateAsync({ id, ...data });
      setSavedProvider(id);
      setTimeout(() => setSavedProvider(null), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleToggleEnabled = async (id: string, current: boolean) => {
    try {
      await saveMutation.mutateAsync({ id, isEnabled: !current });
    } catch (err) {
      console.error("Failed to toggle provider:", err);
    }
  };

  const handleSetDefaultModel = async (modelId: string) => {
    try {
      await setDefaultMutation.mutateAsync({ modelId });
    } catch (err) {
      console.error("Failed to set default model:", err);
    }
  };

  const handleTest = async (providerId: string, modelId: string) => {
    try {
      await testMutation.mutateAsync({ providerId, modelId });
    } catch (err) {
      console.error("AI connection test failed:", err);
    }
  };

  const handleReset = async () => {
    try {
      await resetMutation.mutateAsync();
      setShowResetConfirm(false);
    } catch (err) {
      console.error("Failed to reset AI providers:", err);
    }
  };

  // Gather all models for the global default picker
  const allModels = providers?.filter((p) => p.isEnabled).flatMap((p) =>
    p.models.map((m) => ({ ...m, providerName: p.displayName }))
  ) ?? [];
  const globalDefault = allModels.find((m) => m.isDefault) ?? allModels[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI Settings"
        description="Configure AI providers for natural language generation"
        icon={<Sparkles className="h-5 w-5" />}
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "AI Providers" }]}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">Failed to load AI providers</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ── Global Default Model ── */}
          {allModels.length > 0 && (
            <Card className="shadow-sm border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Default Model</span>
                </div>
                <p className="text-xs text-muted-foreground/70 mb-3">
                  The model used by default across all AI features (generation dialog, SQL console, etc.).
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={globalDefault?.id ?? ""}
                      onChange={(e) => handleSetDefaultModel(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {providers?.filter((p) => p.isEnabled).map((p) => (
                        <optgroup key={p.id} label={p.displayName}>
                          {p.models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.displayName}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  {setDefaultMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  )}
                  {globalDefault && (
                    <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary/70 shrink-0">
                      {globalDefault.providerName}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Provider List ── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground/70">
              Configure API keys and models for each AI provider. Keys are encrypted at rest.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowResetConfirm(true)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset defaults
            </Button>
          </div>

          <div className="grid gap-4">
            {providers?.map((provider) => (
              <Card
                key={provider.id}
                className={cn(
                  "transition-all duration-200",
                  !provider.isEnabled && "opacity-60",
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggleExpand(provider.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggleExpand(provider.id); } }}
                  className="w-full flex items-center gap-3.5 p-4 text-left cursor-pointer"
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ring-1",
                    provider.isEnabled
                      ? "bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-primary/10"
                      : "bg-muted/50 text-muted-foreground/40 ring-border/30"
                  )}>
                    {PROVIDER_ICONS[provider.name]?.slice(0, 2).toUpperCase() || provider.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{provider.displayName}</span>
                      {provider.hasKey && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-success/5 border-success/20 text-success/70 font-normal">
                          Key set
                        </Badge>
                      )}
                      {!provider.needsKey && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted/50 text-muted-foreground/60 font-normal">
                          No key needed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        "text-[10px]",
                        provider.isEnabled ? "text-success/70" : "text-muted-foreground/40"
                      )}>
                        {provider.isEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <span className="text-muted-foreground/20">·</span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {provider.models.length} model{provider.models.length !== 1 ? "s" : ""}
                      </span>
                      {provider.models.find((m) => m.isDefault) && (
                        <>
                          <span className="text-muted-foreground/20">·</span>
                          <span className="text-[10px] text-muted-foreground/50">
                            Default: {provider.models.find((m) => m.isDefault)?.displayName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleEnabled(provider.id, provider.isEnabled); }}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        provider.isEnabled
                          ? "text-success/70 hover:text-success hover:bg-success/5"
                          : "text-muted-foreground/30 hover:text-muted-foreground hover:bg-accent"
                      )}
                      title={provider.isEnabled ? "Disable" : "Enable"}
                    >
                      {provider.isEnabled ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                    </button>
                    {expandedId === provider.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                </div>

                {expandedId === provider.id && (
                  <div className="border-t px-4 py-4 space-y-4">
                    {provider.needsKey && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground/70">API Key</label>
                        <div className="relative">
                          <input
                            type={showKeys[provider.id] ? "text" : "password"}
                            value={apiKeyInputs[provider.id] ?? ""}
                            onChange={(e) => setApiKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                            placeholder={provider.hasKey ? "Leave blank to keep existing key" : "sk-... or API key"}
                            className="w-full h-9 text-sm rounded-lg border border-input bg-background px-3 pr-24 focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            {provider.hasKey && !apiKeyInputs[provider.id] && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-success/5 border-success/20 text-success/70 font-normal mr-1">
                                {provider.apiKey?.slice(-4) ? `••••${provider.apiKey.slice(-4)}` : "Saved"}
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                              className="p-1 text-muted-foreground/50 hover:text-foreground transition-colors"
                            >
                              {showKeys[provider.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground/70">Base URL</label>
                      <div className="relative">
                        <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                        <input
                          type="url"
                          value={baseUrlInputs[provider.id] ?? provider.baseUrl ?? ""}
                          onChange={(e) => setBaseUrlInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                          placeholder="https://api.example.com/v1"
                          className="w-full h-9 text-sm rounded-lg border border-input bg-background pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground/40">
                        Override the default API endpoint. Useful for proxies or self-hosted models.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground/70">Models</label>
                      <div className="grid gap-1.5">
                        {provider.models.map((model) => {
                          const isThisGlobalDefault = model.isDefault;
                          return (
                            <div
                              key={model.id}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all",
                                isThisGlobalDefault
                                  ? "bg-primary/5 border-primary/20"
                                  : "bg-background border-input/50 hover:border-input"
                              )}
                            >
                              <button
                                onClick={() => handleSetDefaultModel(model.id)}
                                className={cn(
                                  "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                  isThisGlobalDefault
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground/30 hover:border-muted-foreground/50"
                                )}
                                title={isThisGlobalDefault ? "Default model" : "Set as global default"}
                              >
                                {isThisGlobalDefault && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium">{model.displayName}</span>
                                  <code className="text-[10px] text-muted-foreground/40 font-mono">{model.modelId}</code>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] gap-1.5 px-2"
                                onClick={() => handleTest(provider.id, model.id)}
                                disabled={testMutation.isPending && testMutation.variables?.modelId === model.id}
                              >
                                {testMutation.isPending && testMutation.variables?.modelId === model.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <FlaskConical className="h-3 w-3" />
                                )}
                                Test
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {testMutation.isSuccess && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-success">Connection successful</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{testMutation.data.response}</p>
                        </div>
                      </div>
                    )}

                    {testMutation.isError && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">{testMutation.error.message}</p>
                      </div>
                    )}

                    {saveError && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">{saveError}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {savedProvider === provider.id && (
                        <div className="flex items-center gap-1.5 text-xs text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Saved
                        </div>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleSave(provider.id)}
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {showResetConfirm && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Reset all providers?</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      This will remove all AI providers and their saved API keys. Default providers will be re-created without keys.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="destructive" size="sm" onClick={handleReset} disabled={resetMutation.isPending}>
                        {resetMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Reset
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
