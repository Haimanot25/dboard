"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Settings,
  Moon,
  Sun,
  BarChart3,
  LayoutGrid,
  Star,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  Database,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useFavorites } from "@/hooks/use-favorites";
import { useDashboards } from "@/hooks/use-dashboards";
import { useAdminPages } from "@/hooks/use-admin-pages";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: favorites } = useFavorites();
  const { data: dashboards } = useDashboards();
  const { data: pages } = useAdminPages();
  const { theme, toggleTheme } = useTheme();

  const userInitial = session?.user?.email?.charAt(0).toUpperCase() || "U";

  const favDashboards = (favorites ?? [])
    .filter((f) => f.kind === "dashboard")
    .map((f) => ({
      id: f.targetId,
      title: dashboards?.find((d) => d.id === f.targetId)?.name || "Dashboard",
    }));
  const favPages = (favorites ?? [])
    .filter((f) => f.kind === "adminPage")
    .map((f) => ({
      id: f.targetId,
      title: pages?.find((p) => p.id === f.targetId)?.name || "Admin Page",
    }));
  const hasFavorites = favDashboards.length > 0 || favPages.length > 0;

  return (
    <aside
      className={cn(
        "border-r bg-card flex flex-col transition-all duration-300 ease-in-out relative z-20",
        "bg-gradient-to-b from-card via-card to-card/95",
        collapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]"
      )}
    >
      {/* ── Brand Header ── */}
      <div className={cn(
        "border-b border-border/50 flex items-center h-12 shrink-0",
        "justify-center"
      )}>
        <Link href="/dashboards">
          <div className="h-10 w-full px-3 flex items-center justify-center">
            <Image
              src={theme === "dark" ? "/logo/forblackbg.png" : "/logo/forwhitebg.png"}
              alt="DBoard"
              width={120}
              height={40}
              quality={100}
              unoptimized
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden", collapsed ? "p-2 space-y-1" : "p-3 space-y-0.5")}>
        {!collapsed && (
          <div className="px-3 pt-1 pb-1">
            <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.15em]">Navigation</span>
          </div>
        )}

        <NavItem
          href="/dashboards"
          icon={<BarChart3 className="h-4 w-4" />}
          label="Dashboards"
          collapsed={collapsed}
          isActive={pathname.startsWith("/dashboards")}
        />

        <NavItem
          href="/admin-pages"
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Admin Pages"
          collapsed={collapsed}
          isActive={pathname.startsWith("/admin-pages")}
        />

        <NavItem
          href="/settings"
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          collapsed={collapsed}
          isActive={pathname.startsWith("/settings")}
        />

        <NavItem
          href="/db-monitor"
          icon={<Database className="h-4 w-4" />}
          label="DB Monitor"
          collapsed={collapsed}
          isActive={pathname.startsWith("/db-monitor")}
        />

        {/* ── Favorites Section ── */}
        {!collapsed && hasFavorites && (
          <div className="px-3 pt-4 pb-1">
            <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Star className="h-3 w-3" /> Favorites
            </span>
          </div>
        )}

        {!collapsed && favDashboards.length > 0 && favDashboards.map((f) => (
          <NavItem
            key={`d-${f.id}`}
            href={`/dashboards/${f.id}`}
            icon={<BarChart3 className="h-4 w-4" />}
            label={f.title}
            collapsed={false}
            isActive={pathname === `/dashboards/${f.id}`}
            truncate
          />
        ))}

        {!collapsed && favPages.length > 0 && favPages.map((f) => (
          <NavItem
            key={`p-${f.id}`}
            href={`/admin-pages/${f.id}`}
            icon={<LayoutGrid className="h-4 w-4" />}
            label={f.title}
            isActive={pathname === `/admin-pages/${f.id}`}
            truncate
          />
        ))}

        {!collapsed && !hasFavorites && (
          <p className="px-3 pt-1 pb-1 text-[10px] text-muted-foreground/40">
            Star dashboards &amp; admin pages to pin them here.
          </p>
        )}
      </nav>

      {/* ── Bottom Section ── */}
      <div className={cn("border-t border-border/50 bg-gradient-to-t from-card/80 to-transparent", collapsed ? "p-2 space-y-2" : "px-2 py-2 space-y-1")}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary/[0.04] to-transparent border border-border/40 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 ring-1 ring-primary/20">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate leading-tight">{session?.user?.name || session?.user?.email || "User"}</p>
              <p className="text-[9px] text-muted-foreground/50 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="h-2.5 w-2.5" />
                {(session?.user as Record<string, unknown> | undefined)?.role?.toString?.() || "User"}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          {!collapsed && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start gap-2 h-8 text-xs text-muted-foreground/70 hover:text-foreground hover:bg-accent/50 rounded-lg"
                onClick={toggleTheme}
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              >
                {theme === "light" ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
                <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 rounded-lg"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                onClick={() => {
                  import("next-auth/react").then(({ signOut }) => signOut());
                }}
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {collapsed && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 mx-auto p-0 text-muted-foreground hover:text-foreground rounded-lg"
                onClick={toggleTheme}
                title={theme === "light" ? "Dark Mode" : "Light Mode"}
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 mx-auto p-0 text-muted-foreground hover:text-foreground rounded-lg"
                onClick={onToggleCollapse}
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 mx-auto p-0 text-muted-foreground hover:text-destructive rounded-lg"
                onClick={() => {
                  import("next-auth/react").then(({ signOut }) => signOut());
                }}
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

    </aside>
  );
}

/* ── Nav List Item ── */
function NavItem({
  href,
  icon,
  label,
  isActive,
  collapsed = false,
  truncate = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  collapsed?: boolean;
  truncate?: boolean;
}) {
  if (collapsed) {
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center justify-center h-9 w-9 mx-auto rounded-lg transition-all",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
        title={label}
      >
        {icon}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group border-l-2",
        isActive
          ? "bg-gradient-to-r from-primary/[0.08] to-transparent text-foreground border-l-primary"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground border-l-transparent"
      )}
    >
      <span className={cn("shrink-0", isActive && "text-primary")}>{icon}</span>
      <span className={cn("min-w-0", truncate && "truncate")}>{label}</span>
    </Link>
  );
}