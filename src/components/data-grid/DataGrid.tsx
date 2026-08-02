"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
  Copy,
  Check,
  Table2,
} from "lucide-react";
import type { ColumnMeta } from "@/lib/crud/query-builder";
import { InlineEditCell } from "./InlineEditCell";
import { CellRenderer } from "./CellRenderer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface DataGridProps {
  data: Record<string, unknown>[];
  columns: ColumnMeta[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  isLoading?: boolean;
  onSortChange?: (sortBy: string, sortDir: "asc" | "desc") => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onCellEdit?: (pk: string, column: string, value: unknown) => void;
  onRowEdit?: (row: Record<string, unknown>) => void;
  onRowDelete?: (pk: string) => void;
  onRowClick?: (row: Record<string, unknown>) => void;
  connectionId?: string;
  readOnly?: boolean;
}

export function DataGrid({
  data,
  columns,
  total,
  page,
  pageSize,
  totalPages,
  sortBy,
  sortDir,
  isLoading,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onCellEdit,
  onRowEdit,
  onRowDelete,
  onRowClick,
  connectionId,
  readOnly = false,
}: DataGridProps) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [pageInput, setPageInput] = useState(String(page));
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const pkColumn = useMemo(() => columns.find((c) => c.isPrimaryKey), [columns]);

  const getRowPk = useCallback(
    (row: Record<string, unknown>) => {
      return pkColumn ? String(row[pkColumn.name]) : "";
    },
    [pkColumn]
  );

  const handleCopyCell = useCallback(async (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    try {
      await navigator.clipboard.writeText(str);
      setCopiedCell(str);
      setTimeout(() => setCopiedCell(null), 1500);
    } catch (err) {
      console.error("Failed to copy cell value:", err);
    }
  }, []);

  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    const cols: ColumnDef<Record<string, unknown>>[] = [];

    // Row number column
    cols.push({
      id: "_rowNum",
      header: () => <span className="text-[10px] font-medium text-muted-foreground/50">#</span>,
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground/40 tabular-nums px-1">
          {(page - 1) * pageSize + row.index + 1}
        </span>
      ),
      size: 36,
      enableSorting: false,
      enableHiding: false,
    });

    if (!readOnly) {
      cols.push({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="scale-75"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="scale-75"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      });
    }

    for (const col of columns) {
      cols.push({
        accessorKey: col.name,
        header: () => {
          const isSorted = sortBy === col.name;
          const canSort = !["text", "json", "jsonb", "geometry", "bytea"].includes(col.dataType);
          return (
            <button
              className={cn(
                "flex items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-widest",
                canSort && "cursor-pointer hover:text-foreground"
              )}
              onClick={() => {
                if (!canSort || !onSortChange) return;
                if (isSorted) {
                  onSortChange(col.name, sortDir === "asc" ? "desc" : "asc");
                } else {
                  onSortChange(col.name, "asc");
                }
              }}
            >
              <span className="truncate">{col.name}</span>
              {canSort && (
                <span className="ml-0.5 shrink-0">
                  {isSorted && sortDir === "asc" ? (
                    <ArrowUp className="h-3 w-3 text-primary" />
                  ) : isSorted && sortDir === "desc" ? (
                    <ArrowDown className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60" />
                  )}
                </span>
              )}
              {col.isPrimaryKey && (
                <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0 font-mono leading-none">
                  PK
                </Badge>
              )}
              {col.isForeignKey && (
                <Badge variant="outline" className="ml-1.5 text-[9px] px-1 py-0 font-mono leading-none text-muted-foreground/60">
                  FK
                </Badge>
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          const original = row.original;
          const pk = getRowPk(original);
          const cellValue = original[col.name];
          const isEditing =
            editingCell?.rowId === pk && editingCell?.colId === col.name;
          if (isEditing && onCellEdit && !col.isPrimaryKey && !readOnly) {
            return (
              <InlineEditCell
                value={cellValue}
                column={col}
                onSave={(newValue) => {
                  onCellEdit(pk, col.name, newValue);
                  setEditingCell(null);
                }}
                onCancel={() => setEditingCell(null)}
              />
            );
          }

          return (
            <div
              className={cn(
                "min-h-[32px] flex items-center px-3 py-1 text-sm group/cell relative",
                !col.isPrimaryKey && !readOnly && !col.readOnly &&
                  "cursor-pointer hover:bg-muted/40 rounded-sm"
              )}
              onDoubleClick={() => {
                if (!col.isPrimaryKey && !readOnly && !col.readOnly) {
                  setEditingCell({ rowId: pk, colId: col.name });
                }
              }}
            >
              <CellRenderer
                value={cellValue}
                column={col}
                connectionId={connectionId}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCell(cellValue);
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted-foreground/10"
                title="Copy cell value"
              >
                {copiedCell === String(cellValue) ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground/40" />
                )}
              </button>
            </div>
          );
        },
        size: Math.max(130, col.name.length * 7 + 80),
      });
    }

    if (!readOnly && (onRowEdit || onRowDelete)) {
      cols.push({
        id: "actions",
        header: () => <span className="text-[11px] font-semibold uppercase tracking-widest">Actions</span>,
        cell: ({ row }) => {
          const pk = getRowPk(row.original);
          return (
            <div className="flex items-center gap-1 px-2 opacity-70 hover:opacity-100 transition-opacity">
              {onRowEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowEdit(row.original);
                  }}
                  title="Edit row"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onRowDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/70 hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                      title="Delete row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this row?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The row will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowDelete(pk);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        },
        size: 80,
        enableSorting: false,
        enableHiding: false,
      });
    }

    return cols;
  }, [
    columns, sortBy, sortDir, onSortChange, onCellEdit, onRowEdit, onRowDelete,
    editingCell, getRowPk, connectionId, readOnly, page, pageSize, copiedCell, handleCopyCell,
  ]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: !readOnly,
  });

  const selectedRows = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const handlePageJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const p = parseInt(pageInput, 10);
      if (p >= 1 && p <= totalPages) {
        onPageChange?.(p);
      }
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Table Container */}
      <div
        ref={tableRef}
        className="border rounded-xl overflow-hidden bg-card shadow-elevated"
      >
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-gradient-to-r from-muted/90 via-muted/70 to-muted/90 backdrop-blur-sm">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-10 px-3 text-left align-middle font-medium text-muted-foreground"
                      style={{ width: header.getSize(), minWidth: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())
                      }
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-border/50">
                    {tableColumns.map((_, ci) => (
                      <td key={ci} className="px-3 py-2">
                        <div
                          className="shimmer h-4"
                          style={{ width: `${50 + Math.random() * 40}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumns.length}
                    className="h-40 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Table2 className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm text-muted-foreground/60">No rows found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/40 transition-colors",
                      idx % 2 === 1 ? "bg-muted/15" : "bg-card",
                      row.getIsSelected() && "bg-primary/5",
                      "hover:bg-muted/40"
                    )}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button, input, a")) return;
                      onRowClick?.(row.original);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-0 py-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="text-xs">
            {selectedRows.length > 0 ? (
              <span className="text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md">{selectedRows.length} selected</span>
            ) : (
              <span className="tabular-nums">{total.toLocaleString()} row{total !== 1 ? "s" : ""}</span>
            )}
          </span>
          <div className="h-3 w-px bg-border/50" />
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="h-7 text-xs border rounded-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            {[10, 25, 50, 100].map((s) => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange?.(1)}
            disabled={page <= 1}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <div className="flex items-center gap-1 px-3 py-1 rounded-md bg-muted/30 mx-1">
            <span className="text-xs text-muted-foreground/70">Page</span>
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={handlePageJump}
              onBlur={() => setPageInput(String(page))}
              className="w-10 h-6 text-center text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
            />
            <span className="text-xs text-muted-foreground/70">
              of <span className="tabular-nums">{totalPages.toLocaleString()}</span>
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange?.(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
