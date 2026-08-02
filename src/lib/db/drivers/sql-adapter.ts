import crypto from "crypto";
import knex, { Knex } from "knex";
import type {
  DatabaseAdapter, ConnectionConfig, ListOptions, PaginatedResult,
  QueryResult, SchemaResult, ColumnSchema,
} from "./types";
import { getDriver } from "./registry";
import { parseCheckConstraints } from "./constraints";

export class SqlAdapter implements DatabaseAdapter {
  private instance: Knex | null = null;
  private config: ConnectionConfig | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    this.config = config;
    this.instance = this.buildKnex(config);
    await this.instance.raw("SELECT 1");
  }

  async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.destroy();
      this.instance = null;
    }
  }

  async test(config: ConnectionConfig): Promise<boolean> {
    const instance = this.buildKnex(config);
    try {
      await instance.raw("SELECT 1");
      return true;
    } finally {
      await instance.destroy();
    }
  }

  async introspect(): Promise<SchemaResult> {
    const dialect = this.getDialect();
    const tables = await this.getTables(dialect);
    const result: SchemaResult = { tables: [] };
    const checkConstraints = await this.fetchCheckConstraints(dialect);
    const foreignKeys = await this.fetchForeignKeys(dialect);

    // Batch load all columns and PKs for all tables (avoids N+1)
    const allColumns = await this.getAllColumns(dialect);
    const allPks = await this.getAllPrimaryKeys(dialect);

    for (const table of tables) {
      const columns = allColumns.get(table.name) || [];
      const pks = allPks.get(table.name) || [];
      const tableChecks = checkConstraints.get(table.name) || new Map<string, string[]>();
      const tableFks = foreignKeys.get(table.name) || new Map<string, { referencedTable: string; referencedColumn: string }>();
      for (const col of columns) {
        if (pks.includes(col.name)) col.isPrimaryKey = true;
        col.allowedValues = tableChecks.get(col.name) || null;
        if (tableFks.has(col.name)) {
          col.isForeignKey = true;
          col.referencedTable = tableFks.get(col.name)?.referencedTable ?? null;
          col.referencedColumn = tableFks.get(col.name)?.referencedColumn ?? null;
        }
      }
      result.tables.push({ name: table.name, type: table.type, columns });
    }

    return result;
  }

  async executeRaw(query: string, params?: unknown[], timeoutMs?: number): Promise<QueryResult> {
    const inst = this.getInstance();
    // Set statement timeout if provided (PostgreSQL)
    if (timeoutMs && this.isPostgres()) {
      await inst.raw(`SET statement_timeout TO ${Math.min(timeoutMs, 60000)}`);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await inst.raw(query, params as any);
      if (this.isPostgres()) {
        return { rows: result.rows || [], rowCount: result.rowCount ?? 0, fields: result.fields || [] };
      }
      if (Array.isArray(result)) {
        return { rows: result[0] || [], rowCount: result[0]?.length ?? 0, fields: [] };
      }
      return { rows: result || [], rowCount: 0, fields: [] };
    } finally {
      // Reset timeout
      if (timeoutMs && this.isPostgres()) {
        await inst.raw("SET statement_timeout TO 0").catch(() => {});
      }
    }
  }

  async list(table: string, options: ListOptions, columns: { name: string; isPrimaryKey: boolean; dataType: string }[]): Promise<PaginatedResult> {
    const inst = this.getInstance();
    const { page, pageSize, sortBy, sortDir, search, filters, cursor } = options;
    const dialect = this.getDialect();
    const pkColumn = sortBy || columns.find((c) => c.isPrimaryKey)?.name || columns[0]?.name || "id";

    let query = inst.select("*").from(table);
    let countQuery = inst.count("* as total").from(table);

    if (search && columns.length > 0) {
      const searchable = columns.filter((c) =>
        ["character varying", "varchar", "text", "char", "character", "name", "citext", "string"].includes(c.dataType)
      );
      if (searchable.length > 0) {
        const quote = (name: string) => {
          if (dialect === "mssql") return `[${name.replace(/\]/g, "]]")}]`;
          if (dialect === "mysql") return `\`${name.replace(/`/g, "``")}\``;
          return `"${name.replace(/"/g, '""')}"`;
        };
        const conditions = searchable.map((c) => {
          const q = quote(c.name);
          const escapedSearch = search.replace(/[\\%_]/g, "\\$&");
          if (dialect === "postgresql" || dialect === "supabase") {
            return inst.raw(`CAST(${q} AS TEXT) ILIKE ? ESCAPE '\\'`, [`%${escapedSearch}%`]);
          }
          return inst.raw(`CAST(${q} AS CHAR) LIKE ? ESCAPE '\\'`, [`%${escapedSearch}%`]);
        });
        query = query.where(function () {
          for (const cond of conditions) this.orWhere(cond);
        });
        countQuery = countQuery.where(function () {
          for (const cond of conditions) this.orWhere(cond);
        });
      }
    }

    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val && key !== "search") {
          query = query.andWhere(key, val);
          countQuery = countQuery.andWhere(key, val);
        }
      }
    }

    // Keyset pagination for efficient deep-page access
    if (cursor && sortBy) {
      const cursorVal = decodeURIComponent(cursor);
      const safeSortDir = sortDir === "desc" ? "desc" : "asc";
      if (safeSortDir === "asc") {
        query = query.andWhere(sortBy, ">", cursorVal);
      } else {
        query = query.andWhere(sortBy, "<", cursorVal);
      }
    }

    const countResult = await countQuery;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countRow = Array.isArray(countResult) ? countResult[0] : (countResult as any);
    const total = Number(countRow?.total ?? countRow?.["count(*)"] ?? 0);

    const sortCol = pkColumn;
    const safeSortDir = sortDir === "desc" ? "desc" : "asc";
    const data = await query
      .orderBy(sortCol, safeSortDir)
      .limit(pageSize)
      .offset(cursor ? 0 : (page - 1) * pageSize);

    // Generate cursor for next page
    const lastRow = data.length > 0 ? data[data.length - 1] : null;
    const nextCursor = lastRow && data.length === pageSize ? encodeURIComponent(String(lastRow[sortCol])) : null;

    return {
      data: data as Record<string, unknown>[],
      total: Number(total),
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
      nextCursor,
    };
  }

  async get(table: string, pkValue: string, pkColumn: string): Promise<Record<string, unknown> | null> {
    const inst = this.getInstance();
    const result = await inst.select("*").from(table).where(pkColumn, pkValue).first();
    return result || null;
  }

  async create(table: string, data: Record<string, unknown>, columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<Record<string, unknown>> {
    const inst = this.getInstance();
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
        } else if (["integer", "bigint", "smallint", "int", "int4", "int8", "int2", "serial", "bigserial", "smallserial"].includes(dt)) {
          delete insertData[key];
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
    if (this.isPostgres()) {
      const [result] = await inst.insert(filtered).into(table).returning("*");
      return result;
    }
    const pk = columns.find((c) => c.isPrimaryKey);
    const pkValue = pk ? (filtered[pk.name] as string | number | undefined) : undefined;
    const [insertId] = await inst.insert(filtered).into(table);
    if (pk && pkValue !== undefined) {
      const [result] = await inst.select("*").from(table).where(pk.name, pkValue).limit(1);
      return result || { ...filtered };
    }
    const [result] = await inst.select("*").from(table).where("id", insertId).limit(1);
    return result || { ...filtered, id: insertId };
  }

  async update(table: string, pkValue: string, pkColumn: string, data: Record<string, unknown>, _columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<Record<string, unknown>> {
    const inst = this.getInstance();
    if (this.isPostgres()) {
      const [result] = await inst(table).update(data).where(pkColumn, pkValue).returning("*");
      return result;
    }
    await inst(table).update(data).where(pkColumn, pkValue);
    const [result] = await inst.select("*").from(table).where(pkColumn, pkValue).limit(1);
    return result || data;
  }

  async delete(table: string, pkValue: string, pkColumn: string): Promise<void> {
    const inst = this.getInstance();
    await inst.delete().from(table).where(pkColumn, pkValue);
  }

  async bulkDelete(table: string, pkValues: string[], pkColumn: string): Promise<void> {
    const inst = this.getInstance();
    await inst.delete().from(table).whereIn(pkColumn, pkValues);
  }

  async bulkCreate(table: string, rows: Record<string, unknown>[], columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<number> {
    const inst = this.getInstance();
    const BATCH = 500;
    let imported = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const cleaned = batch.map((row) => {
        const cleanRow: Record<string, unknown> = {};
        for (const col of columns) {
          if (row[col.name] !== undefined) cleanRow[col.name] = row[col.name];
        }
        return cleanRow;
      });
      try {
        await inst(table).insert(cleaned);
        imported += cleaned.length;
      } catch {
        // Fallback: insert row-by-row for this batch
        for (const row of cleaned) {
          try {
            await inst(table).insert(row);
            imported++;
          } catch { /* skip failed rows */ }
        }
      }
    }
    return imported;
  }

  private getInstance(): Knex {
    if (!this.instance) throw new Error("Adapter not connected. Call connect() first.");
    return this.instance;
  }

  private buildKnex(config: ConnectionConfig): Knex {
    const def = this.getDriverDef(config.type);
    const connConfig: Knex.Config = {
      client: def?.client || "pg",
      connection: this.buildConnectionConfig(config),
      pool: {
        min: 0,
        max: 10,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 15000,
      },
    };
    return knex(connConfig);
  }

  private buildConnectionConfig(config: ConnectionConfig): Knex.StaticConnectionConfig {
    const def = this.getDriverDef(config.type);
    if (def?.fileBased) {
      return { filename: config.database } as unknown as Knex.StaticConnectionConfig;
    }
    const ssl = config.ssl ? { rejectUnauthorized: true } : false;
    return {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl,
    } as Knex.StaticConnectionConfig;
  }

  private getDialect(): string {
    return this.config?.type || "postgresql";
  }

  private isPostgres(): boolean {
    const t = this.config?.type;
    return t === "postgresql" || t === "supabase";
  }

  private getDriverDef(type: string) {
    return getDriver(type);
  }

  private extractRows(result: unknown): unknown[] {
    if (!result) return [];
    if (Array.isArray(result)) {
      const first = result[0];
      return Array.isArray(first) ? first : result;
    }
    const r = result as { rows?: unknown[]; recordset?: unknown[] };
    if (Array.isArray(r.rows)) return r.rows;
    if (Array.isArray(r.recordset)) return r.recordset;
    return [];
  }

  private async fetchCheckConstraints(dialect: string): Promise<Map<string, Map<string, string[]>>> {
    const result = new Map<string, Map<string, string[]>>();
    try {
      const inst = this.getInstance();
      let rows: unknown[] = [];
      if (dialect === "postgresql" || dialect === "supabase") {
        const res = await inst.raw(
          `SELECT c.relname AS table_name, pg_get_constraintdef(con.oid) AS def
           FROM pg_constraint con
           JOIN pg_class c ON c.oid = con.conrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE con.contype = 'c' AND n.nspname NOT IN ('pg_catalog', 'information_schema')`
        );
        rows = this.extractRows(res);
        for (const r of rows as { table_name?: string; def?: string }[]) {
          if (!r.table_name) continue;
          const matches = parseCheckConstraints(r.def || "");
          for (const match of matches) {
            if (!result.has(r.table_name)) result.set(r.table_name, new Map());
            result.get(r.table_name)?.set(match.column, match.values);
          }
        }
      } else if (dialect === "mysql") {
        const res = await inst.raw(
          `SELECT tc.TABLE_NAME AS table_name, cc.CHECK_CLAUSE AS def
           FROM information_schema.CHECK_CONSTRAINTS cc
           JOIN information_schema.TABLE_CONSTRAINTS tc
             ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
           WHERE tc.CONSTRAINT_TYPE = 'CHECK' AND cc.CONSTRAINT_SCHEMA = DATABASE()`
        );
        rows = this.extractRows(res);
        for (const r of rows as { table_name?: string; def?: string }[]) {
          if (!r.table_name) continue;
          const matches = parseCheckConstraints(r.def || "");
          for (const match of matches) {
            if (!result.has(r.table_name)) result.set(r.table_name, new Map());
            result.get(r.table_name)?.set(match.column, match.values);
          }
        }
      } else if (dialect === "sqlite") {
        const res = await inst.raw(
          `SELECT name AS table_name, sql AS def FROM sqlite_master WHERE type = 'table'`
        );
        rows = this.extractRows(res);
        for (const r of rows as { table_name?: string; def?: string }[]) {
          if (!r.table_name) continue;
          const matches = parseCheckConstraints(r.def || "");
          for (const match of matches) {
            if (!result.has(r.table_name)) result.set(r.table_name, new Map());
            result.get(r.table_name)?.set(match.column, match.values);
          }
        }
      } else if (dialect === "mssql") {
        const res = await inst.raw(
          `SELECT OBJECT_NAME(parent_object_id) AS table_name, definition AS def FROM sys.check_constraints`
        );
        rows = this.extractRows(res);
        for (const r of rows as { table_name?: string; def?: string }[]) {
          if (!r.table_name) continue;
          const matches = parseCheckConstraints(r.def || "");
          for (const match of matches) {
            if (!result.has(r.table_name)) result.set(r.table_name, new Map());
            result.get(r.table_name)?.set(match.column, match.values);
          }
        }
      }
    } catch {
      // Check constraints are a best-effort enhancement
    }
    return result;
  }

  private async fetchForeignKeys(dialect: string): Promise<Map<string, Map<string, { referencedTable: string; referencedColumn: string }>>> {
    const result = new Map<string, Map<string, { referencedTable: string; referencedColumn: string }>>();
    try {
      const inst = this.getInstance();
      let rows: unknown[] = [];
      if (dialect === "postgresql" || dialect === "supabase") {
        const res = await inst.raw(
          `SELECT c.relname AS table_name, a.attname AS column_name,
                  c2.relname AS referenced_table, a2.attname AS referenced_column
           FROM pg_constraint con
           JOIN pg_class c ON c.oid = con.conrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY (con.conkey)
           JOIN pg_class c2 ON c2.oid = con.confrelid
           JOIN pg_attribute a2 ON a2.attrelid = con.confrelid AND a2.attnum = ANY (con.confkey)
           WHERE con.contype = 'f' AND n.nspname NOT IN ('pg_catalog', 'information_schema')`
        );
        rows = this.extractRows(res);
      } else if (dialect === "mysql") {
        const res = await inst.raw(
          `SELECT kcu.TABLE_NAME AS table_name, kcu.COLUMN_NAME AS column_name,
                  kcu.REFERENCED_TABLE_NAME AS referenced_table, kcu.REFERENCED_COLUMN_NAME AS referenced_column
           FROM information_schema.KEY_COLUMN_USAGE kcu
           WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.REFERENCED_TABLE_NAME IS NOT NULL`
        );
        rows = this.extractRows(res);
      } else if (dialect === "sqlite") {
        const tableRes = await inst.raw(`SELECT name AS table_name FROM sqlite_master WHERE type = 'table'`);
        const tableRows = this.extractRows(tableRes) as { table_name?: string }[];
        for (const t of tableRows) {
          if (!t.table_name) continue;
          const safeName = t.table_name.replace(/"/g, '""');
          const fkRes = await inst.raw(`PRAGMA foreign_key_list("${safeName}")`);
          const fkRows = this.extractRows(fkRes) as { table?: string; from?: string; to?: string }[];
          for (const fk of fkRows) {
            if (!fk.from || !fk.table) continue;
            if (!result.has(t.table_name)) result.set(t.table_name, new Map());
            result.get(t.table_name)?.set(fk.from, {
              referencedTable: fk.table,
              referencedColumn: fk.to || "id",
            });
          }
        }
        return result;
      } else if (dialect === "mssql") {
        const res = await inst.raw(
          `SELECT OBJECT_NAME(fk.parent_object_id) AS table_name, pc.name AS column_name,
                  OBJECT_NAME(fk.referenced_object_id) AS referenced_table, rc.name AS referenced_column
           FROM sys.foreign_keys fk
           JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
           JOIN sys.columns pc ON pc.object_id = fk.parent_object_id AND pc.column_id = fkc.parent_column_id
           JOIN sys.columns rc ON rc.object_id = fk.referenced_object_id AND rc.column_id = fkc.referenced_column_id`
        );
        rows = this.extractRows(res);
      }
      for (const r of rows as { table_name?: string; column_name?: string; referenced_table?: string; referenced_column?: string }[]) {
        if (!r.table_name || !r.column_name || !r.referenced_table) continue;
        if (!result.has(r.table_name)) result.set(r.table_name, new Map());
        result.get(r.table_name)?.set(r.column_name, {
          referencedTable: r.referenced_table,
          referencedColumn: r.referenced_column || "id",
        });
      }
    } catch {
      // Foreign keys are a best-effort enhancement
    }
    return result;
  }

  private async getAllColumns(dialect: string): Promise<Map<string, ColumnSchema[]>> {
    const result = new Map<string, ColumnSchema[]>();
    const inst = this.getInstance();
    try {
      if (dialect === "postgresql" || dialect === "supabase") {
        const res = await inst.raw(
          `SELECT table_name AS "tableName", column_name AS "name", data_type AS "dataType",
                  is_nullable AS "isNullable", column_default AS "defaultValue",
                  COALESCE(character_maximum_length, numeric_precision) AS "maxLength"
           FROM information_schema.columns
           WHERE table_schema = 'public'`
        );
        for (const r of res.rows as Record<string, unknown>[]) {
          const table = String(r.tableName);
          if (!result.has(table)) result.set(table, []);
          result.get(table)!.push({
            name: String(r.name),
            dataType: String(r.dataType),
            isNullable: r.isNullable === "YES",
            isPrimaryKey: false,
            defaultValue: r.defaultValue as string | null,
            maxLength: r.maxLength as number | null,
          });
        }
      } else {
        const dbName = this.config?.database || "";
        const schemaFilter = dialect === "mysql" ? dbName : "public";
        const res = await inst.raw(
          `SELECT table_name AS tableName, column_name AS name, data_type AS dataType,
                  is_nullable AS isNullable, column_default AS defaultValue,
                  COALESCE(character_maximum_length, numeric_precision) AS maxLength
           FROM information_schema.columns
           WHERE table_schema = ?`,
          [schemaFilter]
        );
        const rows = Array.isArray(res) ? res[0] : (this.extractRows(res) as Record<string, unknown>[]);
        for (const r of rows) {
          const table = String(r.tableName || r.table_name);
          if (!result.has(table)) result.set(table, []);
          result.get(table)!.push({
            name: String(r.name || r.column_name),
            dataType: String(r.dataType || r.data_type),
            isNullable: (r.isNullable || r.is_nullable) === "YES",
            isPrimaryKey: false,
            defaultValue: (r.defaultValue || r.column_default) as string | null,
            maxLength: (r.maxLength ?? null) as number | null,
          });
        }
      }
    } catch {
      // Fallback to per-table loading
    }
    return result;
  }

  private async getAllPrimaryKeys(dialect: string): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    const inst = this.getInstance();
    try {
      if (dialect === "postgresql" || dialect === "supabase") {
        const res = await inst.raw(
          `SELECT tc.table_name AS "tableName", kcu.column_name AS "name"
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
           WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'`
        );
        for (const r of res.rows as Record<string, unknown>[]) {
          const table = String(r.tableName);
          if (!result.has(table)) result.set(table, []);
          result.get(table)!.push(String(r.name));
        }
      } else {
        const dbName = this.config?.database || "";
        const schemaFilter = dialect === "mysql" ? dbName : "public";
        const res = await inst.raw(
          `SELECT tc.table_name AS tableName, kcu.column_name AS name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
           WHERE tc.table_schema = ? AND tc.constraint_type = 'PRIMARY KEY'`,
          [schemaFilter]
        );
        const rows = Array.isArray(res) ? res[0] : (this.extractRows(res) as Record<string, unknown>[]);
        for (const r of rows) {
          const table = String(r.tableName || r.table_name);
          if (!result.has(table)) result.set(table, []);
          result.get(table)!.push(String(r.name || r.column_name));
        }
      }
    } catch {
      // Fallback to per-table loading
    }
    return result;
  }

  private async getTables(dialect: string): Promise<{ name: string; type: "table" | "view" }[]> {
    const inst = this.getInstance();
    if (dialect === "postgresql" || dialect === "supabase") {
      const result = await inst.raw(
        `SELECT table_name AS name, table_type AS type FROM information_schema.tables WHERE table_schema = 'public'`
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.rows.map((r: any) => ({
        name: r.name || r.table_name,
        type: (r.type || r.table_type) === "VIEW" ? "view" as const : "table" as const,
      }));
    }
    const dbName = this.config?.database || "";
    const schemaFilter = dialect === "mysql" ? dbName : "public";
    const result = await inst.raw(
      `SELECT table_name AS name, table_type AS type FROM information_schema.tables WHERE table_schema = ?`,
      [schemaFilter]
    );
    if (Array.isArray(result)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result[0].map((r: any) => ({
        name: r.name || r.table_name,
        type: (r.type || r.table_type) === "VIEW" ? "view" as const : "table" as const,
      }));
    }
    return [];
  }

  private async getColumns(dialect: string, tableName: string): Promise<ColumnSchema[]> {
    const inst = this.getInstance();
    if (dialect === "postgresql" || dialect === "supabase") {
      const result = await inst.raw(
        `SELECT column_name AS name, data_type AS "dataType", is_nullable AS "isNullable",
                column_default AS "defaultValue", COALESCE(character_maximum_length, numeric_precision) AS "maxLength"
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = ?`,
        [tableName]
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.rows.map((r: any) => ({
        name: r.name || r.column_name,
        dataType: r.dataType || r.data_type,
        isNullable: (r.isNullable || r.is_nullable) === "YES",
        isPrimaryKey: false,
        defaultValue: r.defaultValue || r.column_default,
        maxLength: r.maxLength ?? null,
      }));
    }
    const dbName = this.config?.database || "";
    const schemaFilter = dialect === "mysql" ? dbName : "public";
    const result = await inst.raw(
      `SELECT column_name AS name, data_type AS dataType, is_nullable AS isNullable,
              column_default AS defaultValue, COALESCE(character_maximum_length, numeric_precision) AS maxLength
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ?`,
      [schemaFilter, tableName]
    );
    if (Array.isArray(result)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result[0].map((r: any) => ({
        name: r.name || r.column_name,
        dataType: r.dataType || r.data_type,
        isNullable: (r.isNullable || r.is_nullable) === "YES",
        isPrimaryKey: false,
        defaultValue: r.defaultValue || r.column_default,
        maxLength: r.maxLength ?? null,
      }));
    }
    return [];
  }

  private async getPrimaryKeys(dialect: string, tableName: string): Promise<string[]> {
    const inst = this.getInstance();
    if (dialect === "postgresql" || dialect === "supabase") {
      const result = await inst.raw(
        `SELECT kcu.column_name AS name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_schema = 'public' AND tc.table_name = ? AND tc.constraint_type = 'PRIMARY KEY'`,
        [tableName]
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (result.rows || []).map((r: any) => r.name || r.column_name);
    }
    const dbName = this.config?.database || "";
    const schemaFilter = dialect === "mysql" ? dbName : "public";
    const result = await inst.raw(
      `SELECT kcu.column_name AS name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_schema = ? AND tc.table_name = ? AND tc.constraint_type = 'PRIMARY KEY'`,
      [schemaFilter, tableName]
    );
    if (Array.isArray(result)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result[0].map((r: any) => r.name || r.column_name);
    }
    return [];
  }
}


