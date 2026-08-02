"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboards, useCreateDashboard, useDeleteDashboard, useDuplicateDashboard } from "@/hooks/use-dashboards";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { GenerationDialog } from "@/components/ai/GenerationDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { useConnections } from "@/hooks/use-connections";
import {
  LayoutDashboard, Plus, Loader2, BarChart3, ArrowRight, Sparkles, Trash2, Copy,
} from "lucide-react";
import type { GenerationResult } from "@/lib/ai/generate";

export default function DashboardsPage() {
  const router = useRouter();
  const { data: dashboards, isLoading } = useDashboards();
  const { data: connections } = useConnections();
  const createMutation = useCreateDashboard();
  const deleteMutation = useDeleteDashboard();
  const duplicateMutation = useDuplicateDashboard();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showAiGen, setShowAiGen] = useState(false);
  const [selectedConnId, setSelectedConnId] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createMutation.mutateAsync({ name, description: description || undefined });
    setName("");
    setDescription("");
  };

  const handleAiApply = useCallback(async (result: GenerationResult) => {
    if (result.type !== "dashboard" || !connections?.length) return;
    const res = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: result.config.title, description: result.config.description }),
    });
    if (!res.ok) return;
    const dash = await res.json();
    const connId = selectedConnId || connections[0].id;
    for (const chart of result.config.charts) {
      await fetch(`/api/dashboards/${dash.id}/charts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: chart.title, type: chart.type, connectionId: connId, query: chart.query }),
      });
    }
    router.push(`/dashboards/${dash.id}`);
  }, [connections, selectedConnId, router]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboards"
        description="Visualize your data with custom charts"
        icon={<BarChart3 className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboards" }]}
      />

      {/* Create Form */}
      <Card className="shadow-sm border">
        <CardContent className="pt-5">
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Dashboard Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sales Overview"
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key metrics at a glance"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setShowAiGen(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Generate
              </Button>
              <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={createMutation.isPending || !name.trim()}>
                {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-48" /></CardContent>
            </Card>
          ))}
        </div>
      ) : dashboards && dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 ring-1 ring-primary/10">
            <BarChart3 className="h-10 w-10 text-primary/60" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No dashboards yet</h2>
          <p className="text-muted-foreground/60 text-sm mb-6 max-w-sm text-center">
            Create a dashboard to visualize your data with charts built from SQL queries.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dashboards?.map((db, idx) => (
            <div key={db.id} className="group relative rounded-xl border bg-card overflow-hidden transition-all duration-150 hover:shadow-md hover:-translate-y-px animate-slide-up h-full"
              style={{ animationDelay: `${idx * 30}ms` }}>
              <Link href={`/dashboards/${db.id}`} className="block">
                <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/30" />
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate">{db.name}</h3>
                      {db.description && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{db.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground/50">
                    <span>Updated {new Date(db.updatedAt).toLocaleDateString()}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  duplicateMutation.mutate(db.id);
                }}
                className="absolute top-2 right-24 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md bg-background/80 border hover:bg-accent flex items-center justify-center"
                title="Duplicate dashboard"
              >
                {duplicateMutation.isPending && duplicateMutation.variables === db.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDeleteTarget({ id: db.id, name: db.name });
                }}
                className="absolute top-2 right-14 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md bg-background/80 border hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center"
                title="Delete dashboard"
              >
                {deleteMutation.isPending && deleteMutation.variables === db.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 border rounded-md">
                <FavoriteButton kind="dashboard" targetId={db.id} className="h-7 w-7" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Generation Dialog */}
      <GenerationDialog
        open={showAiGen}
        onClose={() => { setShowAiGen(false); setSelectedConnId(""); }}
        connectionId={selectedConnId || connections?.[0]?.id || ""}
        connectionName={connections?.find((c) => c.id === (selectedConnId || connections?.[0]?.id))?.name}
        connections={connections?.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
        onConnectionChange={setSelectedConnId}
        defaultType="dashboard"
        onApply={handleAiApply}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete dashboard"
        description={`Delete dashboard "${deleteTarget?.name ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
