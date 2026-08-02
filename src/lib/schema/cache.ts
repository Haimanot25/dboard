import { getAdapter } from "@/lib/db/drivers/get-adapter";
import type { IntrospectedSchema } from "@/types/schema";

interface SchemaCacheEntry {
  data: IntrospectedSchema;
  fetchedAt: number;
}

const schemaCache = new Map<string, SchemaCacheEntry>();
const CACHE_TTL = 60000;
const MAX_CACHE_ENTRIES = 100;

export async function getIntrospectedSchema(
  connectionId: string
): Promise<IntrospectedSchema> {
  const cached = schemaCache.get(connectionId);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  const adapter = await getAdapter(connectionId);
  const schema = await adapter.introspect();

  const data = {
    tables: schema.tables.map((t) => ({
      name: t.name,
      type: t.type,
      columns: t.columns.map((c) => ({
        name: c.name,
        dataType: c.dataType,
        isNullable: c.isNullable,
        defaultValue: c.defaultValue,
        isPrimaryKey: c.isPrimaryKey,
        isForeignKey: c.isForeignKey ?? false,
        referencedTable: c.referencedTable ?? null,
        referencedColumn: c.referencedColumn ?? null,
        allowedValues: c.allowedValues ?? null,
        indexes: [] as { name: string; columns: string[]; unique: boolean; primary: boolean }[],
      })),
    })),
  };

  schemaCache.set(connectionId, { data, fetchedAt: now });
  if (schemaCache.size > MAX_CACHE_ENTRIES) {
    const oldest = Array.from(schemaCache.entries()).sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0];
    if (oldest) schemaCache.delete(oldest[0]);
  }
  return data;
}

export function invalidateSchemaCache(connectionId: string): void {
  schemaCache.delete(connectionId);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(schemaCache.entries())) {
    if (now - entry.fetchedAt > CACHE_TTL * 2) schemaCache.delete(key);
  }
}, 60000);
