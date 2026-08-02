import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { canAccessConnection } from "@/lib/permissions";
import { withRateLimit } from "@/lib/with-rate-limit";
import { assertPublicUrl } from "@/lib/db/ssrf-guard";
import { validateCsrf, csrfError } from "@/lib/csrf";

export async function GET(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const access = await canAccessConnection(userId, params.connectionId, "read");
    if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const alerts = await prisma.alert.findMany({
      where: { connectionId: params.connectionId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 20 });
  if (rl) return rl;

  const access = await canAccessConnection(userId, params.connectionId, "write");
  if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  try {
    const { name, tableName, condition, webhookUrl, email } = await req.json();
    if (!name?.trim() || !tableName?.trim() || !condition?.trim()) {
      return NextResponse.json({ error: "Name, tableName, and condition are required" }, { status: 400 });
    }

    if (webhookUrl) {
      try {
        await assertPublicUrl(webhookUrl as string);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid webhook URL" }, { status: 400 });
      }
    }

    const alert = await prisma.alert.create({
      data: {
        name,
        connectionId: params.connectionId,
        tableName,
        condition,
        webhookUrl: webhookUrl || null,
        email: email || null,
        userId,
      },
    });
    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const access = await canAccessConnection(userId, params.connectionId, "write");
    if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { alertId, enabled } = await req.json();
    if (!alertId) return NextResponse.json({ error: "alertId required" }, { status: 400 });

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, connectionId: params.connectionId },
    });
    if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.alert.update({ where: { id: alertId }, data: { enabled } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RouteContext] error:", error);
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
    if (!validateCsrf(req)) return csrfError();

    const access = await canAccessConnection(userId, params.connectionId, "write");
    if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const alertId = searchParams.get("alertId");
    if (!alertId) return NextResponse.json({ error: "alertId required" }, { status: 400 });

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, connectionId: params.connectionId },
    });
    if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.alert.delete({ where: { id: alertId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
