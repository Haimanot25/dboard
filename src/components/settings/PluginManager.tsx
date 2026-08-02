"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Database, Puzzle, Webhook, RefreshCw, ExternalLink } from "lucide-react";

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  type: "adapter" | "widget" | "webhook";
}

export function PluginManager() {
  const [plugins, setPlugins] = useState<{ adapters: PluginInfo[]; widgets: PluginInfo[]; webhookActions: PluginInfo[] }>({
    adapters: [], widgets: [], webhookActions: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plugins");
      if (res.ok) {
        setPlugins(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch plugins:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPlugins(); }, []);

  const totalCount = plugins.adapters.length + plugins.widgets.length + plugins.webhookActions.length;

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Plugin Manager
              </CardTitle>
              <CardDescription className="text-xs">
                Manage installed adapter, widget, and webhook plugins
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {totalCount} plugin{totalCount !== 1 ? "s" : ""}
              </Badge>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchPlugins} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="adapters">
            <TabsList className="h-8">
              <TabsTrigger value="adapters" className="text-xs gap-1.5 h-7">
                <Database className="h-3 w-3" />
                Adapters ({plugins.adapters.length})
              </TabsTrigger>
              <TabsTrigger value="widgets" className="text-xs gap-1.5 h-7">
                <Puzzle className="h-3 w-3" />
                Widgets ({plugins.widgets.length})
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="text-xs gap-1.5 h-7">
                <Webhook className="h-3 w-3" />
                Webhooks ({plugins.webhookActions.length})
              </TabsTrigger>
            </TabsList>

            {(["adapters", "widgets", "webhookActions"] as const).map((type) => {
              const label = type === "webhookActions" ? "webhooks" : type;
              return (
              <TabsContent key={type} value={label} className="mt-4">
                {plugins[type].length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                      {type === "adapters" ? <Database className="h-6 w-6 text-muted-foreground/40" /> :
                       type === "widgets" ? <Puzzle className="h-6 w-6 text-muted-foreground/40" /> :
                       <Webhook className="h-6 w-6 text-muted-foreground/40" />}
                    </div>
                    <p className="text-xs text-muted-foreground/60 mb-1">No external {label} installed</p>
                    <p className="text-[10px] text-muted-foreground/40">
                      Install packages via npm to extend functionality
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {plugins[type].map((plugin) => (
                      <div key={plugin.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{plugin.name}</p>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">v{plugin.version}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{plugin.description}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">by {plugin.author}</p>
                        </div>
                        {plugin.homepage && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" asChild>
                            <a href={plugin.homepage} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              );
            })}
          </Tabs>

          <div className="mt-6 pt-4 border-t">
            <h4 className="text-xs font-medium mb-2">Installing Plugins</h4>
            <div className="space-y-2 text-[10px] text-muted-foreground/60">
              <p>DBoard supports three types of plugins:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Adapter plugins</strong> — Add new database drivers. Package pattern: <code className="bg-muted px-1 rounded">@dboard/adapter-*</code> or <code className="bg-muted px-1 rounded">dboard-adapter-*</code></li>
                <li><strong>Widget plugins</strong> — Add new chart/visualization types. Package pattern: <code className="bg-muted px-1 rounded">@dboard/widget-*</code> or <code className="bg-muted px-1 rounded">dboard-widget-*</code></li>
                <li><strong>Webhook plugins</strong> — Add new webhook action handlers. Package pattern: <code className="bg-muted px-1 rounded">@dboard/webhook-*</code> or <code className="bg-muted px-1 rounded">dboard-webhook-*</code></li>
              </ul>
              <p className="mt-2">External plugins are auto-discovered at startup. Install via npm:</p>
              <pre className="bg-muted rounded-lg p-2 font-mono text-[10px] mt-1">npm install @dboard/adapter-clickhouse</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
