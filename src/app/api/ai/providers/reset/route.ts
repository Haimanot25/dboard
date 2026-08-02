import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { BUILT_IN_PROVIDERS } from "@/lib/ai/providers";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();

    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 5 });
    if (rl) return rl;

    await prisma.aiProvider.deleteMany({ where: { userId } });

    for (const def of BUILT_IN_PROVIDERS) {
      const provider = await prisma.aiProvider.create({
        data: {
          userId,
          name: def.id,
          displayName: def.name,
          baseUrl: def.defaultBaseUrl,
          isEnabled: true,
          sortOrder: BUILT_IN_PROVIDERS.indexOf(def),
        },
      });

      for (let i = 0; i < def.defaultModels.length; i++) {
        const m = def.defaultModels[i];
        await prisma.aiModel.create({
          data: {
            providerId: provider.id,
            modelId: m.modelId,
            displayName: m.displayName,
            isDefault: i === 0,
            sortOrder: i,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
