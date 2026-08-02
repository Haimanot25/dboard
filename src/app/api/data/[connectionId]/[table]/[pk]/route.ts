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

export async function GET(
  req: NextRequest,
  { params }: { params: { connectionId: string; table: string; pk: string } }
) {
  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
  if (rl) return rl;

  const auth = await authenticateRequest(req, params.connectionId, "read");
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });
  }

  try {
    const schema = await getIntrospectedSchema(params.connectionId);
    const tableData = schema.tables?.find((t) => t.name === params.table);
    if (!tableData) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    const pkColumn = getPkColumn(tableData.columns);
    if (!pkColumn) return NextResponse.json({ error: "No primary key" }, { status: 400 });

    const adapter = await getAdapter(params.connectionId);
    const row = await adapter.get(params.table, params.pk, pkColumn.name);
    if (!row) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    return NextResponse.json(row);
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { connectionId: string; table: string; pk: string } }
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

    const columns = tableData.columns;
    const pkColumn = getPkColumn(columns);
    if (!pkColumn) return NextResponse.json({ error: "No primary key" }, { status: 400 });

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

    const filtered = Object.fromEntries(
      Object.entries(body).filter(([k]) => k !== pkColumn.name)
    );
    const adapter = await getAdapter(params.connectionId);
    const result = await adapter.update(params.table, params.pk, pkColumn.name, filtered, columns);

    await createAuditLog({
      connectionId: params.connectionId,
      userId,
      action: "row.updated",
      tableName: params.table,
      recordId: params.pk,
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { connectionId: string; table: string; pk: string } }
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

    const adapter = await getAdapter(params.connectionId);
    await adapter.delete(params.table, params.pk, pkColumn.name);

    await createAuditLog({
      connectionId: params.connectionId,
      userId,
      action: "row.deleted",
      tableName: params.table,
      recordId: params.pk,
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
