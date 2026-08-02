"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { useState, useMemo } from "react";
import {
  ArrowLeft, Shield, Database,
  Plus, Pencil, Trash2, Share2, Settings, Activity,
  Download, RefreshCw, Clock, User, Globe,
  ChevronDown, ChevronUp, Search, Calendar,
} from "lucide-react";

const ACTION_ICONS: Record<string, typeof Database> = {
  "row.created": Plus,
  "row.updated": Pencil,
  "row.deleted": Trash2,
  "connection.shared": Share2,
  "schema.updated": Settings,
};

const ACTION_COLORS: Record<string, string> = {
  "row.created": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "row.updated": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "row.deleted": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  "connection.shared": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  "schema.updated": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

const ACTION_BG: Record<string, string> = {
  "row.created": "from-emerald-500 to-emerald-600",
  "row.updated": "from-blue-500 to-blue-600",
  "row.deleted": "from-red-500 to-red-600",
  "connection.shared": "from-purple-500 to-purple-600",
  "schema.updated": "from-amber-500 to-amber-600",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AuditLogsSettingsPage() {
  const { data: logs, isLoading, refetch } = useAuditLogs();
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      const matchesFilter = filter === "all" || log.action === filter;
      const matchesSearch = searchQuery === "" || 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesFilter && matchesSearch;
    });
  }, [logs, filter, searchQuery]);

  const actionCounts = useMemo(() => {
    if (!logs) return {};
    return logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [logs]);

  const stats = useMemo(() => {
    if (!logs) return { total: 0, today: 0, uniqueUsers: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter(l => new Date(l.createdAt) >= today);
    const uniqueUsers = new Set(logs.map(l => l.user?.email).filter(Boolean)).size;
    return { total: logs.length, today: todayLogs.length, uniqueUsers };
  }, [logs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track and monitor all activity across your connections"
        icon={<Shield className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Audit Logs" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Events</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Today</p>
                <p className="text-2xl font-bold mt-1">{stats.today}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Users</p>
                <p className="text-2xl font-bold mt-1">{stats.uniqueUsers}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setFilter("all")}
              >
                All
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                  {logs?.length ?? 0}
                </Badge>
              </Button>
              {Object.entries(actionCounts).map(([action, count]) => (
                <Button
                  key={action}
                  variant={filter === action ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setFilter(action)}
                >
                  {action.split(".")[1]}
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                    {count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Timeline */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Activity Timeline
            </span>
            <Badge variant="secondary" className="text-xs font-normal">
              {filteredLogs.length} events
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4 py-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium mb-1">No activity found</p>
              <p className="text-xs text-muted-foreground/60 max-w-sm">
                {searchQuery ? "Try adjusting your search query" : "Activity will appear here as you use the platform"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, idx) => {
                const Icon = ACTION_ICONS[log.action] || Database;
                const colorClass = ACTION_COLORS[log.action] || "bg-muted/50 text-muted-foreground border-border";
                const bgGradient = ACTION_BG[log.action] || "from-muted-foreground to-muted-foreground";
                const isExpanded = expandedLog === log.id;
                
                return (
                  <div
                    key={log.id}
                    className="group relative rounded-xl border bg-card/50 hover:bg-accent/30 transition-all duration-150 overflow-hidden"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    <div className="flex items-start gap-4 p-4">
                      {/* Action Icon */}
                      <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold capitalize">
                            {log.action.replace(".", " ")}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-2 py-0 h-5 ${colorClass}`}
                          >
                            {log.action.split(".")[0]}
                          </Badge>
                        </div>
                        
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {log.details}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground/70">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.user?.email || "system"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(log.createdAt)}
                          </span>
                          {log.ip && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {log.ip}
                            </span>
                          )}
                          {log.connectionId && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-mono">
                              {log.connectionId.slice(0, 8)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Expand Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-border/50">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
                          <div>
                            <span className="text-muted-foreground/60 block mb-1">Event ID</span>
                            <span className="font-mono text-foreground">{log.id.slice(0, 12)}...</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/60 block mb-1">Timestamp</span>
                            <span className="text-foreground">{new Date(log.createdAt).toISOString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/60 block mb-1">Connection</span>
                            <span className="font-mono text-foreground">{log.connectionId || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/60 block mb-1">IP Address</span>
                            <span className="font-mono text-foreground">{log.ip || "N/A"}</span>
                          </div>
                        </div>
                        {log.details && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider block mb-1">Details</span>
                            <p className="text-xs text-foreground/80">{log.details}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
