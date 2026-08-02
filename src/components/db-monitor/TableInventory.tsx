"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, Table, Eye } from "lucide-react";
import type { ConnectionInfo } from "@/hooks/use-connection-info";

interface TableInventoryProps {
  data: ConnectionInfo | undefined;
  isLoading: boolean;
}

type SortKey = "name" | "rowCount" | "totalSize" | "indexCount" | "deadTuples";

export function TableInventory({ data, isLoading }: TableInventoryProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rowCount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const parseSize = (s: string): number => {
    if (!s || s === "N/A") return 0;
    const num = parseFloat(s);
    if (s.includes("GB")) return num * 1024 * 1024;
    if (s.includes("MB")) return num * 1024;
    if (s.includes("KB")) return num;
    return num;
  };

  const sorted = useMemo(() => {
    if (!data?.tables) return [];
    let tables = [...data.tables];
    if (filter) {
      tables = tables.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()));
    }
    tables.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (sortKey) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          return sortDir === "asc"
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal as string);
        case "totalSize":
          aVal = parseSize(a.totalSize);
          bVal = parseSize(b.totalSize);
          break;
        default:
          aVal = Number(a[sortKey] || 0);
          bVal = Number(b[sortKey] || 0);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return tables;
  }, [data?.tables, sortKey, sortDir, filter]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Table Inventory</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {sorted.length} tables
          </span>
        </div>
        <input
          type="text"
          placeholder="Filter tables..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-7 text-xs rounded-md border border-input bg-background px-2.5 w-48 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/30">
              {[
                { key: "name" as SortKey, label: "Name", className: "text-left" },
                { key: "rowCount" as SortKey, label: "Rows", className: "text-right" },
                { key: "totalSize" as SortKey, label: "Size", className: "text-right" },
                { key: "indexCount" as SortKey, label: "Indexes", className: "text-right" },
                { key: "deadTuples" as SortKey, label: "Dead", className: "text-right" },
              ].map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 font-medium text-muted-foreground/70 cursor-pointer hover:text-foreground select-none",
                    col.className
                  )}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground/50">
                  {filter ? "No tables match filter" : "No tables found"}
                </td>
              </tr>
            ) : (
              sorted.map((table) => (
                <tr
                  key={table.name}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {table.type === "view" ? (
                        <Eye className="h-3 w-3 text-muted-foreground/50" />
                      ) : (
                        <Table className="h-3 w-3 text-primary/60" />
                      )}
                      <span className="font-medium font-mono">{table.name}</span>
                      {table.type === "view" && (
                        <span className="text-[9px] bg-muted px-1 py-0.5 rounded text-muted-foreground">
                          VIEW
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {table.rowCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {table.totalSize}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {table.indexCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className={cn(
                      (table.deadTuples || 0) > 1000 ? "text-orange-500" : "text-muted-foreground"
                    )}>
                      {(table.deadTuples || 0).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
