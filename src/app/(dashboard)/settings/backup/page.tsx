"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Download, Upload, Database, Loader2,
  CheckCircle, AlertCircle, FileJson,
} from "lucide-react";
import { useDashboards } from "@/hooks/use-dashboards";
import { useConnections } from "@/hooks/use-connections";

export default function BackupSettingsPage() {
  const { data: dashboards } = useDashboards();
  const { data: connections } = useConnections();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Fetch all dashboards in parallel
      const dashResults = await Promise.all(
        (dashboards ?? []).map(async (dash) => {
          const res = await fetch(`/api/dashboards/${dash.id}`);
          return res.ok ? res.json() : null;
        })
      );
      const dashData = dashResults.filter(Boolean);

      const exportObj = {
        version: 1,
        exportedAt: new Date().toISOString(),
        dashboards: dashData,
        connections: connections?.map((c) => ({
          name: c.name,
          type: c.type,
          host: c.host,
          port: c.port,
          database: c.database,
          username: c.username,
          readOnly: c.readOnly,
        })) ?? [],
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dboard-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [dashboards, connections]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.dashboards || !Array.isArray(data.dashboards)) {
        setImportResult({ success: false, message: "Invalid backup file format" });
        return;
      }
      let imported = 0;
      for (const dash of data.dashboards) {
        const res = await fetch("/api/dashboards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: dash.name + " (Imported)", description: dash.description }),
        });
        if (res.ok) {
          const newDash = await res.json();
          for (const chart of dash.charts ?? []) {
            await fetch(`/api/dashboards/${newDash.id}/charts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: chart.title,
                type: chart.type,
                connectionId: chart.connectionId,
                query: chart.query,
              }),
            });
          }
          imported++;
        }
      }
      setImportResult({ success: true, message: `Imported ${imported} dashboards successfully` });
    } catch {
      setImportResult({ success: false, message: "Failed to parse backup file" });
    } finally {
      setImporting(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup & Restore"
        description="Export and import your dashboards configuration"
        icon={<Database className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Backup" },
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

      <div className="grid gap-4 md:grid-cols-2">
        {/* Export */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Export Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground/60">
              Export all dashboards and their charts as a JSON backup file.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{dashboards?.length ?? 0} dashboards</Badge>
              <Badge variant="secondary">{connections?.length ?? 0} connections</Badge>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleExport}
              disabled={exporting || !dashboards?.length}
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exporting ? "Exporting..." : "Export JSON"}
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Import Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground/60">
              Import dashboards from a previously exported JSON backup file.
            </p>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer hover:bg-accent transition-colors">
                {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
                {importing ? "Importing..." : "Choose File"}
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                  disabled={importing}
                />
              </label>
            </div>
            {importResult && (
              <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${importResult.success ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
                {importResult.success ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {importResult.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
