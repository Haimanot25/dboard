"use client";

import { useState } from "react";
import { useConnections } from "@/hooks/use-connections";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation } from "@tanstack/react-query";
import {
  GitCompare, ArrowRight, Loader2, CheckCircle2, AlertTriangle,
  Database, Layers, Server,
} from "lucide-react";

interface DiffResult {
  onlyInSource: string[];
  onlyInTarget: string[];
  columnDiffs: Array<{ table: string; added: string[]; removed: string[] }>;
  sourceTableCount: number;
  targetTableCount: number;
}

export default function SchemaDiffPage() {
  const { data: connections } = useConnections();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");

  const diffMutation = useMutation<DiffResult, Error, { sourceConnectionId: string; targetConnectionId: string }>({
    mutationFn: async (body) => {
      const res = await fetch("/api/schema/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Diff failed");
      }
      return res.json();
    },
  });

  const result = diffMutation.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Schema Diff"
        description="Compare schemas between two database connections"
        icon={<GitCompare className="h-5 w-5" />}
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Schema Diff" }]}
      />

      {/* Connection Selector */}
      <Card className="shadow-sm border">
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Source Connection</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select source...</option>
                {connections?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex pb-2">
              <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Target Connection</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select target...</option>
                {connections?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              className="h-9 gap-1.5 w-full sm:w-auto"
              onClick={() => diffMutation.mutate({ sourceConnectionId: sourceId, targetConnectionId: targetId })}
              disabled={diffMutation.isPending || !sourceId || !targetId || sourceId === targetId}
            >
              {diffMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <GitCompare className="h-3.5 w-3.5" />
              )}
              Compare
            </Button>
          </div>
          {sourceId === targetId && sourceId && (
            <p className="text-xs text-destructive mt-2">Source and target must be different connections</p>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {diffMutation.isPending && (
        <div className="rounded-xl border bg-card p-6">
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )}

      {/* Error */}
      {diffMutation.error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{diffMutation.error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5 animate-slide-up">
          {/* Summary Metrics */}
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              title="Source Tables"
              value={result.sourceTableCount}
              icon={<Database className="h-4 w-4" />}
            />
            <MetricCard
              title="Target Tables"
              value={result.targetTableCount}
              icon={<Database className="h-4 w-4" />}
            />
          </div>

          {/* Tables only in source */}
          {result.onlyInSource.length > 0 && (
            <Card className="shadow-sm border-amber-200/50 dark:border-amber-800/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Tables only in Source ({result.onlyInSource.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {result.onlyInSource.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs font-mono border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tables only in target */}
          {result.onlyInTarget.length > 0 && (
            <Card className="shadow-sm border-blue-200/50 dark:border-blue-800/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Layers className="h-4 w-4" />
                  Tables only in Target ({result.onlyInTarget.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {result.onlyInTarget.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs font-mono border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Column diffs */}
          {result.columnDiffs.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Column Differences ({result.columnDiffs.length} tables)
              </h3>
              {result.columnDiffs.map((diff) => (
                <Card key={diff.table} className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground/60" />
                      {diff.table}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {diff.added.length > 0 && (
                      <div>
                        <p className="text-xs text-success font-medium mb-1.5">Added columns:</p>
                        <div className="flex flex-wrap gap-1">
                          {diff.added.map((c) => (
                            <Badge key={c} variant="outline" className="text-[10px] font-mono bg-green-50/50 dark:bg-green-950/20 text-success border-green-200 dark:border-green-800/50">
                              + {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {diff.removed.length > 0 && (
                      <div>
                        <p className="text-xs text-destructive font-medium mb-1.5">Removed columns:</p>
                        <div className="flex flex-wrap gap-1">
                          {diff.removed.map((c) => (
                            <Badge key={c} variant="outline" className="text-[10px] font-mono bg-red-50/50 dark:bg-red-950/20 text-destructive border-red-200 dark:border-red-800/50">
                              - {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-sm border-green-200/50 dark:border-green-800/30 bg-green-50/30 dark:bg-green-950/10">
              <CardContent className="pt-5 pb-5 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm text-success">Schemas are identical — no differences found.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
