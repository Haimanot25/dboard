"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ThemeEditor } from "@/components/settings/ThemeEditor";
import { Palette } from "lucide-react";

export default function ThemeSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Theme"
        description="Customize the look and feel of DBoard"
        icon={<Palette className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Theme" },
        ]}
      />
      <ThemeEditor />
    </div>
  );
}
