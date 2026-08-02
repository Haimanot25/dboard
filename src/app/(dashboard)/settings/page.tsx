"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Sparkles, GitCompare, Palette, Puzzle, Database, User, Activity, Bell, Shield, LayoutDashboard, HardDrive } from "lucide-react";
import { ActivityFeed } from "@/components/shared/ActivityFeed";

const settingsSections = [
  {
    title: "Data Sources",
    description: "Add, edit, and manage your database connections",
    icon: <Database className="h-5 w-5" />,
    href: "/connections",
    color: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "AI Providers",
    description: "Configure API keys and models for natural language generation",
    icon: <Sparkles className="h-5 w-5" />,
    href: "/settings/ai",
    color: "from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400",
  },
  {
    title: "Schema Diff",
    description: "Compare schemas between two database connections side by side",
    icon: <GitCompare className="h-5 w-5" />,
    href: "/schema-diff",
    color: "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Theme",
    description: "Customize colors, appearance mode, and save custom themes",
    icon: <Palette className="h-5 w-5" />,
    href: "/settings/theme",
    color: "from-pink-500/20 to-pink-500/5 text-pink-600 dark:text-pink-400",
  },
  {
    title: "Plugins",
    description: "Manage adapter, widget, and webhook plugins",
    icon: <Puzzle className="h-5 w-5" />,
    href: "/settings/plugins",
    color: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
  },
  {
    title: "Profile",
    description: "Manage your account name and sign-out options",
    icon: <User className="h-5 w-5" />,
    href: "/settings/profile",
    color: "from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-400",
  },
  {
    title: "Notifications",
    description: "Manage email and in-app notification preferences",
    icon: <Bell className="h-5 w-5" />,
    href: "/settings/notifications",
    color: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400",
  },
  {
    title: "Audit Logs",
    description: "View all activity across connections and dashboards",
    icon: <Shield className="h-5 w-5" />,
    href: "/settings/audit-logs",
    color: "from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400",
  },
  {
    title: "Templates",
    description: "Pre-built dashboard templates to get started quickly",
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: "/settings/templates",
    color: "from-teal-500/20 to-teal-500/5 text-teal-600 dark:text-teal-400",
  },
  {
    title: "Backup & Restore",
    description: "Export and import your dashboards configuration",
    icon: <HardDrive className="h-5 w-5" />,
    href: "/settings/backup",
    color: "from-violet-500/20 to-violet-500/5 text-violet-600 dark:text-violet-400",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage platform preferences and integrations"
        icon={<Settings className="h-5 w-5" />}
        breadcrumbs={[{ label: "Settings" }]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="group shadow-sm border transition-all duration-150 hover:shadow-md hover:-translate-y-px cursor-pointer h-full">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center shrink-0 ring-1 ring-border/30`}>
                    {section.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{section.title}</h3>
                    <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">{section.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Activity Feed */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed limit={15} />
        </CardContent>
      </Card>
    </div>
  );
}
