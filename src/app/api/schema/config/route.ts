import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { canAccessConnection } from "@/lib/permissions";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 20 });
    if (rl) return rl;

    const body = await req.json();
    const { connectionId, config } = body;

    if (!connectionId || !config) {
      return NextResponse.json(
        { error: "connectionId and config are required" },
        { status: 400 }
      );
    }

    const access = await canAccessConnection(userId, connectionId, "write");
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const existing = await prisma.schemaConfig.findUnique({
      where: { connectionId },
    });

    if (existing) {
      const updated = await prisma.schemaConfig.update({
        where: { connectionId },
        data: { config: JSON.stringify(config) },
      });
      return NextResponse.json({ id: updated.id, config: JSON.parse(updated.config) });
    }

    const created = await prisma.schemaConfig.create({
      data: {
        connectionId,
        config: JSON.stringify(config),
      },
    });

    return NextResponse.json({ id: created.id, config: JSON.parse(created.config) });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
