import { MongoClient, Db, ObjectId, Document } from "mongodb";
import type {
  DatabaseAdapter, ConnectionConfig, ListOptions, PaginatedResult,
  QueryResult, SchemaResult, ColumnSchema,
} from "./types";

export class MongoAdapter implements DatabaseAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    const uri = config.username
      ? `mongodb://${encodeURIComponent(config.username)}:${encodeURIComponent(config.password || "")}@${config.host}:${config.port}/${config.database}?authSource=admin`
      : `mongodb://${config.host}:${config.port}/${config.database}`;

    this.client = new MongoClient(uri, {
      ssl: config.ssl || undefined,
      serverSelectionTimeoutMS: 5000,
    });
    await this.client.connect();
    this.db = this.client.db(config.database);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async test(config: ConnectionConfig): Promise<boolean> {
    const uri = config.username
      ? `mongodb://${encodeURIComponent(config.username)}:${encodeURIComponent(config.password || "")}@${config.host}:${config.port}/${config.database}?authSource=admin`
      : `mongodb://${config.host}:${config.port}/${config.database}`;

    const client = new MongoClient(uri, {
      ssl: config.ssl || undefined,
      serverSelectionTimeoutMS: 5000,
    });
    try {
      await client.connect();
      await client.db(config.database).command({ ping: 1 });
      return true;
    } finally {
      await client.close();
    }
  }

  async introspect(): Promise<SchemaResult> {
    const db = this.getDb();
    const collections = await db.listCollections().toArray();
    const tables: SchemaResult["tables"] = [];

    for (const coll of collections) {
      const sample = await db.collection(coll.name).find().limit(100).toArray();
      const columns = this.inferColumns(sample);
      tables.push({ name: coll.name, type: "table", columns });
    }

    return { tables };
  }

  async executeRaw(query: string, _params?: unknown[]): Promise<QueryResult> {
    const db = this.getDb();
    let parsed: { collection: string; operation?: string; pipeline?: Document[]; data?: Document; filter?: Document; update?: Document };

    try {
      parsed = JSON.parse(query);
    } catch {
      throw new Error("MongoDB query must be JSON: { \"collection\": \"name\", \"pipeline\": [...] }");
    }

    const { collection, operation, pipeline, data, filter, update } = parsed;
    if (!collection) throw new Error("Missing 'collection' field in query JSON");

    if (operation === "insert" && data) {
      const result = await db.collection(collection).insertOne(data as Document);
      return { rows: [{ insertedId: result.insertedId }], rowCount: 1, fields: [{ name: "insertedId" }] };
    }
    if (operation === "update" && filter && update) {
      const result = await db.collection(collection).updateMany(filter as Document, { $set: update as Document });
      return { rows: [{ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }], rowCount: result.modifiedCount, fields: [{ name: "matchedCount" }, { name: "modifiedCount" }] };
    }
    if (operation === "delete" && filter) {
      const result = await db.collection(collection).deleteMany(filter as Document);
      return { rows: [{ deletedCount: result.deletedCount }], rowCount: result.deletedCount, fields: [{ name: "deletedCount" }] };
    }

    const cursor = pipeline && pipeline.length > 0
      ? db.collection(collection).aggregate(pipeline)
      : db.collection(collection).find();

    const docs = await cursor.limit(10000).toArray();
    const rows = docs.map((d) => this.serializeDoc(d));

    return {
      rows,
      rowCount: rows.length,
      fields: rows.length > 0 ? Object.keys(rows[0]).map((name) => ({ name })) : [],
    };
  }

  async list(table: string, options: ListOptions, columns: { name: string; isPrimaryKey: boolean; dataType: string }[]): Promise<PaginatedResult> {
    const db = this.getDb();
    const { page, pageSize, sortBy, sortDir, search, filters } = options;

    const filter: Document = {};
    if (search) {
      const escaped = MongoAdapter.escapeRegex(search);
      const searchFields = [
        "_id",
        ...columns
          .filter((c) => ["string", "text", "varchar", "char", "character varying", "name"].includes(c.dataType))
          .map((c) => c.name),
      ];
      filter.$or = searchFields.map((f) => ({ [f]: { $regex: escaped, $options: "i" } }));
    }
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val && key !== "search" && !key.startsWith("$")) {
          filter[key] = val;
        }
      }
    }

    const total = await db.collection(table).countDocuments(filter);
    const sortField: Document = {};
    if (sortBy) {
      sortField[sortBy] = sortDir === "desc" ? -1 : 1;
    }

    const docs = await db.collection(table)
      .find(filter)
      .sort(sortField)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    const data = docs.map((d) => this.serializeDoc(d));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async get(table: string, pkValue: string, pkColumn: string): Promise<Record<string, unknown> | null> {
    const db = this.getDb();
    const filter = this.buildPkFilter(pkColumn, pkValue);
    const doc = await db.collection(table).findOne(filter);
    return doc ? this.serializeDoc(doc) : null;
  }

  async create(table: string, data: Record<string, unknown>, _columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<Record<string, unknown>> {
    const db = this.getDb();
    const doc = Object.fromEntries(
      Object.entries(data).filter(([k, v]) => k !== "_id" && v !== null && v !== undefined && v !== "")
    );
    const result = await db.collection(table).insertOne(doc as Document);
    return this.serializeDoc({ ...doc, _id: result.insertedId });
  }

  async update(table: string, pkValue: string, pkColumn: string, data: Record<string, unknown>, _columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<Record<string, unknown>> {
    const db = this.getDb();
    const update = { ...data };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (update as any)._id;
    const filter = this.buildPkFilter(pkColumn, pkValue);
    await db.collection(table).updateOne(filter, { $set: update as Document });
    const doc = await db.collection(table).findOne(filter);
    return doc ? this.serializeDoc(doc) : update;
  }

  async delete(table: string, pkValue: string, pkColumn: string): Promise<void> {
    const db = this.getDb();
    const filter = this.buildPkFilter(pkColumn, pkValue);
    await db.collection(table).deleteOne(filter);
  }

  async bulkDelete(table: string, pkValues: string[], pkColumn: string): Promise<void> {
    const db = this.getDb();
    const filters = pkValues.map((v) => this.buildPkFilter(pkColumn, v));
    await db.collection(table).deleteMany({ $or: filters });
  }

  async bulkCreate(table: string, rows: Record<string, unknown>[], _columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<number> {
    const db = this.getDb();
    const BATCH = 500;
    let imported = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      try {
        await db.collection(table).insertMany(batch);
        imported += batch.length;
      } catch {
        for (const row of batch) {
          try { await db.collection(table).insertOne(row); imported++; } catch { /* skip */ }
        }
      }
    }
    return imported;
  }

  private getDb(): Db {
    if (!this.db) throw new Error("MongoAdapter not connected. Call connect() first.");
    return this.db;
  }

  private serializeDoc(doc: Document): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(doc)) {
      result[key] = val instanceof ObjectId ? val.toHexString() : val;
    }
    return result;
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private buildPkFilter(pkColumn: string, pkValue: string): Document {
    if (pkColumn === "_id" || pkColumn === "id") {
      try {
        return { _id: new ObjectId(pkValue) };
      } catch {
        return { _id: pkValue };
      }
    }
    return { [pkColumn]: pkValue };
  }

  private inferColumns(samples: Document[]): ColumnSchema[] {
    const fieldTypes = new Map<string, Set<string>>();

    for (const doc of samples) {
      for (const [key, val] of Object.entries(doc)) {
        if (!fieldTypes.has(key)) fieldTypes.set(key, new Set());
        const type = val === null ? "null" : Array.isArray(val) ? "array" : typeof val;
        fieldTypes.get(key)!.add(type);
      }
    }

    const columns: ColumnSchema[] = [];
    for (const [name, types] of Array.from(fieldTypes)) {
      const typeStr = Array.from(types).filter((t) => t !== "null").join(",") || "null";
      columns.push({
        name,
        dataType: typeStr,
        isNullable: types.has("null"),
        isPrimaryKey: name === "_id",
        defaultValue: null,
        maxLength: null,
      });
    }

    return columns;
  }
}
