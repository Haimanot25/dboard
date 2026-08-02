import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/db/encryption";
import { getUserId } from "@/lib/auth-helpers";
import { withRateLimit } from "@/lib/with-rate-limit";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { getDefaultPort, getDriver } from "@/lib/db/drivers/registry";
import { isPrivateHostname, resolveAndValidateHost } from "@/lib/db/ssrf-guard";

function parsePort(val: unknown, defaultVal: number | null): number | null {
  if (val == null || val === "") return defaultVal;
  const n = parseInt(String(val), 10);
  if (isNaN(n) || n < 1 || n > 65535) return defaultVal;
  return n;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const connections = await prisma.connection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, type: true, host: true, port: true,
        database: true, username: true, ssl: true, readOnly: true,
        poolMin: true, poolMax: true, queryTimeoutMs: true, createdAt: true,
      },
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 20 });
    if (rl) return rl;
    if (!validateCsrf(req)) return csrfError();

    const body = await req.json();
    const { name, type, host, port, database, username, password, ssl, readOnly,
      poolMin, poolMax, poolIdleTimeout, queryTimeoutMs } = body;

    const driverDef = getDriver(type);
    const isApiKeyAuth = driverDef?.apiKeyAuth;
    if (!name || !database || (!isApiKeyAuth && !username)) {
      return NextResponse.json({ error: "Missing required fields: name, database, username" }, { status: 400 });
    }

    const hostName = (host || "localhost") as string;
    if (process.env.ALLOW_PRIVATE_DB_HOSTS !== "1") {
      if (isPrivateHostname(hostName)) {
        return NextResponse.json({ error: "Connection to private/internal network addresses is not allowed" }, { status: 403 });
      }
      const hostCheck = await resolveAndValidateHost(hostName);
      if (!hostCheck.valid) {
        return NextResponse.json({ error: hostCheck.error }, { status: 403 });
      }
    }

    const encryptedPassword = password ? encrypt(password) : null;

    const connection = await prisma.connection.create({
      data: {
        name, type: type || "postgresql",
        host: hostName,
        port: parsePort(port, getDefaultPort(type)) ?? undefined,
        database, username, encryptedPassword,
        ssl: ssl || false, readOnly: readOnly || false, userId,
        poolMin: Math.max(0, parseInt(poolMin, 10) || 0),
        poolMax: Math.max(1, parseInt(poolMax, 10) || 10),
        poolIdleTimeout: Math.max(1000, parseInt(poolIdleTimeout, 10) || 30000),
        queryTimeoutMs: Math.max(0, parseInt(queryTimeoutMs, 10) || 30000),
      },
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
