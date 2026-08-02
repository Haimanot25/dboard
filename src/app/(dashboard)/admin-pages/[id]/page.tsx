"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAdminPage } from "@/hooks/use-admin-pages";
import { useConnection } from "@/hooks/use-connections";
import {
  useTableData,
  useCreateRow,
  useUpdateRow,
  useDeleteRow,
} from "@/hooks/use-table-data";
import { DataGrid, RowFormModal } from "@/components/data-grid";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutGrid, Plus, Database, Settings, ChevronDown, ChevronRight,
  Table2, Columns,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AdminPageConfig } from "@/types";

function AdminPageTable({
  tableName,
  columns: visibleColumns,
  connectionId,
  readOnly,
}: {
  tableName: string;
  columns: string[];
  connectionId: string;
  readOnly: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useTableData({
    connectionId,
    table: tableName,
    page,
    pageSize,
    sortBy,
    sortDir,
    search: debouncedSearch,
  });
  const isView = data?.isView === true;

  const createMutation = useCreateRow(connectionId, tableName);
  const updateMutation = useUpdateRow(connectionId, tableName);
  const deleteMutation = useDeleteRow(connectionId, tableName);

  const handleSortChange = useCallback((col: string, dir: "asc" | "desc") => {
    setSortBy(col);
    setSortDir(dir);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((p: number) => setPage(p), []);

  const handlePageSizeChange = useCallback((s: number) => {
    setPageSize(s);
    setPage(1);
  }, []);

  const handleCellEdit = useCallback(
    async (pk: string, column: string, value: unknown) => {
      try {
        await updateMutation.mutateAsync({ pk, data: { [column]: value } });
        toast.success("Cell updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    },
    [updateMutation]
  );

  const handleCreate = useCallback(
    async (formData: Record<string, unknown>) => {
      try {
        await createMutation.mutateAsync(formData);
        setShowCreateModal(false);
        toast.success("Row created");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Create failed");
      }
    },
    [createMutation]
  );

  const handleEdit = useCallback(
    async (formData: Record<string, unknown>) => {
      if (!editRow) return;
      const pkCol = data?.columns?.find((c) => c.isPrimaryKey);
      if (!pkCol) return;
      const pk = String(editRow[pkCol.name]);
      try {
        await updateMutation.mutateAsync({ pk, data: formData });
        setEditRow(null);
        toast.success("Row updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    },
    [editRow, data, updateMutation]
  );

  const handleDelete = useCallback(
    async (pk: string) => {
      try {
        await deleteMutation.mutateAsync(pk);
        toast.success("Row deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [deleteMutation]
  );

  const allColumns = data?.columns ?? [];
  const filteredColumns = visibleColumns.length > 0
    ? allColumns.filter((c) => visibleColumns.includes(c.name))
    : allColumns;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tableName}...`}
            className="w-full h-8 text-xs rounded-lg border border-input bg-background px-3 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data && (
            <span className="text-xs text-muted-foreground/60">{data.total} rows</span>
          )}
          {!readOnly && !isView && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-3 w-3" />
              Add Row
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <DataGrid
        data={data?.data ?? []}
        columns={filteredColumns}
        total={data?.total ?? 0}
        page={data?.page ?? page}
        pageSize={data?.pageSize ?? pageSize}
        totalPages={data?.totalPages ?? 0}
        sortBy={sortBy}
        sortDir={sortDir}
        isLoading={isLoading}
        onSortChange={handleSortChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onCellEdit={!readOnly && !isView ? handleCellEdit : undefined}
        onRowEdit={!readOnly && !isView ? (row) => setEditRow(row) : undefined}
        onRowDelete={!readOnly && !isView ? handleDelete : undefined}
        readOnly={readOnly || isView}
      />

      <RowFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        columns={allColumns}
        visibleColumns={visibleColumns}
        title={`Add Row to ${tableName}`}
        isSubmitting={createMutation.isPending}
        connectionId={connectionId}
      />

      <RowFormModal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        onSubmit={handleEdit}
        columns={allColumns}
        visibleColumns={visibleColumns}
        initialData={editRow ?? undefined}
        title={`Edit Row in ${tableName}`}
        isSubmitting={updateMutation.isPending}
        connectionId={connectionId}
      />
    </div>
  );
}

export default function AdminPageView() {
  const params = useParams<{ id: string }>();
  const { data: adminPage, isLoading } = useAdminPage(params.id);
  const { data: connection } = useConnection(adminPage?.connectionId ?? "");
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const readOnly = connection?.readOnly || false;

  let config: AdminPageConfig = { tables: [] };
  try {
    config = JSON.parse(adminPage?.config ?? "{}");
  } catch (err) {
    console.error("Failed to parse admin page config:", err);
  }

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin Page"
          description="Loading..."
          icon={<LayoutGrid className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Admin Pages", href: "/admin-pages" },
            { label: "Loading..." },
          ]}
        />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!adminPage) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin Page"
          description="Not found"
          icon={<LayoutGrid className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Admin Pages", href: "/admin-pages" },
            { label: "Not Found" },
          ]}
        />
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Admin page not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={adminPage.name}
        description={adminPage.description || `${config.tables.length} table${config.tables.length !== 1 ? "s" : ""}`}
        icon={<LayoutGrid className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Admin Pages", href: "/admin-pages" },
          { label: adminPage.name },
        ]}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={`/admin-pages/${adminPage.id}/edit`}>
              <Settings className="h-3.5 w-3.5" />
              Edit Config
            </a>
          </Button>
        }
      />

      {/* KPI Metric Strip */}
      {config.tables.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-slide-up">
          <MetricCard
            title="Tables"
            value={config.tables.length}
            icon={<Table2 className="h-3.5 w-3.5" />}
            compact
          />
          <MetricCard
            title="Total Columns"
            value={config.tables.reduce((sum, t) => sum + t.columns.length, 0)}
            icon={<Columns className="h-3.5 w-3.5" />}
            compact
          />
          <MetricCard
            title="Connection"
            value={connection?.name || "—"}
            icon={<Database className="h-3.5 w-3.5" />}
            compact
          />
          <MetricCard
            title="Access"
            value={readOnly ? "Read Only" : "Read / Write"}
            icon={<Settings className="h-3.5 w-3.5" />}
            compact
          />
        </div>
      )}

      {config.tables.length === 0 ? (
        <Card className="shadow-sm border">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-3 ring-1 ring-primary/10">
              <LayoutGrid className="h-6 w-6 text-primary/60" />
            </div>
            <p className="text-sm font-medium mb-1">No tables configured</p>
            <p className="text-xs text-muted-foreground/60 mb-4 max-w-sm mx-auto">
              Edit this admin page to select tables and columns from your database.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {config.tables.map((tableConfig) => {
            const isExpanded = expandedTables.has(tableConfig.name);

            return (
              <Card key={tableConfig.name} className="shadow-sm overflow-hidden">
                {/* Table header — always visible, click to expand */}
                <button
                  onClick={() => toggleTable(tableConfig.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    isExpanded
                      ? "bg-primary/5 border-b"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                    <Database className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold">
                      {tableConfig.displayName || tableConfig.name}
                    </span>
                    {tableConfig.displayName && (
                      <span className="text-xs text-muted-foreground/40 ml-1">
                        ({tableConfig.name})
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/50 ml-2">
                      {tableConfig.columns.length} column{tableConfig.columns.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                </button>

                {/* DataGrid — only mounts when expanded */}
                {isExpanded && (
                  <CardContent className="pt-4 pb-4">
                    <AdminPageTable
                      tableName={tableConfig.name}
                      columns={tableConfig.columns}
                      connectionId={adminPage.connectionId}
                      readOnly={readOnly}
                    />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
