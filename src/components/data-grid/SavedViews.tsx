"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSavedViews, useSaveView, useDeleteView } from "@/hooks/use-saved-views";
import { Bookmark, Check, Loader2, Plus, Trash2 } from "lucide-react";

interface SavedViewsProps {
  connectionId: string;
  tableName: string;
  currentConfig: Record<string, unknown>;
  onLoadView: (config: Record<string, unknown>) => void;
}

export function SavedViews({ connectionId, tableName, currentConfig, onLoadView }: SavedViewsProps) {
  const { data: views, isLoading } = useSavedViews(connectionId, tableName);
  const saveMutation = useSaveView(connectionId);
  const deleteMutation = useDeleteView(connectionId);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleteViewId, setDeleteViewId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    await saveMutation.mutateAsync({ name, tableName, config: currentConfig });
    setName("");
    setShowNew(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          {saved ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Bookmark className="h-3.5 w-3.5" />}
          {saved ? "Saved" : "Views"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {views && views.length > 0 && (
          <>
            {views.map((view) => {
              const config = JSON.parse(view.config);
              return (
                <DropdownMenuItem
                  key={view.id}
                  className="flex items-center justify-between"
                  onClick={() => onLoadView(config)}
                >
                  <span className="text-xs truncate">{view.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-2 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteViewId(view.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive/70" />
                  </Button>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
          </>
        )}
        {isLoading ? (
          <div className="px-2 py-3 text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : !showNew ? (
          <DropdownMenuItem onClick={() => setShowNew(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            <span className="text-xs">Save Current View</span>
          </DropdownMenuItem>
        ) : (
          <div className="p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="View name..."
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setShowNew(false);
              }}
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleSave} disabled={!name.trim()}>
                Save
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <ConfirmDialog
      open={!!deleteViewId}
      onOpenChange={(open) => { if (!open) setDeleteViewId(null); }}
      title="Delete view"
      description="Are you sure you want to delete this saved view?"
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={() => {
        if (deleteViewId) {
          deleteMutation.mutate(deleteViewId);
          setDeleteViewId(null);
        }
      }}
    />
    </>
  );
}
