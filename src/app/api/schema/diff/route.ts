import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/drivers/get-adapter";
import { getUserId } from "@/lib/auth-helpers";
import { canAccessConnection } from "@/lib/permissions";
import { withRateLimit } from "@/lib/with-rate-limit";
import { validateCsrf, csrfError } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validateCsrf(req)) return csrfError();

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 10 });
  if (rl) return rl;

  try {
    const { sourceConnectionId, targetConnectionId } = await req.json();
    if (!sourceConnectionId || !targetConnectionId) {
      return NextResponse.json({ error: "Both source and target connection IDs are required" }, { status: 400 });
    }

    const access = await canAccessConnection(userId, sourceConnectionId, "read");
    if (!access.allowed) return NextResponse.json({ error: "Access denied to source" }, { status: 403 });

    const access2 = await canAccessConnection(userId, targetConnectionId, "read");
    if (!access2.allowed) return NextResponse.json({ error: "Access denied to target" }, { status: 403 });

    const sourceAdapter = await getAdapter(sourceConnectionId);
    const targetAdapter = await getAdapter(targetConnectionId);

    // Run both introspections in parallel (halves latency)
    const [sourceResult, targetResult] = await Promise.all([
      sourceAdapter.introspect(),
      targetAdapter.introspect(),
    ]);

    const sourceTables = new Map(sourceResult.tables.map((t) => [t.name, t]));
    const targetTables = new Map(targetResult.tables.map((t) => [t.name, t]));

    const onlyInSource: string[] = [];
    const onlyInTarget: string[] = [];
    const columnDiffs: Array<{ table: string; sourceCols: string[]; targetCols: string[]; added: string[]; removed: string[] }> = [];

    Array.from(sourceTables.keys()).forEach((name) => {
      if (!targetTables.has(name)) {
        onlyInSource.push(name);
      }
    });

    Array.from(targetTables.keys()).forEach((name) => {
      if (!sourceTables.has(name)) {
        onlyInTarget.push(name);
      }
    });

    Array.from(sourceTables.entries()).forEach(([name, srcTable]) => {
      const tgtTable = targetTables.get(name);
      if (!tgtTable) return;

      const srcCols: string[] = (srcTable.columns || []).map((c) => c.name);
      const tgtCols: string[] = (tgtTable.columns || []).map((c) => c.name);

      const added = tgtCols.filter((colName) => !srcCols.includes(colName));
      const removed = srcCols.filter((colName) => !tgtCols.includes(colName));

      if (added.length > 0 || removed.length > 0) {
        columnDiffs.push({
          table: name,
          sourceCols: (srcTable.columns || []).map((c) => c.name),
          targetCols: (tgtTable.columns || []).map((c) => c.name),
          added,
          removed,
        });
      }
    });

    return NextResponse.json({
      sourceConnectionId,
      targetConnectionId,
      onlyInSource,
      onlyInTarget,
      columnDiffs,
      sourceTableCount: sourceResult.tables.length,
      targetTableCount: targetResult.tables.length,
    });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
