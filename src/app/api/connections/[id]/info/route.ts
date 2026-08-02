import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { getDriver, getDefaultPort } from "@/lib/db/drivers/registry";
import { decrypt } from "@/lib/db/encryption";
import type { DatabaseAdapter, ConnectionConfig, QueryResult } from "@/lib/db/drivers/types";

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
        return NextResponse.json({ error: "Password decryption failed" }, { status: 500 });
      }
    }

    const def = getDriver(conn.type);
    let adapter: DatabaseAdapter;
    const baseConfig: ConnectionConfig = {
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

    const config: ConnectionConfig = def?.adapter === "supabase" || def?.apiKeyAuth
      ? { ...baseConfig, apiKey: password }
      : baseConfig;

    const start = Date.now();
    await adapter.connect(config);
    const latencyMs = Date.now() - start;

    let info: Record<string, unknown> = {};

    if (def?.adapter === "mongodb") {
      info = await gatherMongoInfo(adapter, conn.database);
    } else if (conn.type === "sqlite") {
      info = await gatherSqliteInfo(adapter);
    } else if (conn.type === "mysql") {
      info = await gatherMysqlInfo(adapter);
    } else {
      info = await gatherPostgresInfo(adapter);
    }

    await adapter.disconnect();

    return NextResponse.json({
      connectionId: params.id,
      connectionName: conn.name,
      connectionType: conn.type,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      status: "online",
      latencyMs,
      ...info,
    });
  } catch (error) {
    console.error("[connection-info] error:", error);
    return NextResponse.json({ status: "offline", error: "Info fetch failed" }, { status: 500 });
  }
}

async function safeQuery(adapter: DatabaseAdapter, query: string): Promise<QueryResult> {
  try {
    return await adapter.executeRaw(query);
  } catch {
    return { rows: [], rowCount: 0, fields: [] };
  }
}

async function gatherPostgresInfo(adapter: DatabaseAdapter) {
  const [versionRes, sizeRes, tableCountRes, tablesRes, activeConnsRes, statesRes, cacheRes, uptimeRes] =
    await Promise.all([
      safeQuery(adapter, "SELECT version() as version"),
      safeQuery(adapter, "SELECT pg_size_pretty(pg_database_size(current_database())) as size"),
      safeQuery(adapter, "SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'"),
      safeQuery(adapter, `
        SELECT
          c.relname AS name,
          'table' AS type,
          COALESCE(s.n_tup_ins, 0) AS "rowCount",
          pg_size_pretty(pg_total_relation_size(c.oid)) AS "totalSize",
          pg_size_pretty(pg_relation_size(c.oid)) AS "tableSize",
          (SELECT count(*) FROM pg_class i WHERE i.relkind = 'i' AND i.relnamespace = c.relnamespace) AS "indexCount",
          COALESCE(s.n_dead_tup, 0) AS "deadTuples",
          COALESCE(s.n_tup_ins, 0) AS "totalInserts",
          COALESCE(s.n_tup_upd, 0) AS "totalUpdates",
          COALESCE(s.n_tup_del, 0) AS "totalDeletes"
        FROM pg_class c
        LEFT JOIN pg_stat_user_tables s ON s.relname = c.relname
        WHERE c.relkind = 'r' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY pg_total_relation_size(c.oid) DESC
        LIMIT 50
      `),
      safeQuery(adapter, "SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'"),
      safeQuery(adapter, "SELECT state, count(*) as count FROM pg_stat_activity GROUP BY state"),
      safeQuery(adapter, "SELECT round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) AS ratio FROM pg_stat_database"),
      safeQuery(adapter, "SELECT now() - pg_postmaster_start_time() AS uptime"),
    ]);

  const version = versionRes.rows[0]?.version as string || "Unknown";
  const size = sizeRes.rows[0]?.size as string || "Unknown";
  const tableCount = Number(tableCountRes.rows[0]?.count || 0);
  const tables = tablesRes.rows;
  const totalRecords = tables.reduce((sum: number, t: Record<string, unknown>) => sum + Number(t.rowCount || 0), 0);
  const activeConnections = Number(activeConnsRes.rows[0]?.count || 0);
  const connectionStates: Record<string, number> = {};
  for (const row of statesRes.rows) {
    connectionStates[String(row.state || "unknown")] = Number(row.count || 0);
  }
  const cacheHitRatio = cacheRes.rows[0]?.ratio != null ? Number(cacheRes.rows[0].ratio) : null;
  const uptime = uptimeRes.rows[0]?.uptime as string || null;

  return {
    version,
    databaseSize: size,
    tableCount,
    totalRecords,
    activeConnections,
    connectionStates,
    cacheHitRatio,
    uptime,
    tables,
  };
}

