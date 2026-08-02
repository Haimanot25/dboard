import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { withRateLimit } from "@/lib/with-rate-limit";
import { validateCsrf, csrfError } from "@/lib/csrf";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dashboards = await prisma.dashboard.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(dashboards);
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateCsrf(req)) return csrfError();
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
  if (rl) return rl;

  try {
    const { name, description } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const dashboard = await prisma.dashboard.create({
      data: { name, description, userId },
    });
    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
