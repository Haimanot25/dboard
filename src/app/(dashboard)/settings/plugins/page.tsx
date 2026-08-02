"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { PluginManager } from "@/components/settings/PluginManager";
import { Puzzle } from "lucide-react";

export default function PluginsSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Plugins"
        description="Manage adapter, widget, and webhook plugins"
        icon={<Puzzle className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Plugins" },
        ]}
      />
      <PluginManager />
    </div>
  );
}
