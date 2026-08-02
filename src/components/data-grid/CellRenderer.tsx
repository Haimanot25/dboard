"use client";

import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ColumnMeta } from "@/lib/crud/query-builder";

interface CellRendererProps {
  value: unknown;
  column: ColumnMeta;
  connectionId?: string;
}

export const CellRenderer = memo(function CellRenderer({ value, column, connectionId }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic text-xs">NULL</span>;
  }

  const dt = column.dataType.toLowerCase();

  if (dt === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"} className="text-xs">
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (dt === "date" || dt.startsWith("timestamp")) {
    const dateStr = formatDate(value, dt);
    return <span className="text-sm">{dateStr}</span>;
  }

  if (
    ["integer", "bigint", "smallint", "numeric", "decimal", "real", "double precision"].includes(dt)
  ) {
    const num = Number(value);
    return <span className="text-sm font-mono">{isNaN(num) ? String(value) : num.toLocaleString()}</span>;
  }

  if (dt === "json" || dt === "jsonb") {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    return <span className="text-xs font-mono text-muted-foreground truncate block max-w-[200px]">{str}</span>;
  }

  if (column.isForeignKey && column.referencedTable && connectionId) {
    return (
      <Link
        href={`/connections/${connectionId}/tables/${column.referencedTable}?filter=${column.referencedColumn || "id"}=${value}`}
        className="text-primary hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        {String(value)}
      </Link>
    );
  }

  const str = String(value);
  return (
    <span className="text-sm truncate block max-w-[300px]" title={str}>
      {str}
    </span>
  );
});

function formatDate(value: unknown, dataType: string): string {
  try {
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return String(value);
    if (dataType === "date") {
      return date.toLocaleDateString();
    }
    return date.toLocaleString();
  } catch {
    return String(value);
  }
}
