export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { BUILT_IN_PROVIDERS } from "@/lib/ai/providers";
import { decrypt } from "@/lib/db/encryption";

async function ensureDefaultProviders(userId: string) {
  const count = await prisma.aiProvider.count({ where: { userId } });

  if (count === 0) {
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
    return;
  }

  // Migrate old "grok" provider to "groq"
  const oldGrok = await prisma.aiProvider.findFirst({
    where: { userId, name: "grok" },
    include: { models: true },
  });
  if (oldGrok) {
    await prisma.aiModel.deleteMany({ where: { providerId: oldGrok.id } });
    await prisma.aiProvider.update({
      where: { id: oldGrok.id },
      data: { name: "groq", displayName: "Groq (Free)", baseUrl: "https://api.groq.com/openai/v1", isEnabled: true },
    });
    const groqDef = BUILT_IN_PROVIDERS.find((p) => p.id === "groq");
    if (groqDef) {
      for (let i = 0; i < groqDef.defaultModels.length; i++) {
        const m = groqDef.defaultModels[i];
        await prisma.aiModel.create({
          data: {
            providerId: oldGrok.id,
            modelId: m.modelId,
            displayName: m.displayName,
            isDefault: i === 0,
            sortOrder: i,
          },
        });
      }
    }
  }

  // Create any missing providers
  const existingNames = new Set(
    (await prisma.aiProvider.findMany({ where: { userId }, select: { name: true } })).map((p) => p.name)
  );
  for (const def of BUILT_IN_PROVIDERS) {
    if (existingNames.has(def.id)) continue;
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

  // Sync default models: add missing, remove orphaned
  for (const def of BUILT_IN_PROVIDERS) {
    const provider = await prisma.aiProvider.findFirst({
      where: { userId, name: def.id },
      include: { models: true },
    });
    if (!provider) continue;

    const expectedIds = new Set(def.defaultModels.map((m) => m.modelId));
    const existingIds = new Set(provider.models.map((m) => m.modelId));

    // Remove orphan models (no longer in the definition)
    for (const model of provider.models) {
      if (!expectedIds.has(model.modelId)) {
        await prisma.aiModel.delete({ where: { id: model.id } });
      }
    }

    // Add missing models
    let maxSort = Math.max(...provider.models.map((m) => m.sortOrder), -1);
    for (const m of def.defaultModels) {
      if (!existingIds.has(m.modelId)) {
        maxSort++;
        await prisma.aiModel.create({
          data: {
            providerId: provider.id,
            modelId: m.modelId,
            displayName: m.displayName,
            isDefault: false,
            sortOrder: maxSort,
          },
        });
      }
    }
  }
}

function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "••••" + key.slice(-4);
  return key.slice(0, 4) + "••••" + key.slice(-4);
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify user exists in DB (session may be stale after DB reset)
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      return NextResponse.json([]);
    }

    await ensureDefaultProviders(userId);

    const providers = await prisma.aiProvider.findMany({
      where: { userId },
      include: { models: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    const result = providers.map((p) => {
      const def = BUILT_IN_PROVIDERS.find((d) => d.id === p.name);
      let maskedKey: string | null = null;
      if (p.encryptedApiKey) {
        try {
          maskedKey = maskApiKey(decrypt(p.encryptedApiKey));
        } catch {
          maskedKey = "***";
        }
      }
      return {
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        baseUrl: p.baseUrl,
        isEnabled: p.isEnabled,
        sortOrder: p.sortOrder,
        apiKey: maskedKey,
        hasKey: !!p.encryptedApiKey,
        needsKey: def?.authType !== "none",
        models: p.models.map((m) => ({
          id: m.id,
          modelId: m.modelId,
          displayName: m.displayName,
          isDefault: m.isDefault,
          sortOrder: m.sortOrder,
        })),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
