import { NextRequest, NextResponse } from "next/server";
import { getIntrospectedSchema } from "@/lib/schema/cache";
import { getUserId } from "@/lib/auth-helpers";
import { canAccessConnection } from "@/lib/permissions";
import { withRateLimit } from "@/lib/with-rate-limit";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/db/encryption";
import { getProviderDef } from "@/lib/ai/providers";
import { generateSql } from "@/lib/ai/generate";

interface SchemaData {
  tables: { name: string; columns: { name: string; dataType: string }[] }[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  if (!validateCsrf(req)) return csrfError();
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await canAccessConnection(userId, params.connectionId, "read");
  if (!access.allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const rl = withRateLimit(req);
  if (rl) return rl;

  try {
    const { prompt, modelId } = await req.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });
    }

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

    const apiKey = model.provider.encryptedApiKey ? decrypt(model.provider.encryptedApiKey) : null;

    const schemaRaw = await getIntrospectedSchema(params.connectionId);
    const schema = schemaRaw as unknown as SchemaData;
    const tables = schema.tables || [];
    const schemaText = tables.map((t) => {
      const cols = t.columns.map((c) => `${c.name} ${c.dataType}`).join(", ");
      return `${t.name}(${cols})`;
    }).join("\n");

    const sql = await generateSql({
      prompt,
      schemaText,
      apiFormat: def.apiFormat,
      baseUrl: model.provider.baseUrl || def.defaultBaseUrl,
      model: model.modelId,
      apiKey,
      type: "query",
    });

    if (!sql?.trim()) {
      return NextResponse.json({ error: "AI generated an empty query" }, { status: 500 });
    }

    return NextResponse.json({ sql: sql.trim() });
  } catch (error) {
    console.error("[RouteContext] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
