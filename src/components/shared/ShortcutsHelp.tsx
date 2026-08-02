"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  { category: "Navigation", items: [
    { keys: ["G", "D"], description: "Go to Dashboards" },
    { keys: ["G", "A"], description: "Go to Admin Pages" },
    { keys: ["G", "C"], description: "Go to Connections" },
    { keys: ["G", "S"], description: "Go to Settings" },
  ]},
  { category: "Actions", items: [
    { keys: ["⌘", "K"], description: "Open command palette" },
    { keys: ["N"], description: "New dashboard" },
    { keys: ["?"], description: "Show keyboard shortcuts" },
    { keys: ["Esc"], description: "Close dialog / Cancel" },
  ]},
];

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate faster with these keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <h4 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
                {group.category}
              </h4>
              <div className="space-y-1.5">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, j) => (
                        <kbd
                          key={j}
                          className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground/70"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
