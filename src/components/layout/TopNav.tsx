"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  ChevronDown,
  LayoutDashboard,
  Search,
  BookOpen,
} from "lucide-react";

interface TopNavProps {
  onToggleSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  title?: string;
}

export function TopNav({ onToggleSidebar, onOpenCommandPalette, title }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  const userInitial = session?.user?.email?.charAt(0).toUpperCase() || "U";
  const userEmail = session?.user?.email || "User";

  const pageLabel = title || getPageLabel(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-12 border-b bg-background/80 backdrop-blur-xl",
        "flex items-center justify-between px-4"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-primary hidden sm:block" />
          <h2 className="text-[13px] font-semibold truncate">{pageLabel}</h2>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/docs")}
          title="Documentation"
          aria-label="Open documentation"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-[11px]">Docs</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          onClick={onOpenCommandPalette}
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-[11px]">Search</span>
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground/60 ml-1">
            ⌘K
          </kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={toggleTheme}
          title={theme === "light" ? "Dark mode" : "Light mode"}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 gap-2 px-2 hover:bg-muted"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                {userInitial}
              </div>
              <span className="text-xs font-medium hidden md:inline max-w-[120px] truncate">
                {userEmail}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground/60 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 flex flex-col gap-0.5 border-b mb-1">
              <span className="text-sm font-medium text-foreground">{session?.user?.name || userEmail}</span>
              <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
            </div>
            <DropdownMenuItem
              onSelect={() => router.push("/settings/profile")}
              className="gap-2 text-xs cursor-pointer"
            >
              <User className="h-3.5 w-3.5" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => router.push("/settings")}
              className="gap-2 text-xs cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => signOut()}
              className="gap-2 text-xs cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function getPageLabel(pathname: string): string {
  if (pathname === "/connections") return "Data Sources";
  if (pathname === "/connections/new") return "New Connection";
  if (pathname.startsWith("/connections/") && pathname.includes("/edit"))
    return "Edit Connection";
  if (pathname.startsWith("/connections/") && pathname.includes("/query"))
    return "SQL Console";
  if (pathname.startsWith("/connections/") && pathname.includes("/schema"))
    return "Schema Config";
  if (pathname.startsWith("/connections/") && pathname.includes("/settings"))
    return "Settings";
  if (pathname.startsWith("/connections/") && pathname.includes("/tables/"))
    return "Table Browser";
  if (pathname === "/dashboards") return "Dashboards";
  if (pathname.startsWith("/dashboards/")) return "Dashboard";
  if (pathname === "/admin-pages") return "Admin Pages";
  if (pathname === "/admin-pages/new") return "Create Admin Page";
  if (pathname.startsWith("/admin-pages/")) return "Admin Page";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/settings/profile") return "Profile";
  if (pathname.startsWith("/settings/ai")) return "AI Providers";
  if (pathname === "/schema-diff") return "Schema Diff";
  return "DBoard";
}