import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/drivers/get-adapter";
import { getIntrospectedSchema } from "@/lib/schema/cache";
import { createAuditLog } from "@/lib/audit";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";
import { authenticateRequest, isApiKeyRequest } from "@/lib/api-keys";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMPORT_ROWS = 10000;

export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string; table: string } }
) {
  if (!isApiKeyRequest(req) && !validateCsrf(req)) return csrfError();

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 10 });
  if (rl) return rl;

  const auth = await authenticateRequest(req, params.connectionId, "write");
  if (!auth.allowed) {
    return NextResponse.json(
      { error: auth.error || "Access denied or connection is read-only" },
      { status: auth.error === "Unauthorized" ? 401 : 403 }
    );
  }
  const userId = auth.userId;

  try {
    if (!req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const format = formData.get("format") as string || "csv";

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 400 });
    }

    const text = (await file.text()).replace(/^\uFEFF/, "");
    const schema = await getIntrospectedSchema(params.connectionId);

    const tableData = schema.tables?.find((t) => t.name === params.table);
    if (!tableData) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    const columns = tableData.columns;

    let rows: Record<string, unknown>[] = [];

    if (format === "csv") {
      rows = parseCSV(text, columns.map((c) => c.name));
    } else if (format === "jsonl") {
      rows = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l) => JSON.parse(l));
    } else if (format === "json") {
      rows = JSON.parse(text);
      if (!Array.isArray(rows)) rows = [rows];
    } else {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }

    const truncated = rows.length > MAX_IMPORT_ROWS;
    if (truncated) {
      rows = rows.slice(0, MAX_IMPORT_ROWS);
    }

    const adapter = await getAdapter(params.connectionId);
    let imported = 0;
    const errors: string[] = [];

    // Prepare all rows
    const cleanRows: Record<string, unknown>[] = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        const cleanRow: Record<string, unknown> = {};
        for (const col of columns.map((c) => c.name)) {
          if (rows[i][col] !== undefined) cleanRow[col] = rows[i][col];
        }
        cleanRows.push(cleanRow);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Row ${i + 2}: ${msg}`);
      }
    }

    // Use bulkCreate if available (much faster), otherwise fall back to row-by-row
    if (adapter.bulkCreate) {
      try {
        imported = await adapter.bulkCreate(params.table, cleanRows, columns);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Bulk insert failed: ${msg}`);
        // Fallback to row-by-row
        for (let i = 0; i < cleanRows.length; i++) {
          try {
            await adapter.create(params.table, cleanRows[i], columns);
            imported++;
          } catch (e2) {
            const msg2 = e2 instanceof Error ? e2.message : String(e2);
            errors.push(`Row ${i + 2}: ${msg2}`);
          }
        }
      }
    } else {
      for (let i = 0; i < cleanRows.length; i++) {
        try {
          await adapter.create(params.table, cleanRows[i], columns);
          imported++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`Row ${i + 2}: ${msg}`);
        }
      }
    }

    await createAuditLog({
      connectionId: params.connectionId,
      userId,
      action: "data.imported",
      tableName: params.table,
      details: `Imported ${imported}/${rows.length} rows from ${format.toUpperCase()}`,
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      imported,
      total: rows.length,
      truncated,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function parseCSV(text: string, validColumns: string[]): Record<string, unknown>[] {
  // Handle multi-line quoted fields
  const rawLines: string[] = [];
  let currentLine = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === "\n" && !inQuotes) {
      rawLines.push(currentLine);
      currentLine = "";
    } else if (char === "\r") {
      // skip
    } else {
      currentLine += char;
    }
  }
  if (currentLine) rawLines.push(currentLine);

  if (rawLines.length < 2) return [];

  const headers = parseCSVLine(rawLines[0]);
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const values = parseCSVLine(rawLines[i]);
    if (values.length === 0) continue;
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      if (validColumns.includes(headers[j])) {
        row[headers[j]] = j < values.length ? (values[j] ?? null) : null;
      }
    }
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
