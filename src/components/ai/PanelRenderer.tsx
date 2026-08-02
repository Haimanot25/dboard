"use client";

import { useState, useCallback, useEffect } from "react";
import { useTableData, useCreateRow, useUpdateRow, useDeleteRow, useBulkDeleteRows } from "@/hooks/use-table-data";
import { DataGrid, RowFormModal, BulkActions } from "@/components/data-grid";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/shared/FilterBar";
import { Plus, Table2 } from "lucide-react";
import { toast } from "sonner";
import type { PanelConfig } from "@/lib/ai/generate";

interface PanelRendererProps {
  config: PanelConfig;
  connectionId: string;
}

export function PanelRenderer({ config, connectionId }: PanelRendererProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config.pageSize || 25);
  const [sortBy, setSortBy] = useState<string | undefined>(config.defaultSort?.column);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(config.defaultSort?.direction || "desc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useTableData({
    connectionId,
    table: config.table,
    page,
    pageSize,
    sortBy,
    sortDir,
    search: debouncedSearch,
  });

  const canCreate = config.actions.includes("create");
  const canEdit = config.actions.includes("edit");
  const canDelete = config.actions.includes("delete");
  const readOnly = !canCreate && !canEdit && !canDelete;

  const createMutation = useCreateRow(connectionId, config.table);
  const updateMutation = useUpdateRow(connectionId, config.table);
  const deleteMutation = useDeleteRow(connectionId, config.table);
  const bulkDeleteMutation = useBulkDeleteRows(connectionId, config.table);

  const handleCreate = useCallback(async (formData: Record<string, unknown>) => {
    try {
      await createMutation.mutateAsync(formData);
      setShowCreateModal(false);
      toast.success("Row created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    }
  }, [createMutation]);

  const handleEdit = useCallback(async (formData: Record<string, unknown>) => {
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
  }, [editRow, data, updateMutation]);

  const handleDelete = useCallback(async (pk: string) => {
    try {
      await deleteMutation.mutateAsync(pk);
      toast.success("Row deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }, [deleteMutation]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedRowIds.length === 0) return;
    try {
      await bulkDeleteMutation.mutateAsync(selectedRowIds);
      setSelectedRowIds([]);
      toast.success(`Deleted ${selectedRowIds.length} row(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }, [selectedRowIds, bulkDeleteMutation]);

  return (
    <div className="space-y-4">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
            <Table2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{config.title}</h2>
            <p className="text-xs text-muted-foreground/60">{config.table}</p>
          </div>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Row
          </Button>
        )}
      </div>

      {/* Filters + Search */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${config.table}...`}
        filters={activeFilters.map((f) => ({
          id: f,
          label: f,
          value: "active",
          onRemove: (id) => setActiveFilters((prev) => prev.filter((x) => x !== id)),
        }))}
        onClearAll={() => setActiveFilters([])}
      />

      <BulkActions
        selectedCount={selectedRowIds.length}
        onBulkDelete={handleBulkDelete}
        isDeleting={bulkDeleteMutation.isPending}
      />

      {/* Data grid */}
      <DataGrid
        data={data?.data ?? []}
        columns={data?.columns ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? page}
        pageSize={data?.pageSize ?? pageSize}
        totalPages={data?.totalPages ?? 0}
        sortBy={sortBy}
        sortDir={sortDir}
        isLoading={isLoading}
        onSortChange={(col, dir) => { setSortBy(col); setSortDir(dir); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        onCellEdit={!readOnly ? async (pk, column, value) => {
          try {
            await updateMutation.mutateAsync({ pk, data: { [column]: value } });
            toast.success("Cell updated");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Update failed");
          }
        } : undefined}
        onRowEdit={!readOnly && canEdit ? (row) => setEditRow(row) : undefined}
        onRowDelete={!readOnly && canDelete ? handleDelete : undefined}
        connectionId={connectionId}
        readOnly={readOnly}
      />

      <RowFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        columns={data?.columns ?? []}
        title={`Add Row to ${config.table}`}
        isSubmitting={createMutation.isPending}
        connectionId={connectionId}
      />

      <RowFormModal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        onSubmit={handleEdit}
        columns={data?.columns ?? []}
        initialData={editRow ?? undefined}
        title={`Edit Row in ${config.table}`}
        isSubmitting={updateMutation.isPending}
        connectionId={connectionId}
      />
    </div>
  );
}
