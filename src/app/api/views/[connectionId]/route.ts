import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { canAccessConnection } from "@/lib/permissions";
import { withRateLimit } from "@/lib/with-rate-limit";
import { validateCsrf, csrfError } from "@/lib/csrf";

export async function GET(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tableName = searchParams.get("table");

    const where: Record<string, unknown> = { userId, connectionId: params.connectionId };
    if (tableName) where.tableName = tableName;

    const views = await prisma.savedView.findMany({ where, orderBy: { updatedAt: "desc" } });
    return NextResponse.json(views);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  if (!validateCsrf(req)) return csrfError();
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
  if (rl) return rl;

  const access = await canAccessConnection(userId, params.connectionId, "read");
  if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  try {
    const { name, tableName, config } = await req.json();
    if (!name?.trim() || !tableName?.trim() || !config) {
      return NextResponse.json({ error: "Name, tableName, and config are required" }, { status: 400 });
    }

    const view = await prisma.savedView.create({
      data: { name, connectionId: params.connectionId, tableName, config: JSON.stringify(config), userId },
    });
    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  _context: { params: { connectionId: string } }
) {
  if (!validateCsrf(req)) return csrfError();
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const viewId = searchParams.get("viewId");
    if (!viewId) return NextResponse.json({ error: "viewId required" }, { status: 400 });

    const view = await prisma.savedView.findFirst({ where: { id: viewId, userId } });
    if (!view) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.savedView.delete({ where: { id: viewId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
