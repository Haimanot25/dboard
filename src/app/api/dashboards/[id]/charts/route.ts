import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validateCsrf(req)) return csrfError();

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 20 });
  if (rl) return rl;

  const dashboard = await prisma.dashboard.findFirst({
    where: { id: params.id, userId },
  });
  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { title, type, connectionId, query } = await req.json();
    if (!title?.trim() || !query?.trim()) {
      return NextResponse.json({ error: "Title and query are required" }, { status: 400 });
    }

    const chart = await prisma.dashboardChart.create({
      data: { dashboardId: params.id, title, type: type || "bar", connectionId, query },
    });
    return NextResponse.json(chart, { status: 201 });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 20 });
    if (rl) return rl;

    const dashboard = await prisma.dashboard.findFirst({
      where: { id: params.id, userId },
    });
    if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const chartId = searchParams.get("chartId");
    if (!chartId) return NextResponse.json({ error: "chartId required" }, { status: 400 });

    const chart = await prisma.dashboardChart.findFirst({
      where: { id: chartId, dashboardId: params.id },
    });
    if (!chart) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

    await prisma.dashboardChart.delete({ where: { id: chartId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 20 });
    if (rl) return rl;

    const dashboard = await prisma.dashboard.findFirst({
      where: { id: params.id, userId },
    });
    if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const chartId = searchParams.get("chartId");
    if (!chartId) return NextResponse.json({ error: "chartId required" }, { status: 400 });

    const chart = await prisma.dashboardChart.findFirst({
      where: { id: chartId, dashboardId: params.id },
    });
    if (!chart) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

    const body = await req.json();
    if (typeof body.title === "string" && !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (typeof body.query === "string" && !body.query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const updated = await prisma.dashboardChart.update({
      where: { id: chartId },
      data: {
        ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
        ...(typeof body.type === "string" && body.type ? { type: body.type } : {}),
        ...(typeof body.connectionId === "string" ? { connectionId: body.connectionId } : {}),
        ...(typeof body.query === "string" ? { query: body.query } : {}),
        ...(typeof body.config === "string" ? { config: body.config } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
