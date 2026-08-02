"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/use-notification-preferences";
import {
  Bell, ArrowLeft, Mail, Shield, LayoutDashboard,
  Newspaper, Loader2, Check,
} from "lucide-react";

const NOTIFICATION_ITEMS = [
  { key: "emailOnShare" as const, label: "Email on share", description: "Get notified when someone shares a dashboard with you", icon: <Mail className="h-4 w-4" /> },
  { key: "emailOnAlert" as const, label: "Email on alert", description: "Get notified when a data alert is triggered", icon: <Bell className="h-4 w-4" /> },
  { key: "dashboardUpdates" as const, label: "Dashboard updates", description: "Notify when dashboards you follow are updated", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "weeklyDigest" as const, label: "Weekly digest", description: "Summary of activity and changes each week", icon: <Newspaper className="h-4 w-4" /> },
  { key: "securityAlerts" as const, label: "Security alerts", description: "Important security notifications (always recommended)", icon: <Shield className="h-4 w-4" /> },
];

export default function NotificationsSettingsPage() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const { update } = useUpdateNotificationPreferences();
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getPref = (key: string) => localPrefs[key] ?? (prefs as unknown as Record<string, boolean>)?.[key] ?? false;

  const toggle = (key: string) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: !getPref(key) }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(localPrefs);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Manage your notification preferences"
        icon={<Bell className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Notifications" },
        ]}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Settings
            </Link>
          </Button>
        }
      />

      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0 animate-pulse">
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted rounded" />
                  </div>
                  <div className="h-5 w-9 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            NOTIFICATION_ITEMS.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground/60">{item.icon}</div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground/60">{item.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(item.key)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    getPref(item.key) ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      getPref(item.key) ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                    style={{ transform: `translateX(${getPref(item.key) ? "18px" : "2px"})` }}
                  />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || !prefs}>
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="mr-1.5 h-3.5 w-3.5" /> : null}
          {saved ? "Saved" : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
