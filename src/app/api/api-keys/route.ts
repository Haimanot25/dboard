import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { generateApiKey } from "@/lib/api-keys";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { createAuditLog } from "@/lib/audit";
import { withRateLimit } from "@/lib/with-rate-limit";
import { MS_PER_DAY } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const connectionId = url.searchParams.get("connectionId");

    const where: Record<string, unknown> = { userId };
    if (connectionId) where.connectionId = connectionId;

    const keys = await prisma.apiKey.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        lastChars: true,
        permissions: true,
        connectionId: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(keys);
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

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 10 });
    if (rl) return rl;

    const body = await req.json();
    const { name, connectionId, permissions, expiresInDays } = body;

    if (!name || !connectionId) {
      return NextResponse.json({ error: "name and connectionId required" }, { status: 400 });
    }

    // Verify connection ownership
    const conn = await prisma.connection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    const { key, lastChars } = generateApiKey();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * MS_PER_DAY)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key,
        lastChars,
        permissions: permissions || "read",
        connectionId,
        userId,
        expiresAt,
      },
    });

    await createAuditLog({
      connectionId,
      userId,
      action: "api_key.created",
      details: `API key "${name}" created with ${permissions || "read"} permissions`,
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      key, // Only shown once!
      lastChars: apiKey.lastChars,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
    });
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

    const key = await prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) return NextResponse.json({ error: "API key not found" }, { status: 404 });

    await prisma.apiKey.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
