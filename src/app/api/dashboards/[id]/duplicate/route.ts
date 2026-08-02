import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 10 });
    if (rl) return rl;

    const original = await prisma.dashboard.findFirst({
      where: { id: params.id, userId },
      include: { charts: { orderBy: { createdAt: "asc" } } },
    });
    if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const duplicated = await prisma.dashboard.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        userId,
        charts: {
          create: original.charts.map((c) => ({
            title: c.title,
            type: c.type,
            connectionId: c.connectionId,
            query: c.query,
            config: c.config,
            width: c.width,
            height: c.height,
            x: c.x,
            y: c.y,
          })),
        },
      },
      include: { charts: true },
    });

    return NextResponse.json(duplicated);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
