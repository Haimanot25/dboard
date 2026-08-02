import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/drivers/get-adapter";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getIntrospectedSchema } from "@/lib/schema/cache";
import { sanitizeCell, quoteCsvField } from "@/lib/csv";
import { authenticateRequest } from "@/lib/api-keys";

const MAX_EXPORT_LIMIT = 100000;
const PDF_ROW_LIMIT = 5000;

export async function GET(
  req: NextRequest,
  { params }: { params: { connectionId: string; table: string } }
) {
  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 10 });
  if (rl) return rl;

  const auth = await authenticateRequest(req, params.connectionId, "read");
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });
  }

  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";
    const requestedLimit = parseInt(url.searchParams.get("limit") || "10000", 10);
    const limit = Math.max(1, Math.min(isNaN(requestedLimit) ? 10000 : requestedLimit, MAX_EXPORT_LIMIT));

    const adapter = await getAdapter(params.connectionId);
    const schema = await getIntrospectedSchema(params.connectionId);
    const tableMeta = (schema.tables || []).find((t) => t.name === params.table);
    const columns = tableMeta?.columns || [];

    // For CSV and JSONL, use streaming response
    if (format === "csv" || format === "jsonl") {
      const CHUNK_SIZE = 5000;
      const encoder = new TextEncoder();
      let sentHeaders = false;

      const stream = new ReadableStream({
        async start(controller) {
          try {
            let page = 1;
            let totalFetched = 0;
            const separator = format === "jsonl" ? "\n" : "\n";

            while (totalFetched < limit) {
              const pageSize = Math.min(CHUNK_SIZE, limit - totalFetched);
              const result = await adapter.list(params.table, { page, pageSize }, columns);
              const data = result.data || [];
              if (data.length === 0) break;

              if (format === "csv" && !sentHeaders) {
                const headers = Object.keys(data[0]);
                controller.enqueue(encoder.encode(headers.map(quoteCsvField).join(",") + "\n"));
                sentHeaders = true;
              }

              for (const row of data) {
                if (format === "csv") {
                  const headers = Object.keys(row);
                  const values = headers.map((h) => quoteCsvField(sanitizeCell(row[h])));
                  controller.enqueue(encoder.encode(values.join(",") + separator));
                } else {
                  controller.enqueue(encoder.encode(JSON.stringify(row) + separator));
                }
              }

              totalFetched += data.length;
              if (data.length < pageSize) break;
              page++;
            }
          } catch (e) {
            controller.error(e);
          } finally {
            controller.close();
          }
        },
      });

      const ext = format === "csv" ? "csv" : "jsonl";
      const contentType = format === "csv" ? "text/csv" : "application/jsonl";
      return new NextResponse(stream, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${params.table}.${ext}"`,
          "Transfer-Encoding": "chunked",
        },
      });
    }

    // For JSON, load all at once (already structured)
    if (format === "json") {
      const result = await adapter.list(params.table, { page: 1, pageSize: limit }, columns);
      return NextResponse.json(result.data || []);
    }

    // For XLSX, load all at once
    if (format === "xlsx") {
      const result = await adapter.list(params.table, { page: 1, pageSize: limit }, columns);
      const data = result.data || [];
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(params.table);
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        sheet.addRow(headers);
        for (const col of headers) {
          const cell = sheet.getColumn(headers.indexOf(col) + 1);
          cell.width = Math.max(10, col.length + 2);
        }
        for (const row of data) {
          sheet.addRow(headers.map((h) => {
            const v = row[h];
            return v === null || v === undefined ? "" : sanitizeCell(v);
          }));
        }
      }
      const buf = await workbook.xlsx.writeBuffer();
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${params.table}.xlsx"`,
        },
      });
    }

    // For PDF, limit to 5K rows
    if (format === "pdf") {
      const pdfLimit = Math.min(limit, PDF_ROW_LIMIT);
      const result = await adapter.list(params.table, { page: 1, pageSize: pdfLimit }, columns);
      const data = result.data || [];
      const { jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape" });
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const rows = data.map((row) => headers.map((h) => {
          const v = row[h];
          return v === null || v === undefined ? "" : String(v).slice(0, 200);
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc as any).autoTable({ head: [headers], body: rows, styles: { fontSize: 7 } });
      }
      const buf = Buffer.from(doc.output("arraybuffer"));
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${params.table}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
