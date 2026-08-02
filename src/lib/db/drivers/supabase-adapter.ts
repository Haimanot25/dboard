import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  DatabaseAdapter, ConnectionConfig, ListOptions, PaginatedResult,
  QueryResult, SchemaResult, ColumnSchema,
} from "./types";
import { parseCheckConstraints } from "./constraints";

export class SupabaseAdapter implements DatabaseAdapter {
  private client: SupabaseClient | null = null;
  private restUrl: string = "";
  private apiKey: string = "";

  async connect(config: ConnectionConfig): Promise<void> {
    if (!config.apiKey) throw new Error("Supabase requires an API key");
    this.apiKey = config.apiKey;
    let url = config.host;
    if (!url.startsWith("http")) url = `https://${url}`;
    this.restUrl = url.replace(/\/+$/, "");
    this.client = createClient(this.restUrl, config.apiKey, {
      db: { schema: "public" },
    });
    const res = await fetch(`${this.restUrl}/rest/v1/`, {
      headers: {
        apikey: this.apiKey,
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
    });
    if (res.status === 401 && !res.ok) {
      const text = await res.text().catch(() => "unknown error");
      throw new Error(`Supabase connection failed (401 Unauthorized): Check your API key. Server says: ${text}`);
    }
    if (res.status === 404) {
      return;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
      throw new Error(`Supabase connection failed (${res.status}): ${text}`);
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async test(config: ConnectionConfig): Promise<boolean> {
    try { await this.connect(config); await this.disconnect(); return true; }
    catch { return false; }
  }

  async introspect(): Promise<SchemaResult> {
    const result: SchemaResult = { tables: [] };
    const doc = await this.fetchOpenApiSchema();
    if (!doc) return result;

    // Support both Swagger 2.0 (definitions) and OpenAPI 3.0 (components.schemas)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const definitions = (doc as any).definitions || (doc as any).components?.schemas || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paths = (doc as any).paths || {};

    const checkConstraints = await this.fetchCheckConstraints();
    const foreignKeys = await this.fetchForeignKeys();

    for (const [path, methods] of Object.entries(paths)) {
      const tableName = path.replace(/^\//, "");
      if (!tableName || tableName.startsWith("rpc/") || tableName.startsWith("/rpc/")) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(methods as any)?.get) continue;

      const def = definitions[tableName];
      if (!def) continue;

      const props = def.properties || {};
      const required = new Set<string>(def.required || []);
      const tableConstraints = checkConstraints.get(tableName) || new Map<string, string[]>();
      const tableFks = foreignKeys.get(tableName) || new Map<string, { referencedTable: string; referencedColumn: string }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const columns: ColumnSchema[] = Object.entries(props).map(([name, prop]: [string, any]) => ({
        name,
        dataType: prop.format || prop.type || "text",
        isPrimaryKey: name === "id",
        isNullable: !required.has(name),
        defaultValue: null,
        maxLength: prop.maxLength ?? null,
        allowedValues: tableConstraints.get(name) || null,
        isForeignKey: tableFks.has(name),
        referencedTable: tableFks.get(name)?.referencedTable || null,
        referencedColumn: tableFks.get(name)?.referencedColumn || null,
      }));

      result.tables.push({
        name: tableName,
        type: "table",
        columns,
      });
    }
    return result;
  }

  private async fetchCheckConstraints(): Promise<Map<string, Map<string, string[]>>> {
    const result = new Map<string, Map<string, string[]>>();
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc("exec_sql", {
        query_text: `
          SELECT n.nspname AS schema_name, c.relname AS table_name,
                 pg_get_constraintdef(con.oid) AS def
          FROM pg_constraint con
          JOIN pg_class c ON c.oid = con.conrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE con.contype = 'c' AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage')
        `,
      });
      if (error || !data) return result;
      const rows = Array.isArray(data) ? data : (data as { schema_name: string; table_name: string; def: string }[]);
      for (const row of rows) {
        const tableName = row.table_name;
        if (!result.has(tableName)) result.set(tableName, new Map<string, string[]>());
        const matches = parseCheckConstraints(row.def || "");
        for (const match of matches) {
          result.get(tableName)?.set(match.column, match.values);
        }
      }
    } catch {
      // exec_sql may not exist or may fail; check constraints are a best-effort enhancement
    }
    return result;
  }

  private async fetchForeignKeys(): Promise<Map<string, Map<string, { referencedTable: string; referencedColumn: string }>>> {
    const result = new Map<string, Map<string, { referencedTable: string; referencedColumn: string }>>();
    try {
      const client = this.getClient();
      const { data, error } = await client.rpc("exec_sql", {
        query_text: `
          SELECT c.relname AS table_name,
                 a.attname AS column_name,
                 n2.nspname AS ref_schema,
                 c2.relname AS referenced_table,
                 a2.attname AS referenced_column
          FROM pg_constraint con
          JOIN pg_class c ON c.oid = con.conrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
          JOIN pg_class c2 ON c2.oid = con.confrelid
          JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
          JOIN pg_attribute a2 ON a2.attrelid = con.confrelid AND a2.attnum = ANY (con.confkey)
          WHERE con.contype = 'f' AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage')
        `,
      });
      if (error || !data) return result;
      const rows = Array.isArray(data)
        ? data
        : (data as { table_name: string; column_name: string; referenced_table: string; referenced_column: string }[]);
      for (const row of rows) {
        const tableName = row.table_name;
        if (!result.has(tableName)) result.set(tableName, new Map());
        result.get(tableName)?.set(row.column_name, {
          referencedTable: row.referenced_table,
          referencedColumn: row.referenced_column,
        });
      }
    } catch {
      // exec_sql may not exist or may fail; foreign keys are a best-effort enhancement
    }
    return result;
  }

  async executeRaw(query: string, _params?: unknown[]): Promise<QueryResult> {
    const client = this.getClient();
    const cleanQuery = query.trim().replace(/;\s*$/, "").split(";")[0];
    if (!cleanQuery) return { rows: [], rowCount: 0, fields: [] };
    const { data, error } = await client.rpc("exec_sql", { query_text: cleanQuery });
    if (error) {
      if (error.message?.includes("function") && error.message?.includes("exec_sql")) {
        throw new Error(
          "Raw SQL requires the `exec_sql` function. Run this in your Supabase SQL editor:\n\n" +
          "CREATE OR REPLACE FUNCTION exec_sql(query_text text)\n" +
          "RETURNS JSON AS $$\n" +
          "DECLARE result JSON;\n" +
          "BEGIN\n" +
          "  EXECUTE 'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (' || query_text || ') t' INTO result;\n" +
          "  RETURN result;\n" +
          "END;\n" +
          "$$ LANGUAGE plpgsql SECURITY DEFINER;"
        );
      }
      if (error.message?.includes("structure of query does not match")) {
        throw new Error(
          "The `exec_sql` function needs to be updated. Run this in your Supabase SQL editor to replace it:\n\n" +
          "CREATE OR REPLACE FUNCTION exec_sql(query_text text)\n" +
          "RETURNS JSON AS $$\n" +
          "DECLARE result JSON;\n" +
          "BEGIN\n" +
          "  EXECUTE 'SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM (' || query_text || ') t' INTO result;\n" +
          "  RETURN result;\n" +
          "END;\n" +
          "$$ LANGUAGE plpgsql SECURITY DEFINER;"
        );
      }
      throw new Error(`Supabase query failed: ${error.message}`);
    }
    const rows = (Array.isArray(data) ? data : [data]).filter(Boolean) as Record<string, unknown>[];
    return { rows, rowCount: rows.length, fields: [] };
  }

  async list(table: string, options: ListOptions, columns: { name: string; isPrimaryKey: boolean; dataType: string }[]): Promise<PaginatedResult> {
    const client = this.getClient();
    const { page, pageSize, sortBy, sortDir, search, filters } = options;
    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = client.from(table).select("*", { count: "exact", head: false });

    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val && key !== "search") query = query.eq(key, val);
      }
    }
    if (sortBy) query = query.order(sortBy, { ascending: sortDir !== "desc" });
    if (search) {
      // Strip chars that can break out of the PostgREST or() filter expression
      const safeSearch = search.replace(/[,()]/g, "");
      const orConditions: string[] = [];
      for (const col of columns) {
        if (["character varying", "varchar", "text", "char", "name", "string"].includes(col.dataType)) {
          orConditions.push(`${col.name}.ilike.%${safeSearch}%`);
        }
      }
      if (orConditions.length > 0) {
        query = query.or(orConditions.join(","));
      }
    }
    query = query.range(rangeFrom, rangeTo);

