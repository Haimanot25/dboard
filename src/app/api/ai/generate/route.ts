import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { withRateLimit } from "@/lib/with-rate-limit";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/db/encryption";
import { getProviderDef } from "@/lib/ai/providers";
import {
  generateStructuredJson,
  parseGenerationResponse,
  filterRelevantSchema,
  formatSchemaForPrompt,
  type GenerationType,
} from "@/lib/ai/generate";
import { getIntrospectedSchema } from "@/lib/schema/cache";
import { canAccessConnection } from "@/lib/permissions";

const VALID_TYPES: GenerationType[] = ["panel", "dashboard", "form", "query"];

export async function POST(req: NextRequest) {
  if (!validateCsrf(req)) return csrfError();
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 15 });
  if (rl) return rl;

  try {
    const { prompt, connectionId, type, modelId } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!connectionId?.trim()) {
      return NextResponse.json({ error: "Connection ID is required" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }

    // Look up the selected model and its provider
    const model = await prisma.aiModel.findFirst({
      where: { id: modelId },
      include: { provider: true },
    });

    if (!model?.provider || model.provider.userId !== userId) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const def = getProviderDef(model.provider.name);
    if (!def) {
      return NextResponse.json({ error: "Unknown provider type" }, { status: 400 });
    }

    if (!model.provider.isEnabled) {
      return NextResponse.json({ error: "Provider is disabled" }, { status: 400 });
    }

    const apiKey = model.provider.encryptedApiKey ? decrypt(model.provider.encryptedApiKey) : null;

    const access = await canAccessConnection(userId, connectionId, "read");
    if (!access.allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let schema;
    try {
      schema = await getIntrospectedSchema(connectionId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to introspect database schema: ${msg}. Make sure the connection is tested and accessible.` },
        { status: 400 }
      );
    }

    if (!schema.tables || schema.tables.length === 0) {
      return NextResponse.json(
        { error: "No tables found in schema. Introspect the connection first." },
        { status: 400 }
      );
    }

    const relevantSchema = filterRelevantSchema(schema, prompt);
    const schemaText = formatSchemaForPrompt(relevantSchema);

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured for this provider. Add an API key in Settings > AI Providers." },
        { status: 400 }
      );
    }

    let lastError: Error | null = null;
    let result;

    // Retry up to 2 times on parse failure
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await generateStructuredJson({
          prompt,
          schemaText,
          apiFormat: def.apiFormat,
          baseUrl: model.provider.baseUrl || def.defaultBaseUrl,
          model: model.modelId,
          apiKey,
          type,
        });
        result = parseGenerationResponse(raw, type);
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Parse failed");
      }
    }

    if (!result) {
      throw lastError || new Error("Failed to generate a valid response after retries");
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI generate] error:", error);
    return NextResponse.json({ error: `AI generation failed: ${msg}` }, { status: 500 });
  }
}
