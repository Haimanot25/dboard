import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/drivers/get-adapter";
import { getIntrospectedSchema } from "@/lib/schema/cache";
import { withRateLimit } from "@/lib/with-rate-limit";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { authenticateRequest, isApiKeyRequest } from "@/lib/api-keys";
import type { SchemaConfig } from "@/types/schema";

interface ColumnMetaRow {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable: string | null;
  referencedColumn: string | null;
  isNullable?: boolean;
  defaultValue?: string | null;
  allowedValues?: string[] | null;
  readOnly?: boolean;
}

async function getTableColumns(
  connectionId: string,
  table: string
): Promise<{ columns: ColumnMetaRow[]; isView: boolean } | null> {
  const schema = await getIntrospectedSchema(connectionId);

  const tableData = schema.tables?.find((t) => t.name === table);
  if (!tableData) return null;
  const isView = tableData.type === "view";

  const readOnlyMap = new Map<string, boolean>();
  try {
    const sc = await prisma.schemaConfig.findUnique({ where: { connectionId } });
    if (sc) {
      const parsed: SchemaConfig = JSON.parse(sc.config);
      const tableConfig = parsed.tables?.find((t) => t.name === table);
      if (tableConfig?.columns) {
        for (const col of tableConfig.columns) {
          if (col.readOnly) readOnlyMap.set(col.name, true);
        }
      }
    }
  } catch (e) {
    console.error("Failed to load schema config:", e);
  }

  const columns: ColumnMetaRow[] = tableData.columns.map((c) => ({
    name: c.name,
    dataType: c.dataType,
    isPrimaryKey: c.isPrimaryKey,
    isForeignKey: c.isForeignKey || false,
    referencedTable: c.referencedTable || null,
    referencedColumn: c.referencedColumn || null,
    isNullable: c.nullable ?? true,
    defaultValue: c.defaultValue ?? null,
    allowedValues: c.allowedValues ?? null,
    readOnly: readOnlyMap.get(c.name) || false,
  }));

  return { columns, isView };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { connectionId: string; table: string } }
) {
  const rl = withRateLimit(req);
  if (rl) return rl;

  const auth = await authenticateRequest(req, params.connectionId, "read");
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });
  }

  try {
    const result = await getTableColumns(params.connectionId, params.table);
    if (!result) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const { columns, isView } = result;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10) || 25), 1000);
    const sortBy = url.searchParams.get("sortBy") || undefined;
    const sortDir = (url.searchParams.get("sortDir") as "asc" | "desc") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const cursor = url.searchParams.get("cursor") || undefined;

    const filters: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      if (!["page", "pageSize", "sortBy", "sortDir", "search", "cursor"].includes(key) && !key.startsWith("$")) {
        filters[key] = value;
      }
    });

    const adapter = await getAdapter(params.connectionId);
    const listResult = await adapter.list(params.table, {
      page, pageSize, sortBy, sortDir, search, cursor,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    }, columns);

    return NextResponse.json({
      ...listResult,
      columns,
      tableName: params.table,
      isView,
    });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string; table: string } }
) {
  if (!isApiKeyRequest(req) && !validateCsrf(req)) return csrfError();

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
  if (rl) return rl;

  const auth = await authenticateRequest(req, params.connectionId, "write");
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error || "Access denied or connection is read-only" }, { status: auth.error === "Unauthorized" ? 401 : 403 });
  }
  const userId = auth.userId;

  try {
    const result = await getTableColumns(params.connectionId, params.table);
    if (!result) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const { columns, isView } = result;
    if (isView) {
      return NextResponse.json(
        { error: `"${params.table}" is a view and cannot accept inserts` },
        { status: 400 }
      );
    }
    const body = await req.json();

    for (const col of columns) {
      if (col.allowedValues && col.allowedValues.length > 0) {
        const val = body[col.name];
        if (val !== undefined && val !== null && val !== "" && !col.allowedValues.includes(String(val))) {
          return NextResponse.json(
            {
              error: `Invalid value for ${col.name}: "${val}". Allowed values: ${col.allowedValues.join(", ")}`,
            },
            { status: 400 }
          );
        }
      }
    }

    const pkColumns = new Set(columns.filter((c) => c.isPrimaryKey).map((c) => c.name));
    const insertData = Object.fromEntries(
      Object.entries(body).filter(([k]) => !pkColumns.has(k))
    );

    const adapter = await getAdapter(params.connectionId);
    const insertResult = await adapter.create(params.table, insertData, columns);

    await createAuditLog({
      connectionId: params.connectionId,
      userId,
      action: "row.created",
      tableName: params.table,
      details: `Created row in ${params.table}`,
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(insertResult);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[data create] error:", error);
    return NextResponse.json({ error: `Insert failed: ${msg}` }, { status: 500 });
  }
}
