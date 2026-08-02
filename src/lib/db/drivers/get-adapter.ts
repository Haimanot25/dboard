import type { DatabaseAdapter, ConnectionConfig } from "./types";
import { getDriver } from "./registry";
import { SqlAdapter } from "./sql-adapter";
import { isPluginAdapter, createPluginAdapter, loadExternalAdapters } from "../plugins/adapter-plugins";

let adaptersLoaded = false;

const adapterCache = new Map<string, DatabaseAdapter>();
const inflight = new Map<string, Promise<DatabaseAdapter>>();
const adapterTimestamps = new Map<string, number>();

const MAX_CACHE_SIZE = 50;
const CACHE_TTL_MS = 30 * 60 * 1000;

function evictExpired(): void {
  const now = Date.now();
  for (const [key, ts] of Array.from(adapterTimestamps.entries())) {
    if (now - ts > CACHE_TTL_MS) {
      const adapter = adapterCache.get(key);
      if (adapter) {
        adapter.disconnect().catch(() => {});
      }
      adapterCache.delete(key);
      adapterTimestamps.delete(key);
    }
  }
  if (adapterCache.size > MAX_CACHE_SIZE) {
    const oldest = Array.from(adapterTimestamps.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, adapterCache.size - MAX_CACHE_SIZE);
    for (const [key] of oldest) {
      const adapter = adapterCache.get(key);
      if (adapter) {
        adapter.disconnect().catch(() => {});
      }
      adapterCache.delete(key);
      adapterTimestamps.delete(key);
    }
  }
}

async function ensureAdaptersLoaded(): Promise<void> {
  if (!adaptersLoaded) {
    adaptersLoaded = true;
    await loadExternalAdapters();
  }
}

async function createAdapter(connectionId: string): Promise<DatabaseAdapter> {
  await ensureAdaptersLoaded();
  evictExpired();

  const { prisma } = await import("@/lib/prisma");
  const { decrypt } = await import("@/lib/db/encryption");

  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new Error(`Connection ${connectionId} not found`);

  const def = getDriver(connection.type);
  let password: string | undefined;
  if (connection.encryptedPassword) {
    try {
      password = decrypt(connection.encryptedPassword);
    } catch {
      throw new Error("Connection password is corrupted. Please update the connection with the correct password.");
    }
  }

  const config: ConnectionConfig = {
    type: connection.type,
    host: def?.fileBased ? "localhost" : connection.host,
    port: connection.port,
    database: connection.database,
    username: connection.username,
    password,
    ssl: connection.ssl,
  };

  let adapter: DatabaseAdapter;

  if (isPluginAdapter(connection.type)) {
    adapter = createPluginAdapter(connection.type);
  } else if (def?.adapter === "mongodb") {
    const { MongoAdapter } = await import("./mongodb-adapter");
    adapter = new MongoAdapter();
  } else if (def?.adapter === "supabase") {
    const { SupabaseAdapter } = await import("./supabase-adapter");
    config.apiKey = config.password;
    adapter = new SupabaseAdapter();
  } else {
    adapter = new SqlAdapter();
  }

  await adapter.connect(config);
  return adapter;
}

export async function getAdapter(connectionId: string): Promise<DatabaseAdapter> {
  const cached = adapterCache.get(connectionId);
  if (cached) {
    adapterTimestamps.set(connectionId, Date.now());
    return cached;
  }

  if (inflight.has(connectionId)) {
    return inflight.get(connectionId)!;
  }

  const promise = createAdapter(connectionId);
  inflight.set(connectionId, promise);

  try {
    const adapter = await promise;
    adapterCache.set(connectionId, adapter);
    adapterTimestamps.set(connectionId, Date.now());
    return adapter;
  } finally {
    inflight.delete(connectionId);
  }
}

export async function testAdapter(config: ConnectionConfig): Promise<boolean> {
  await ensureAdaptersLoaded();

  if (isPluginAdapter(config.type)) {
    const adapter = createPluginAdapter(config.type);
    return adapter.test(config);
  }

  const def = getDriver(config.type);
  if (def?.adapter === "mongodb") {
    const { MongoAdapter } = await import("./mongodb-adapter");
    const adapter = new MongoAdapter();
    return adapter.test(config);
  }
  if (def?.adapter === "supabase") {
    const { SupabaseAdapter } = await import("./supabase-adapter");
    config.apiKey = config.password;
    const adapter = new SupabaseAdapter();
    return adapter.test(config);
  }
  const adapter = new SqlAdapter();
  return adapter.test(config);
}

export async function destroyAdapter(connectionId: string): Promise<void> {
  const adapter = adapterCache.get(connectionId);
  if (adapter) {
    try {
      await adapter.disconnect();
    } catch {
      // Ignore disconnect errors during cleanup
    }
  }
  adapterCache.delete(connectionId);
  adapterTimestamps.delete(connectionId);
  inflight.delete(connectionId);
}