    const { data, error, count } = await query;
    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    return {
      data: (data || []) as Record<string, unknown>[],
      total: count ?? 0, page, pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    };
  }

  async get(table: string, pkValue: string, pkColumn: string): Promise<Record<string, unknown> | null> {
    const client = this.getClient();
    const { data, error } = await client.from(table).select("*").eq(pkColumn, pkValue).maybeSingle();
    if (error) throw new Error(`Supabase get failed: ${error.message}`);
    return data as Record<string, unknown> | null;
  }

  async create(table: string, data: Record<string, unknown>, columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<Record<string, unknown>> {
    const client = this.getClient();
    const insertData = { ...data };

    for (const col of columns) {
      const key = col.name;
      const val = insertData[key];
      const isEmpty = val === null || val === undefined || val === "";
      const dt = col.dataType.toLowerCase();
      const isTimestamp = dt.startsWith("timestamp") || dt === "datetime";
      const nameLower = key.toLowerCase();
      const isTimeField = nameLower.includes("createdat") || nameLower.includes("updatedat") || nameLower.includes("modifiedat") || nameLower.includes("created_at") || nameLower.includes("updated_at") || nameLower.includes("modified_at");

      if (col.isPrimaryKey && isEmpty) {
        if (dt === "uuid" || dt.includes("uuid")) {
          insertData[key] = crypto.randomUUID();
        } else if (["integer", "bigint", "smallint", "int", "int4", "int8", "int2"].includes(dt)) {
          insertData[key] = Math.floor(Date.now() / 1000) + crypto.randomInt(0, 1000);
        } else {
          insertData[key] = crypto.randomUUID();
        }
      } else if (isEmpty && isTimeField && isTimestamp) {
        insertData[key] = new Date().toISOString();
      } else if (isEmpty && isTimeField) {
        insertData[key] = dt === "date" ? new Date().toISOString().slice(0, 10) : new Date().toISOString();
      }
    }

    const filtered = Object.fromEntries(
      Object.entries(insertData).filter(([, v]) => v !== null && v !== undefined && v !== "")
    );
    const { data: result, error } = await client.from(table).insert(filtered).select().single();
    if (error) throw new Error(`Supabase create failed: ${error.message}`);
    return result as Record<string, unknown>;
  }

  async update(table: string, pkValue: string, pkColumn: string, data: Record<string, unknown>, _columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<Record<string, unknown>> {
    const client = this.getClient();
    const { data: result, error } = await client.from(table).update(data).eq(pkColumn, pkValue).select().single();
    if (error) throw new Error(`Supabase update failed: ${error.message}`);
    return result as Record<string, unknown>;
  }

  async delete(table: string, pkValue: string, pkColumn: string): Promise<void> {
    const client = this.getClient();
    const { error } = await client.from(table).delete().eq(pkColumn, pkValue);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }

  async bulkDelete(table: string, pkValues: string[], pkColumn: string): Promise<void> {
    const client = this.getClient();
    // Chunk to stay within URL length limits for PostgREST in() filters
    const CHUNK = 800;
    for (let i = 0; i < pkValues.length; i += CHUNK) {
      const chunk = pkValues.slice(i, i + CHUNK);
      const { error } = await client.from(table).delete().in(pkColumn, chunk);
      if (error) throw new Error(`Supabase bulk delete failed: ${error.message}`);
    }
  }

  async bulkCreate(table: string, rows: Record<string, unknown>[], _columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<number> {
    const client = this.getClient();
    const BATCH = 500;
    let imported = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await client.from(table).insert(batch);
      if (error) {
        for (const row of batch) {
          const { error: rowErr } = await client.from(table).insert(row);
          if (!rowErr) imported++;
        }
      } else {
        imported += batch.length;
      }
    }
    return imported;
  }

  private getClient(): SupabaseClient {
    if (!this.client) throw new Error("Supabase adapter not connected. Call connect() first.");
    return this.client;
  }

  private async fetchOpenApiSchema(): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(`${this.restUrl}/rest/v1/`, {
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/openapi+json;version=3, application/json",
        },
      });
      if (!res.ok) return null;
      return await res.json() as Record<string, unknown>;
    } catch {
      return null;
    }
  }

}
