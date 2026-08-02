"use client";

import Link from "next/link";
import { useConnections, useDeleteConnection, useUpdateConnection, useConnectionHealth } from "@/hooks/use-connections";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusDot } from "@/components/shared/StatusDot";
import { GenerationDialog } from "@/components/ai/GenerationDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Plus, Trash2, Database, Loader2, Server,
  Pin, PinOff, Settings, Sparkles, PenLine,
  Search, RefreshCw, BarChart3,
  Eye, Edit, Terminal,
} from "lucide-react";
import { useState, useMemo } from "react";
import { DRIVERS } from "@/lib/db/drivers/registry";

function ConnectionCard({ conn, idx, isPinned, onTogglePin, onDelete, deleting, onRename, onGenerate }: {
  conn: { id: string; name: string; type: string; host: string; port: number; database: string; username: string; readOnly: boolean };
  idx: number;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  deleting: string | null;
  onRename: (id: string, name: string) => void;
  onGenerate: (id: string) => void;
}) {
  const { data: health } = useConnectionHealth(conn.id);
  const def = DRIVERS[conn.type] || DRIVERS.postgresql;
  const typeColor = def.color;
  const status: "online" | "offline" | "pending" = health ? (health.status === "online" ? "online" : "offline") : "pending";

  return (
    <div
      className="group relative rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-slide-up"
      style={{ animationDelay: `${idx * 40}ms` }}
    >
      {/* Top accent bar */}
      <div className={`h-1 bg-gradient-to-r ${typeColor}`} />
      
      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-3 right-3 z-10">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Pin className="h-3 w-3 text-primary" />
          </div>
        </div>
      )}
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold truncate">{conn.name}</h3>
                <StatusDot status={status} size="sm" label={health ? `${health.latencyMs ?? "?"}ms` : undefined} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                {conn.host}:{conn.port}/{conn.database}
              </p>
            </div>
          </div>
          <Badge
            variant={conn.readOnly ? "secondary" : "default"}
            className="text-[10px] px-2 py-0 font-medium h-5"
          >
            {conn.readOnly ? "Read Only" : "Read/Write"}
          </Badge>
        </div>

        {/* Type & User */}
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-gradient-to-r ${typeColor}`}>
            {def.icon}
            <span className="opacity-90">{def.label}</span>
          </span>
          <span className="text-[11px] text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
            {conn.username}@{conn.host.split(".")[0]}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" className="h-8 text-xs flex-1 gap-1.5" asChild>
            <Link href={`/connections/${conn.id}/query`}>
              <Terminal className="h-3.5 w-3.5" />
              Console
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs flex-1 gap-1.5" asChild>
            <Link href={`/connections/${conn.id}/tables`}>
              <Eye className="h-3.5 w-3.5" />
              Browse
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs flex-1 gap-1.5" asChild>
            <Link href={`/connections/${conn.id}/schema`}>
              <Settings className="h-3.5 w-3.5" />
              Config
            </Link>
          </Button>
        </div>

        {/* Hover Actions */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 pt-3 border-t border-border/50">
          <Button variant="ghost" size="sm" className="h-8 text-xs flex-1 gap-1.5" asChild>
            <Link href={`/connections/${conn.id}/edit`}>
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            onClick={() => onRename(conn.id, conn.name)}
            title="Rename"
          >
            <PenLine className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            onClick={() => onGenerate(conn.id)}
            title="Generate with AI"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => onTogglePin(conn.id)}
            title={isPinned ? "Unpin" : "Pin to top"}
          >
            {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(conn.id, conn.name)}
            disabled={deleting === conn.id}
          >
            {deleting === conn.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  const { data: connections, isLoading, error, refetch } = useConnections();
  const deleteMutation = useDeleteConnection();
  const updateMutation = useUpdateConnection();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [genDialogConn, setGenDialogConn] = useState<string | null>(null);
  const [renameConnId, setRenameConnId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const handleDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRename = async () => {
    if (!renameConnId || !renameValue.trim()) return;
    try {
      await updateMutation.mutateAsync({ id: renameConnId, name: renameValue.trim() });
      setRenameConnId(null);
      setRenameValue("");
    } catch (err) {
      console.error("Failed to rename connection:", err);
    }
  };

  const filteredConnections = useMemo(() => {
    if (!connections) return [];
    return connections
      .filter((conn) => {
        const matchesSearch = searchQuery === "" || 
          conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conn.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conn.database.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === "all" || conn.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const aPinned = pinnedIds.has(a.id) ? 0 : 1;
        const bPinned = pinnedIds.has(b.id) ? 0 : 1;
        return aPinned - bPinned;
      });
  }, [connections, pinnedIds, searchQuery, typeFilter]);

  const totalConns = connections?.length ?? 0;

  const typeCounts = connections?.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const uniqueTypes = Object.keys(typeCounts);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Sources"
        description="Manage and monitor your database connections"
        icon={<Database className="h-5 w-5" />}
        breadcrumbs={[{ label: "Data Sources" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button asChild className="shadow-lg shadow-primary/20">
              <Link href="/connections/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Connection
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {!isLoading && !error && connections && connections.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard
            title="Total Connections"
            value={totalConns}
            icon={<Database className="h-4 w-4" />}
            trend={totalConns > 0 ? "up" : "neutral"}
            trendValue={`${totalConns} active`}
          />
          <MetricCard
            title="Database Types"
            value={uniqueTypes.length}
            icon={<BarChart3 className="h-4 w-4" />}
            trendValue={`${uniqueTypes.join(", ")}`}
          />
          {Object.entries(typeCounts).slice(0, 2).map(([type, count]) => {
            const def = DRIVERS[type];
            return (
              <MetricCard
                key={type}
                title={def?.label || type}
                value={count}
                icon={<Database className="h-4 w-4" />}
                trendValue={`${count} connection${count > 1 ? 's' : ''}`}
              />
            );
          })}
        </div>
      )}

      {/* Filters */}
      {!isLoading && connections && connections.length > 0 && (
        <Card className="shadow-sm border">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={typeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setTypeFilter("all")}
                >
                  All
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                    {totalConns}
                  </Badge>
                </Button>
                {uniqueTypes.map((type) => {
                  const def = DRIVERS[type];
                  return (
                    <Button
                      key={type}
                      variant={typeFilter === type ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setTypeFilter(type)}
                    >
                      {def?.icon}
                      {def?.label || type}
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                        {typeCounts[type]}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connections Grid */}
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary/40 to-primary/20" />
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-11 h-11 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-3 w-24" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 flex-1 rounded-lg" />
                  <Skeleton className="h-8 flex-1 rounded-lg" />
                  <Skeleton className="h-8 flex-1 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot shrink-0" />
          <p className="text-sm text-destructive">Failed to load connections. Please try again.</p>
        </div>
      ) : connections && connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 animate-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5 ring-1 ring-primary/10">
            <Database className="h-10 w-10 text-primary/60" />
          </div>
          <h2 className="text-xl font-bold mb-2">No connections yet</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md text-center leading-relaxed">
            Add your first database connection to start exploring and managing your data. 
            We support PostgreSQL, MySQL, SQLite, SQL Server, and MongoDB.
          </p>
          <Button asChild className="shadow-lg shadow-primary/20" size="lg">
            <Link href="/connections/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Connection
            </Link>
          </Button>
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium mb-1">No connections match your search</p>
          <p className="text-xs text-muted-foreground/60">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredConnections.map((conn, idx) => (
            <ConnectionCard
              key={conn.id}
              conn={conn}
              idx={idx}
              isPinned={pinnedIds.has(conn.id)}
              onTogglePin={togglePin}
              onDelete={handleDelete}
              deleting={deleting}
              onRename={(id, name) => { setRenameConnId(id); setRenameValue(name); }}
              onGenerate={(id) => setGenDialogConn(id)}
            />
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      {renameConnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setRenameConnId(null)}>
          <div className="w-full max-w-sm rounded-xl border bg-card shadow-xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold">Rename Connection</h3>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenameConnId(null); }}
              className="w-full h-9 text-sm rounded-lg border border-input bg-background px-3 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRenameConnId(null)}>Cancel</Button>
              <Button size="sm" onClick={handleRename} disabled={updateMutation.isPending || !renameValue.trim()}>
                {updateMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Rename
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Dialog */}
      {genDialogConn && (
        <GenerationDialog
          open={!!genDialogConn}
          onClose={() => setGenDialogConn(null)}
          connectionId={genDialogConn}
          connectionName={connections?.find((c) => c.id === genDialogConn)?.name}
          defaultType="panel"
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete connection"
        description={`Delete connection "${deleteTarget?.name ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            setDeleting(deleteTarget.id);
            deleteMutation.mutateAsync(deleteTarget.id).finally(() => setDeleting(null));
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

// Import Card from ui components
import { Card, CardContent } from "@/components/ui/card";
