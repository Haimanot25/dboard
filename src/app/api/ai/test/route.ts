import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/db/encryption";
import { getProviderDef } from "@/lib/ai/providers";
import { callOpenAIChat } from "@/lib/ai/formatters/openai";
import { callGeminiContent } from "@/lib/ai/formatters/gemini";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function POST(req: NextRequest) {
  if (!validateCsrf(req)) return csrfError();
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 10 });
  if (rl) return rl;

  try {
    const { providerId, modelId } = await req.json();
    if (!providerId || !modelId) {
      return NextResponse.json({ error: "providerId and modelId are required" }, { status: 400 });
    }

    const provider = await prisma.aiProvider.findFirst({
      where: { id: providerId, userId },
    });
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const model = await prisma.aiModel.findFirst({
      where: { id: modelId, providerId: provider.id },
    });
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const def = getProviderDef(provider.name);
    if (!def) {
      return NextResponse.json({ error: "Unknown provider type" }, { status: 400 });
    }

    const apiKey = provider.encryptedApiKey ? decrypt(provider.encryptedApiKey) : null;
    const baseUrl = provider.baseUrl || def.defaultBaseUrl;
    const testPrompt = "Say 'ok' and nothing else.";
    const systemPrompt = "You are a test assistant. Reply only with 'ok'.";

    console.log(`[AI test] provider=${provider.name}, hasKey=${!!apiKey}, keyLen=${apiKey?.length ?? 0}, baseUrl=${baseUrl}`);

    let text: string;
    switch (def.apiFormat) {
      case "openai-chat":
        text = await callOpenAIChat(baseUrl, model.modelId, apiKey, systemPrompt, testPrompt);
        break;
      case "gemini-content":
        text = await callGeminiContent(baseUrl, model.modelId, apiKey, systemPrompt, testPrompt);
        break;
      default:
        text = await callOpenAIChat(baseUrl, model.modelId, apiKey, systemPrompt, testPrompt);
    }

    return NextResponse.json({ success: true, response: text.trim() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI test] error:", error);
    return NextResponse.json({ error: `AI test failed: ${msg}` }, { status: 500 });
  }
}
