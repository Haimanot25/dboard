"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  BarChart3, LayoutGrid, Settings, Database, Search,
  Plus, Moon, Sun, User, LayoutDashboard,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useDashboards } from "@/hooks/use-dashboards";
import { useAdminPages } from "@/hooks/use-admin-pages";
import { useConnections } from "@/hooks/use-connections";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { data: dashboards } = useDashboards();
  const { data: pages } = useAdminPages();
  const { data: connections } = useConnections();
  const [search, setSearch] = useState("");

  const runAction = useCallback((action: () => void) => {
    onOpenChange(false);
    setSearch("");
    action();
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-lg gap-0 overflow-hidden mx-4">
        <Command
          value={search}
          onValueChange={setSearch}
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Search dashboards, pages, connections..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 pl-2 text-sm outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60 sm:flex">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground/50">
              No results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="text-xs text-muted-foreground/50 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              <CommandItem
                icon={<Plus className="h-4 w-4" />}
                label="New Dashboard"
                shortcut="N"
                onSelect={() => runAction(() => router.push("/dashboards"))}
              />
              <CommandItem
                icon={<Database className="h-4 w-4" />}
                label="New Connection"
                onSelect={() => runAction(() => router.push("/connections/new"))}
              />
              <CommandItem
                icon={<LayoutGrid className="h-4 w-4" />}
                label="New Admin Page"
                onSelect={() => runAction(() => router.push("/admin-pages/new"))}
              />
              <CommandItem
                icon={theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                onSelect={() => runAction(toggleTheme)}
              />
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="text-xs text-muted-foreground/50 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              <CommandItem
                icon={<BarChart3 className="h-4 w-4" />}
                label="Dashboards"
                onSelect={() => runAction(() => router.push("/dashboards"))}
              />
              <CommandItem
                icon={<LayoutGrid className="h-4 w-4" />}
                label="Admin Pages"
                onSelect={() => runAction(() => router.push("/admin-pages"))}
              />
              <CommandItem
                icon={<Database className="h-4 w-4" />}
                label="Data Sources"
                onSelect={() => runAction(() => router.push("/connections"))}
              />
              <CommandItem
                icon={<Settings className="h-4 w-4" />}
                label="Settings"
                onSelect={() => runAction(() => router.push("/settings"))}
              />
              <CommandItem
                icon={<User className="h-4 w-4" />}
                label="Profile"
                onSelect={() => runAction(() => router.push("/settings/profile"))}
              />
            </Command.Group>

            {/* Dashboards */}
            {dashboards && dashboards.length > 0 && (
              <Command.Group heading="Dashboards" className="text-xs text-muted-foreground/50 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {dashboards.slice(0, 8).map((d) => (
                  <CommandItem
                    key={d.id}
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    label={d.name}
                    onSelect={() => runAction(() => router.push(`/dashboards/${d.id}`))}
                  />
                ))}
              </Command.Group>
            )}

            {/* Admin Pages */}
            {pages && pages.length > 0 && (
              <Command.Group heading="Admin Pages" className="text-xs text-muted-foreground/50 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {pages.slice(0, 8).map((p) => (
                  <CommandItem
                    key={p.id}
                    icon={<LayoutGrid className="h-4 w-4" />}
                    label={p.name}
                    onSelect={() => runAction(() => router.push(`/admin-pages/${p.id}`))}
                  />
                ))}
              </Command.Group>
            )}

            {/* Connections */}
            {connections && connections.length > 0 && (
              <Command.Group heading="Data Sources" className="text-xs text-muted-foreground/50 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {connections.slice(0, 8).map((c) => (
                  <CommandItem
                    key={c.id}
                    icon={<Database className="h-4 w-4" />}
                    label={c.name}
                    description={`${c.type} · ${c.host}:${c.port}`}
                    onSelect={() => runAction(() => router.push(`/connections/${c.id}/schema`))}
                  />
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandItem({
  icon,
  label,
  description,
  shortcut,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
    >
      <span className="shrink-0 text-muted-foreground/70">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="block truncate">{label}</span>
        {description && (
          <span className="block text-[10px] text-muted-foreground/50 truncate">{description}</span>
        )}
      </div>
      {shortcut && (
        <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
