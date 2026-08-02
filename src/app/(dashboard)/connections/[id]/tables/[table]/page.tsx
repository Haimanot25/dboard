"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useConnection } from "@/hooks/use-connections";
import {
  useTableData,
  useCreateRow,
  useUpdateRow,
  useDeleteRow,
  useBulkDeleteRows,
} from "@/hooks/use-table-data";
import { DataGrid, RowFormModal, ExportButton, BulkActions, SearchInput, ImportDialog } from "@/components/data-grid";
import { SavedViews } from "@/components/data-grid/SavedViews";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusDot } from "@/components/shared/StatusDot";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowLeft, Table2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TablePage() {
  const params = useParams<{ id: string; table: string }>();
  const searchParams = useSearchParams();

  const connectionId = params.id;
  const tableName = params.table;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: connection } = useConnection(connectionId);
  const readOnly = connection?.readOnly || false;

  const { data, isLoading, error } = useTableData({
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
  const bulkDeleteMutation = useBulkDeleteRows(connectionId, tableName);

  const handleSortChange = useCallback((col: string, dir: "asc" | "desc") => {
    setSortBy(col);
    setSortDir(dir);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    setSelectedRowIds([]);
  }, []);

  const handlePageSizeChange = useCallback((s: number) => {
    setPageSize(s);
    setPage(1);
    setSelectedRowIds([]);
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

  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (filterParam) {
      const [col, val] = filterParam.split("=");
      if (col && val) {
        setSearch(val);
      }
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={tableName}
          description={connection?.name}
          icon={<Table2 className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Connections", href: "/connections" },
            { label: connection?.name || "Connection", href: `/connections/${connectionId}/schema` },
            { label: tableName },
          ]}
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive mb-4">
              Failed to load table data. Make sure the connection is active.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/connections/${connectionId}/schema`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Schema
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={tableName}
        description={connection?.name}
        icon={<Table2 className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Connections", href: "/connections" },
          { label: connection?.name || "Connection", href: `/connections/${connectionId}/schema` },
          { label: tableName },
        ]}
      />

      {/* Floating Toolbar */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${tableName}...`}
          />
          {data && (
            <StatusDot status="online" size="sm" label={`${data.total} rows`} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <SavedViews
            connectionId={connectionId}
            tableName={tableName}
            currentConfig={{ sortBy, sortDir, search, pageSize }}
            onLoadView={(config) => {
              if (config.sortBy) setSortBy(config.sortBy as string);
              if (config.sortDir) setSortDir(config.sortDir as "asc" | "desc");
              if (config.search) setSearch(config.search as string);
              if (config.pageSize) setPageSize(config.pageSize as number);
            }}
          />
          <ExportButton
            connectionId={connectionId}
            table={tableName}
            disabled={isLoading}
          />
          {!isView && <ImportDialog connectionId={connectionId} table={tableName} />}
          {!readOnly && !isView && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
          )}
        </div>
      </div>

      <BulkActions
        selectedCount={selectedRowIds.length}
        onBulkDelete={handleBulkDelete}
        isDeleting={bulkDeleteMutation.isPending}
      />

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
        onSortChange={handleSortChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onCellEdit={!readOnly && !isView ? handleCellEdit : undefined}
        onRowEdit={!readOnly && !isView ? (row) => setEditRow(row) : undefined}
        onRowDelete={!readOnly && !isView ? handleDelete : undefined}
        connectionId={connectionId}
        readOnly={readOnly || isView}
      />

      <RowFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        columns={data?.columns ?? []}
        title={`Add Row to ${tableName}`}
        isSubmitting={createMutation.isPending}
        connectionId={connectionId}
      />

      <RowFormModal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        onSubmit={handleEdit}
        columns={data?.columns ?? []}
        initialData={editRow ?? undefined}
        title={`Edit Row in ${tableName}`}
        isSubmitting={updateMutation.isPending}
        connectionId={connectionId}
      />
    </div>
  );
}
