"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database, LayoutDashboard, Settings, Share2, Trash2, Plus, Pencil, Activity,
} from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  ip: string | null;
  dashboardId: string | null;
  connectionId: string;
  createdAt: string;
  connection: { id: string; name: string } | null;
  user: { id: string; email: string; name: string | null } | null;
}

const ACTION_ICONS: Record<string, typeof Database> = {
  "row.created": Plus,
  "row.updated": Pencil,
  "row.deleted": Trash2,
  "connection.shared": Share2,
  "dashboard.created": LayoutDashboard,
  "schema.updated": Settings,
};

const ACTION_COLORS: Record<string, string> = {
  "row.created": "text-green-500 bg-green-500/10",
  "row.updated": "text-blue-500 bg-blue-500/10",
  "row.deleted": "text-destructive bg-destructive/10",
  "connection.shared": "text-purple-500 bg-purple-500/10",
  "dashboard.created": "text-primary bg-primary/10",
  "schema.updated": "text-orange-500 bg-orange-500/10",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface ActivityFeedProps {
  limit?: number;
  className?: string;
}

export function ActivityFeed({ limit = 20, className }: ActivityFeedProps) {
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["activity", limit],
    queryFn: async () => {
      const res = await fetch(`/api/activity?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground/50">No activity yet</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {logs.map((log) => {
        const Icon = ACTION_ICONS[log.action] || Database;
        const colorClass = ACTION_COLORS[log.action] || "text-muted-foreground bg-muted/50";
        return (
          <div
            key={log.id}
            className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-relaxed">
                <span className="font-medium">{log.action.replace(".", " ")}</span>
                {log.details && (
                  <span className="text-muted-foreground/60"> — {log.details}</span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {log.connection && (
                  <span className="text-[10px] text-muted-foreground/50">{log.connection.name}</span>
                )}
                <span className="text-[10px] text-muted-foreground/40">{timeAgo(log.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
