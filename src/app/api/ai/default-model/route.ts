import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 30 });
    if (rl) return rl;

    const { modelId } = await req.json();
    if (!modelId) {
      return NextResponse.json({ error: "modelId is required" }, { status: 400 });
    }

    // Verify the model belongs to this user
    const model = await prisma.aiModel.findFirst({
      where: { id: modelId },
      include: { provider: true },
    });

    if (!model || model.provider.userId !== userId) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Unset all defaults for this user, then set the chosen one
    const userProviders = await prisma.aiProvider.findMany({
      where: { userId },
      select: { id: true },
    });

    for (const p of userProviders) {
      await prisma.aiModel.updateMany({
        where: { providerId: p.id },
        data: { isDefault: false },
      });
    }

    await prisma.aiModel.update({
      where: { id: modelId },
      data: { isDefault: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
