import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { canAccessConnection } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";
import { assertPublicUrl } from "@/lib/db/ssrf-guard";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const url = new URL(req.url);
    const connectionId = url.searchParams.get("connectionId");

    if (connectionId) {
      const access = await canAccessConnection(userId, connectionId, "read");
      if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: Record<string, unknown> = connectionId
      ? { connectionId }
      : { connection: { userId } };

    const webhooks = await prisma.webhook.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(webhooks);
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

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const body = await req.json();
    const { name, url, events, connectionId, secret } = body;

    if (!name || !url || !connectionId) {
      return NextResponse.json({ error: "name, url, and connectionId required" }, { status: 400 });
    }

    const access = await canAccessConnection(userId, connectionId, "admin");
    if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    try {
      await assertPublicUrl(url as string);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid webhook URL" }, { status: 400 });
    }

    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        events: events || "row.created,row.updated,row.deleted",
        connectionId,
        secret: secret || null,
      },
    });

    await createAuditLog({
      connectionId,
      userId,
      action: "webhook.created",
      details: `Webhook "${name}" created for events: ${events || "row.created,row.updated,row.deleted"}`,
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const body = await req.json();
    const { id, name, url, events, enabled, secret } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    const access = await canAccessConnection(userId, existing.connectionId, "admin");
    if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    if (url) {
      try {
        await assertPublicUrl(url as string);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid webhook URL" }, { status: 400 });
      }
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(events && { events }),
        ...(enabled !== undefined && { enabled }),
        ...(secret !== undefined && { secret }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    const access = await canAccessConnection(userId, existing.connectionId, "admin");
    if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    await prisma.webhook.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
