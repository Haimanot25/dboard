import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const dashboard = await prisma.dashboard.findFirst({
      where: { id: params.id, userId },
    });
    if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const shares = await prisma.dashboardShare.findMany({
      where: { dashboardId: params.id },
      include: {
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

export async function POST(
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
    const { sharedWithEmail, permission } = body;

    if (!sharedWithEmail) {
      return NextResponse.json({ error: "sharedWithEmail required" }, { status: 400 });
    }

    const dashboard = await prisma.dashboard.findFirst({
      where: { id: params.id, userId },
    });
    if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sharedWith = await prisma.user.findUnique({ where: { email: sharedWithEmail } });
    if (!sharedWith) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (sharedWith.id === userId) {
      return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
    }

    await prisma.dashboardShare.upsert({
      where: { dashboardId_sharedWithId: { dashboardId: params.id, sharedWithId: sharedWith.id } },
      update: { permission: permission || "read" },
      create: {
        dashboardId: params.id,
        sharedWithId: sharedWith.id,
        sharedById: userId,
        permission: permission || "read",
      },
    });

    return NextResponse.json({ success: true });
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

    const url = new URL(req.url);
    const shareId = url.searchParams.get("shareId");
    if (!shareId) return NextResponse.json({ error: "shareId required" }, { status: 400 });

    const share = await prisma.dashboardShare.findUnique({ where: { id: shareId } });
    if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });
    if (share.sharedById !== userId && share.dashboardId !== params.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.dashboardShare.delete({ where: { id: shareId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
