"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnMeta } from "@/lib/crud/query-builder";

export interface TableDataParams {
  connectionId: string;
  table: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  filters?: Record<string, string>;
}

export interface TableDataResult {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  columns: ColumnMeta[];
  tableName: string;
  isView?: boolean;
}

function buildQueryString(params: TableDataParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.sortDir) sp.set("sortDir", params.sortDir);
  if (params.search) sp.set("search", params.search);
  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      if (v) sp.set(k, v);
    }
  }
  return sp.toString();
}

export function useTableData(params: TableDataParams) {
  const { connectionId, table, page = 1, pageSize = 25, sortBy, sortDir, search, filters } = params;

  return useQuery<TableDataResult>({
    queryKey: ["table-data", connectionId, table, { page, pageSize, sortBy, sortDir, search, filters }],
    queryFn: async () => {
      const qs = buildQueryString(params);
      const url = `/api/data/${connectionId}/${table}${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch data");
      }
      return res.json();
    },
    enabled: !!connectionId && !!table,
  });
}

export function useCreateRow(connectionId: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/data/${connectionId}/${table}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.errors) throw new Error(err.errors.map((e: { message: string }) => e.message).join(", "));
        throw new Error(err.error || "Failed to create row");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-data", connectionId, table] });
    },
  });
}

export function useUpdateRow(connectionId: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pk, data }: { pk: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/data/${connectionId}/${table}/${pk}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.errors) throw new Error(err.errors.map((e: { message: string }) => e.message).join(", "));
        throw new Error(err.error || "Failed to update row");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-data", connectionId, table] });
    },
  });
}

export function useDeleteRow(connectionId: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pk: string) => {
      const res = await fetch(`/api/data/${connectionId}/${table}/${pk}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete row");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-data", connectionId, table] });
    },
  });
}

export function useBulkDeleteRows(connectionId: string, table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`/api/data/${connectionId}/${table}/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete rows");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-data", connectionId, table] });
    },
  });
}
