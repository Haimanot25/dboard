import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/drivers/get-adapter";
import { getIntrospectedSchema } from "@/lib/schema/cache";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";
import { createAuditLog } from "@/lib/audit";
import { authenticateRequest, isApiKeyRequest } from "@/lib/api-keys";
import type { IntrospectedColumn } from "@/types/schema";

function getPkColumn(columns: IntrospectedColumn[]): IntrospectedColumn | undefined {
  return columns.find((c) => c.isPrimaryKey);
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
    return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });
  }
  const userId = auth.userId;

  try {
    const schema = await getIntrospectedSchema(params.connectionId);
    const tableData = schema.tables?.find((t) => t.name === params.table);
    if (!tableData) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    if (tableData.type === "view") {
      return NextResponse.json(
        { error: `"${params.table}" is a view and cannot be modified` },
        { status: 400 }
      );
    }

    const pkColumn = getPkColumn(tableData.columns);
    if (!pkColumn) return NextResponse.json({ error: "No primary key" }, { status: 400 });

    const body = await req.json();
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    if (ids.length > 1000) {
      return NextResponse.json({ error: "Too many IDs" }, { status: 400 });
    }

    const adapter = await getAdapter(params.connectionId);
    await adapter.bulkDelete(params.table, ids.map(String), pkColumn.name);

    await createAuditLog({
      connectionId: params.connectionId,
      userId,
      action: "row.bulk_delete",
      tableName: params.table,
      details: `Bulk deleted ${ids.length} rows`,
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
