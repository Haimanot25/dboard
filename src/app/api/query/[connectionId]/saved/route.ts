import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const queries = await prisma.queryHistory.findMany({
      where: { connectionId: params.connectionId, userId, saved: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(queries.map((q) => ({
      id: q.id,
      name: q.sql.slice(0, 50),
      sql: q.sql,
      connectionId: q.connectionId,
      createdAt: q.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { sql } = body;
    if (!sql?.trim()) return NextResponse.json({ error: "SQL required" }, { status: 400 });

    const entry = await prisma.queryHistory.create({
      data: {
        connectionId: params.connectionId,
        userId,
        sql: sql.trim(),
        durationMs: 0,
        rowCount: 0,
        saved: true,
      },
    });

    return NextResponse.json({ id: entry.id, success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.queryHistory.deleteMany({
      where: { id, userId, connectionId: params.connectionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
