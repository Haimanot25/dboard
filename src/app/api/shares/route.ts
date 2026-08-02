import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { canAccessConnection } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const url = new URL(req.url);
    const connectionId = url.searchParams.get("connectionId");

    const where: Record<string, unknown> = {};
    if (connectionId) {
      const access = await canAccessConnection(userId, connectionId, "read");
      if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });
      where.connectionId = connectionId;
    } else {
      // Get all shares for this user
      where.OR = [
        { sharedWithId: userId },
        { sharedById: userId },
      ];
    }

    const shares = await prisma.connectionShare.findMany({
      where: where as never,
      include: {
        connection: { select: { id: true, name: true } },
        sharedWith: { select: { id: true, email: true, name: true } },
        sharedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(shares);
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
    const { connectionId, sharedWithEmail, permission } = body;

    if (!connectionId || !sharedWithEmail) {
      return NextResponse.json({ error: "connectionId and sharedWithEmail required" }, { status: 400 });
    }

    const access = await canAccessConnection(userId, connectionId, "admin");
    if (!access.allowed) {
      return NextResponse.json({ error: "You don't have permission to share this connection" }, { status: 403 });
    }

    const sharedWith = await prisma.user.findUnique({ where: { email: sharedWithEmail } });
    if (!sharedWith) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (sharedWith.id === userId) {
      return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
    }

    await prisma.connectionShare.upsert({
      where: { connectionId_sharedWithId: { connectionId, sharedWithId: sharedWith.id } },
      update: { permission: permission || "read" },
      create: {
        connectionId,
        sharedWithId: sharedWith.id,
        sharedById: userId,
        permission: permission || "read",
      },
    });

    await createAuditLog({
      connectionId,
      userId,
      action: "connection.shared",
      details: `Shared with ${sharedWithEmail} (${permission || "read"})`,
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ success: true });
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

    const share = await prisma.connectionShare.findUnique({ where: { id } });
    if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });

    const access = await canAccessConnection(userId, share.connectionId, "admin");
    if (!access.allowed && share.sharedById !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.connectionShare.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
