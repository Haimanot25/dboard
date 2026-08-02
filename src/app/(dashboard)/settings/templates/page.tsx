"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardTemplates, type DashboardTemplate } from "@/hooks/use-dashboard-templates";
import { useConnections } from "@/hooks/use-connections";
import {
  ArrowLeft, LayoutDashboard, Loader2, ChevronRight,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Database: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Performance: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  Business: "bg-green-500/10 text-green-600 dark:text-green-400",
};

export default function TemplatesSettingsPage() {
  const router = useRouter();
  const { data: templates, isLoading } = useDashboardTemplates();
  const { data: connections } = useConnections();
  const [creating, setCreating] = useState<string | null>(null);

  const handleUseTemplate = useCallback(async (template: DashboardTemplate) => {
    if (!connections?.length) return;
    setCreating(template.id);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: template.name, description: template.description }),
      });
      if (!res.ok) return;
      const dash = await res.json();
      const connId = connections[0].id;
      for (const chart of template.charts) {
        await fetch(`/api/dashboards/${dash.id}/charts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: chart.title, type: chart.type, connectionId: connId, query: chart.query }),
        });
      }
      router.push(`/dashboards/${dash.id}`);
    } finally {
      setCreating(null);
    }
  }, [connections, router]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Templates"
        description="Pre-built dashboard templates to get started quickly"
        icon={<LayoutDashboard className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Templates" },
        ]}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="shadow-sm border">
              <CardContent className="pt-4 pb-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map((template, idx) => (
            <Card
              key={template.id}
              className="group shadow-sm border transition-all duration-150 hover:shadow-md hover:-translate-y-px animate-slide-up"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{template.name}</h3>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{template.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${CATEGORY_COLORS[template.category] || "bg-muted text-muted-foreground"}`}>
                    {template.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">{template.charts.length} charts</span>
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => handleUseTemplate(template)}
                  disabled={!!creating || !connections?.length}
                >
                  {creating === template.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {creating === template.id ? "Creating..." : "Use Template"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
