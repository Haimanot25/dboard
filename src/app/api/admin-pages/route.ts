import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pages = await prisma.adminPage.findMany({
      where: { userId },
      include: { connection: { select: { name: true, type: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 20 });
    if (rl) return rl;

    const body = await req.json();
    const { name, description, connectionId, config } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!connectionId) return NextResponse.json({ error: "Connection is required" }, { status: 400 });

    const connection = await prisma.connection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    const page = await prisma.adminPage.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId,
        connectionId,
        config: JSON.stringify(config || { tables: [] }),
      },
      include: { connection: { select: { name: true, type: true } } },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
