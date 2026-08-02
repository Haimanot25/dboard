"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminPages, useDeleteAdminPage } from "@/hooks/use-admin-pages";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { LayoutGrid, Plus, Loader2, Trash2, ArrowRight, Database } from "lucide-react";
import type { AdminPageConfig } from "@/types";

export default function AdminPagesPage() {
  const { data: pages, isLoading } = useAdminPages();
  const deleteMutation = useDeleteAdminPage();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Pages"
        description="Build custom CRUD interfaces from your database tables"
        icon={<LayoutGrid className="h-5 w-5" />}
        breadcrumbs={[{ label: "Admin Pages" }]}
        actions={
          <Button asChild className="shadow-lg shadow-primary/20">
            <Link href="/admin-pages/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Admin Page
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pages && pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 ring-1 ring-primary/10">
            <LayoutGrid className="h-8 w-8 text-primary/60" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No admin pages yet</h2>
          <p className="text-muted-foreground/60 text-sm mb-6 max-w-sm text-center">
            Create a custom admin page to manage your data with a tailored CRUD interface.
          </p>
          <Button asChild className="shadow-lg shadow-primary/20">
            <Link href="/admin-pages/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Admin Page
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages?.map((page, idx) => {
            let tableCount = 0;
            try {
              const config: AdminPageConfig = JSON.parse(page.config);
              tableCount = config.tables?.length ?? 0;
            } catch (err) {
              console.error("Failed to parse admin page config:", err);
            }

            return (
              <div
                key={page.id}
                className="group relative rounded-xl border bg-card overflow-hidden transition-all duration-150 hover:shadow-md hover:-translate-y-px animate-slide-up h-full"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <Link href={`/admin-pages/${page.id}`} className="block">
                  <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/30" />
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold truncate">{page.name}</h3>
                        {page.description && (
                          <p className="text-xs text-muted-foreground/60 mt-0.5">{page.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground/50">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {page.connection?.name}
                        </span>
                        <span>·</span>
                        <span>{tableCount} table{tableCount !== 1 ? "s" : ""}</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDelete(page.id, page.name);
                  }}
                  className="absolute top-2 right-14 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md bg-background/80 border hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center"
                  title="Delete admin page"
                >
                  {deleting === page.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 border rounded-md">
                  <FavoriteButton kind="adminPage" targetId={page.id} className="h-7 w-7" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete admin page"
        description={`Delete admin page "${deleteTarget?.name ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            setDeleting(deleteTarget.id);
            deleteMutation.mutateAsync(deleteTarget.id).finally(() => setDeleting(null));
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
