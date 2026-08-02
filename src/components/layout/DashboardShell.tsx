"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { ShortcutsHelp } from "@/components/shared/ShortcutsHelp";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1366px)");
    if (mq.matches) setSidebarCollapsed(true);
    const handler = (e: MediaQueryListEvent) => setSidebarCollapsed(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

    // Cmd+K / Ctrl+K — command palette
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setCmdOpen((prev) => !prev);
      return;
    }

    // ? — shortcuts help (only when not in input)
    if (e.key === "?" && !isInput) {
      e.preventDefault();
      setShortcutsOpen(true);
      return;
    }

    // Escape — close any open dialog
    if (e.key === "Escape") {
      setPendingKey(null);
      return;
    }

    // N — new dashboard (only when not in input)
    if (e.key === "n" && !isInput && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      router.push("/dashboards");
      return;
    }

    // Two-key sequences: G+D, G+A, G+C, G+S
    if (!isInput && !e.metaKey && !e.ctrlKey) {
      if (pendingKey === "g") {
        e.preventDefault();
        setPendingKey(null);
        switch (e.key.toLowerCase()) {
          case "d": router.push("/dashboards"); break;
          case "a": router.push("/admin-pages"); break;
          case "c": router.push("/connections"); break;
          case "s": router.push("/settings"); break;
        }
        return;
      }
      if (e.key === "g") {
        e.preventDefault();
        setPendingKey("g");
        setTimeout(() => setPendingKey(null), 1500);
        return;
      }
    }
  }, [router, pendingKey]);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenCommandPalette={() => setCmdOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          <div className="w-full max-w-[1560px] mx-auto px-4 sm:px-5 lg:px-6 py-4 sm:py-5 min-h-0">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {pendingKey === "g" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-lg bg-background/90 border shadow-lg text-xs text-muted-foreground/70 animate-fade-in">
          Press <kbd className="mx-1 px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">D</kbd>
          <kbd className="mx-1 px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">A</kbd>
          <kbd className="mx-1 px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">C</kbd>
          <kbd className="mx-1 px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">S</kbd>
          to navigate
        </div>
      )}
    </div>
  );
}
