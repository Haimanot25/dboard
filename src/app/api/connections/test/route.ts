import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getDriver, getDefaultPort } from "@/lib/db/drivers/registry";
import { validateCsrf, csrfError } from "@/lib/csrf";
import { resolveAndValidateHost } from "@/lib/db/ssrf-guard";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!validateCsrf(req)) return csrfError();

  const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 10 });
  if (rl) return rl;

  try {
    const body = await req.json();
    const { type, host, port, database, username, password, ssl, apiKey } = body;

    const dbType = type || "postgresql";
    const parsedPort = port ? parseInt(port, 10) : null;
    if (parsedPort !== null && (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535)) {
      return NextResponse.json({ error: "Invalid port number" }, { status: 400 });
    }

    const hostToCheck = host || "localhost";
    const hostCheck = await resolveAndValidateHost(hostToCheck);
    if (!hostCheck.valid) {
      return NextResponse.json({ error: hostCheck.error }, { status: 403 });
    }

    const config = {
      type: dbType,
      host: hostToCheck,
      port: parsedPort ?? getDefaultPort(dbType),
      database: database || "",
      username: username || "",
      password: password || apiKey || undefined,
      apiKey: apiKey || password || undefined,
      ssl: ssl || false,
    };

    const def = getDriver(config.type);

    let adapter;
    if (def?.adapter === "mongodb") {
      const { MongoAdapter } = await import("@/lib/db/drivers/mongodb-adapter");
      adapter = new MongoAdapter();
    } else if (def?.adapter === "supabase" || def?.apiKeyAuth) {
      const { SupabaseAdapter } = await import("@/lib/db/drivers/supabase-adapter");
      config.apiKey = config.password;
      adapter = new SupabaseAdapter();
    } else {
      const { SqlAdapter } = await import("@/lib/db/drivers/sql-adapter");
      adapter = new SqlAdapter();
    }

    await adapter.connect(config);
    await adapter.disconnect();
    return NextResponse.json({ success: true, message: "Connection successful" });
  } catch (error) {
    console.error("[connection-test] error:", error);
    return NextResponse.json({ error: "Connection test failed" }, { status: 400 });
  }
}