async function gatherMysqlInfo(adapter: DatabaseAdapter) {
  const [versionRes, sizeRes, tablesRes, connsRes, uptimeRes] =
    await Promise.all([
      safeQuery(adapter, "SELECT version() as version"),
      safeQuery(adapter, "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb FROM information_schema.tables WHERE table_schema = DATABASE()"),
      safeQuery(adapter, `
        SELECT table_name AS name, table_rows AS "rowCount",
          ROUND(data_length/1024, 2) AS "dataKb",
          ROUND(index_length/1024, 2) AS "indexKb",
          engine AS "engine"
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
        ORDER BY data_length + index_length DESC
        LIMIT 50
      `),
      safeQuery(adapter, "SELECT count(*) as count FROM information_schema.processlist"),
      safeQuery(adapter, "SHOW STATUS LIKE 'Uptime'"),
    ]);

  const version = versionRes.rows[0]?.version as string || "Unknown";
  const sizeMb = sizeRes.rows[0]?.size_mb;
  const databaseSize = sizeMb != null ? `${sizeMb} MB` : "Unknown";
  const tables = tablesRes.rows.map((t: Record<string, unknown>) => ({
    name: t.name,
    type: "table" as const,
    rowCount: Number(t.rowCount || 0),
    totalSize: `${Number(t.dataKb || 0) + Number(t.indexKb || 0)} KB`,
    indexCount: 0,
    deadTuples: undefined,
  }));
  const tableCount = tables.length;
  const totalRecords = tables.reduce((sum: number, t) => sum + t.rowCount, 0);
  const activeConnections = Number(connsRes.rows[0]?.count || 0);

  const uptimeVal = uptimeRes.rows[0];
  const uptime = uptimeVal ? `${Number(Object.values(uptimeVal)[0] || 0) / 3600}h` : null;

  return {
    version,
    databaseSize,
    tableCount,
    totalRecords,
    activeConnections,
    connectionStates: {},
    cacheHitRatio: null,
    uptime,
    tables,
  };
}

async function gatherSqliteInfo(adapter: DatabaseAdapter) {
  const [pageCountRes, pageSizeRes, tableListRes] =
    await Promise.all([
      safeQuery(adapter, "PRAGMA page_count"),
      safeQuery(adapter, "PRAGMA page_size"),
      safeQuery(adapter, "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'"),
    ]);

  const pageCount = Number(pageCountRes.rows[0]?.page_count || 0);
  const pageSize = Number(pageSizeRes.rows[0]?.page_size || 4096);
  const totalBytes = pageCount * pageSize;
  const databaseSize = totalBytes > 1024 * 1024
    ? `${(totalBytes / 1024 / 1024).toFixed(2)} MB`
    : `${(totalBytes / 1024).toFixed(2)} KB`;

  const tableNames = tableListRes.rows;
  const tables: Record<string, unknown>[] = [];
  let totalRecords = 0;

  for (const t of tableNames) {
    const countRes = await safeQuery(adapter, `SELECT count(*) as count FROM "${String(t.name)}"`);
    const rowCount = Number(countRes.rows[0]?.count || 0);
    totalRecords += rowCount;
    tables.push({
      name: t.name,
      type: t.type === "view" ? "view" : "table",
      rowCount,
      totalSize: "N/A",
      indexCount: 0,
      deadTuples: undefined,
    });
  }

  return {
    version: "SQLite",
    databaseSize,
    tableCount: tables.length,
    totalRecords,
    activeConnections: 1,
    connectionStates: { connected: 1 },
    cacheHitRatio: null,
    uptime: null,
    tables,
  };
}

async function gatherMongoInfo(adapter: DatabaseAdapter, database: string) {
  let statsRes: QueryResult;
  try {
    statsRes = await adapter.executeRaw(JSON.stringify({
      collection: database,
      pipeline: [{ $dbStats: {} }],
    }));
  } catch {
    statsRes = { rows: [], rowCount: 0, fields: [] };
  }

  const stats = statsRes.rows[0] || {};
  const collections = Number(stats.collections || 0);
  const objects = Number(stats.objects || 0);
  const dataSize = Number(stats.dataSize || 0);
  const storageSize = Number(stats.storageSize || 0);

  const formatBytes = (bytes: number) => {
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return {
    version: `MongoDB ${stats.db || ""}`,
    databaseSize: formatBytes(storageSize),
    tableCount: collections,
    totalRecords: objects,
    activeConnections: 1,
    connectionStates: { connected: 1 },
    cacheHitRatio: null,
    uptime: null,
    tables: [],
    storageInfo: {
      dataSize: formatBytes(dataSize),
      storageSize: formatBytes(storageSize),
      indexes: Number(stats.indexes || 0),
      indexSize: formatBytes(Number(stats.indexSize || 0)),
    },
  };
}
