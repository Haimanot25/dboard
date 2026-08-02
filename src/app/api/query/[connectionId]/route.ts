import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/with-rate-limit";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { getAdapter } from "@/lib/db/drivers/get-adapter";
import { isWriteQuery, isReadQuery } from "@/lib/sql-guard";
import { authenticateRequest, isApiKeyRequest } from "@/lib/api-keys";

const MAX_RESPONSE_ROWS = 10000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(v: string): boolean {
  if (!DATE_RE.test(v)) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function escapeStringLiteral(v: string): string {
  return v.replace(/'/g, "''");
}

export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  if (!isApiKeyRequest(req) && !validateCsrf(req)) return csrfError();

  const rl = withRateLimit(req);
  if (rl) return rl;

  let sql = "";
  let dateFrom = "";
  let dateTo = "";
  let dateColumn = "";
  try {
    const body = await req.json();
    sql = body?.sql ?? "";
    dateFrom = body?.dateFrom ?? "";
    dateTo = body?.dateTo ?? "";
    dateColumn = body?.dateColumn ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!sql?.trim()) {
    return NextResponse.json({ error: "SQL query required" }, { status: 400 });
  }

  // Inject date range filters only when a dateColumn is explicitly provided
  if (dateColumn && (dateFrom || dateTo) && /^\s*SELECT/i.test(sql)) {
    // Validate dateColumn against actual table columns to prevent SQL injection
    const { getIntrospectedSchema } = await import("@/lib/schema/cache");
    const schema = await getIntrospectedSchema(params.connectionId);
    const allColumns = schema.tables.flatMap((t) => t.columns.map((c) => c.name));
    const validDateColumn = allColumns.find((c) => c === dateColumn);

    if (validDateColumn) {
      const conditions: string[] = [];
      if (dateFrom && isValidDate(dateFrom)) {
        conditions.push(`${validDateColumn} >= '${escapeStringLiteral(dateFrom)}'::date`);
      }
      if (dateTo && isValidDate(dateTo)) {
        conditions.push(`${validDateColumn} <= '${escapeStringLiteral(dateTo)}'::date + interval '1 day' - interval '1 second'`);
      }

      if (conditions.length > 0) {
        const whereFragment = conditions.join(" AND ");
        if (/\bWHERE\b/i.test(sql)) {
          sql = sql.replace(/\bWHERE\b/i, (m) => `${m} ${whereFragment} AND`);
        } else {
          // Insert WHERE after first FROM table_ref (handles schema-qualified names like public.campaigns)
          sql = sql.replace(/\bFROM\b\s+(\S+)/i, (_match, tableRef: string) => `FROM ${tableRef} WHERE ${whereFragment}`);
        }
      }
    }
  }

  const upperSql = sql.trim().toUpperCase();

  const isWriteQueryFlag = isWriteQuery(upperSql);
  const isReadQueryFlag = isReadQuery(upperSql);

  const auth = await authenticateRequest(
    req,
    params.connectionId,
    isWriteQueryFlag ? "write" : "read"
  );
  if (!auth.allowed) {
    return NextResponse.json(
      { error: auth.error || (isReadQueryFlag ? "Access denied" : "Write access denied") },
      { status: auth.error === "Unauthorized" ? 401 : 403 }
    );
  }

  try {
    const adapter = await getAdapter(params.connectionId);
    const start = performance.now();
    const result = await adapter.executeRaw(sql, undefined, 30000);
    const durationMs = Math.round(performance.now() - start);

    const rawRows = Array.isArray(result?.rows) ? result.rows : [];
    const rows = rawRows.slice(0, MAX_RESPONSE_ROWS);
    const fields = Array.isArray(result?.fields) ? result.fields : [];

    const columns = fields.length
      ? fields.map((f) => String(f?.name ?? ""))
      : rows.length
        ? Object.keys(rows[0])
        : [];

    return NextResponse.json({
      columns,
      data: rows,
      rowCount: rawRows.length > MAX_RESPONSE_ROWS ? MAX_RESPONSE_ROWS : rawRows.length,
      totalRows: rawRows.length,
      truncated: rawRows.length > MAX_RESPONSE_ROWS,
      durationMs,
      isReadQuery: isReadQueryFlag,
    });
  } catch (error) {
    console.error("[query] error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
