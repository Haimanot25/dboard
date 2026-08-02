import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { getDriver, getDefaultPort } from "@/lib/db/drivers/registry";
import { decrypt } from "@/lib/db/encryption";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conn = await prisma.connection.findFirst({
      where: { id: params.id, userId },
    });
    if (!conn) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let password: string | undefined;
    if (conn.encryptedPassword) {
      try {
        password = decrypt(conn.encryptedPassword);
      } catch {
        return NextResponse.json({ status: "offline", error: "Password decryption failed", latencyMs: null });
      }
    }

    const def = getDriver(conn.type);
    let adapter;
    const baseConfig = {
      type: conn.type,
      host: conn.host,
      port: conn.port || getDefaultPort(conn.type),
      database: conn.database,
      username: conn.username || "",
      password,
      ssl: conn.ssl || false,
    };

    if (def?.adapter === "mongodb") {
      const { MongoAdapter } = await import("@/lib/db/drivers/mongodb-adapter");
      adapter = new MongoAdapter();
    } else if (def?.adapter === "supabase" || def?.apiKeyAuth) {
      const { SupabaseAdapter } = await import("@/lib/db/drivers/supabase-adapter");
      adapter = new SupabaseAdapter();
    } else {
      const { SqlAdapter } = await import("@/lib/db/drivers/sql-adapter");
      adapter = new SqlAdapter();
    }

    const config = def?.adapter === "supabase" || def?.apiKeyAuth
      ? { ...baseConfig, apiKey: password }
      : baseConfig;

    const start = Date.now();
    await adapter.connect(config);
    const latencyMs = Date.now() - start;
    await adapter.disconnect();

    return NextResponse.json({ status: "online", latencyMs });
  } catch (error) {
    console.error("[health] error:", error);
    return NextResponse.json({ status: "offline", error: "Health check failed", latencyMs: null });
  }
}
