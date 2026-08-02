import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/db/encryption";
import { destroyAdapter } from "@/lib/db/drivers/get-adapter";
import { getUserId } from "@/lib/auth-helpers";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";
import { createAuditLog } from "@/lib/audit";
import { isPrivateHostname, resolveAndValidateHost } from "@/lib/db/ssrf-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const connection = await prisma.connection.findFirst({
      where: { id: params.id, userId },
      select: {
        id: true, name: true, type: true, host: true, port: true,
        database: true, username: true, ssl: true, readOnly: true,
        poolMin: true, poolMax: true, poolIdleTimeout: true, queryTimeoutMs: true,
        createdAt: true,
      },
    });

    if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    return NextResponse.json(connection);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const body = await req.json();
    const { name, type, host, port, database, username, password, ssl, readOnly,
      poolMin, poolMax, poolIdleTimeout, queryTimeoutMs } = body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (host) {
      if (process.env.ALLOW_PRIVATE_DB_HOSTS !== "1") {
        if (isPrivateHostname(host as string)) {
          return NextResponse.json({ error: "Connection to private/internal network addresses is not allowed" }, { status: 403 });
        }
        const hostCheck = await resolveAndValidateHost(host as string);
        if (!hostCheck.valid) {
          return NextResponse.json({ error: hostCheck.error }, { status: 403 });
        }
      }
      updateData.host = host;
    }
    if (port) { const p = parseInt(port, 10); if (!isNaN(p) && p > 0 && p <= 65535) updateData.port = p; }
    if (database) updateData.database = database;
    if (username) updateData.username = username;
    if (password) updateData.encryptedPassword = encrypt(password);
    if (ssl !== undefined) updateData.ssl = ssl;
    if (readOnly !== undefined) updateData.readOnly = readOnly;
    if (poolMin !== undefined) updateData.poolMin = Math.max(0, parseInt(poolMin, 10) || 0);
    if (poolMax !== undefined) updateData.poolMax = Math.max(1, parseInt(poolMax, 10) || 10);
    if (poolIdleTimeout !== undefined) updateData.poolIdleTimeout = Math.max(1000, parseInt(poolIdleTimeout, 10) || 30000);
    if (queryTimeoutMs !== undefined) updateData.queryTimeoutMs = Math.max(0, parseInt(queryTimeoutMs, 10) || 30000);

    const existing = await prisma.connection.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const connection = await prisma.connection.update({
      where: { id: params.id },
      data: updateData,
    });

    await destroyAdapter(params.id);

    await createAuditLog({
      connectionId: params.id,
      userId,
      action: "connection.updated",
      details: `Updated connection ${connection.name}`,
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      id: connection.id, name: connection.name, type: connection.type,
      host: connection.host, port: connection.port, database: connection.database,
      username: connection.username, ssl: connection.ssl, readOnly: connection.readOnly,
      createdAt: connection.createdAt,
    });
  } catch (error) {
    console.error("Route error:", error);
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

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const existing = await prisma.connection.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    await createAuditLog({
      connectionId: params.id,
      userId,
      action: "connection.deleted",
      ip: req.headers.get("x-forwarded-for") || undefined,
    });

    await destroyAdapter(params.id);
    await prisma.schemaConfig.deleteMany({ where: { connectionId: params.id } });
    await prisma.connection.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
