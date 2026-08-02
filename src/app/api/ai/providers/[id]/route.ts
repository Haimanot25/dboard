import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { encrypt } from "@/lib/db/encryption";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 20 });
    if (rl) return rl;

    const provider = await prisma.aiProvider.findFirst({
      where: { id: params.id, userId },
    });
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    console.log(`[AI save] id=${params.id}, hasApiKey=${body.apiKey !== undefined}, apiKeyType=${typeof body.apiKey}, apiKeyLen=${typeof body.apiKey === 'string' ? body.apiKey.length : 'N/A'}`);

    // Only clear key when explicitly null; empty string means "don't change"
    if (body.apiKey !== undefined) {
      if (body.apiKey === null) {
        updateData.encryptedApiKey = null;
      } else if (typeof body.apiKey === "string" && body.apiKey.trim().length > 0) {
        const encrypted = encrypt(body.apiKey.trim());
        updateData.encryptedApiKey = encrypted;
        console.log(`[AI save] encrypted key length=${encrypted.length}`);
      }
    }

    if (body.baseUrl !== undefined) {
      updateData.baseUrl = body.baseUrl || null;
    }

    if (body.isEnabled !== undefined) {
      updateData.isEnabled = body.isEnabled === true;
    }

    if (body.defaultModelId !== undefined && body.defaultModelId) {
      await prisma.aiModel.updateMany({
        where: { providerId: provider.id },
        data: { isDefault: false },
      });
      await prisma.aiModel.updateMany({
        where: { providerId: provider.id, modelId: body.defaultModelId },
        data: { isDefault: true },
      });
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.aiProvider.update({
        where: { id: provider.id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
