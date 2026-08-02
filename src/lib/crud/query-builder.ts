import { Knex } from "knex";

export interface ListParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  filters?: Record<string, string>;
}

export interface ListResult {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ColumnMeta {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable: string | null;
  referencedColumn: string | null;
  isNullable?: boolean;
  defaultValue?: string | null;
  allowedValues?: string[] | null;
  readOnly?: boolean;
}

export async function buildListQuery(
  knexInstance: Knex,
  tableName: string,
  params: ListParams,
  columns: ColumnMeta[]
): Promise<ListResult> {
  const { page, pageSize, sortBy, sortDir, search, filters } = params;
  const offset = (page - 1) * pageSize;

  const pkColumns = columns.filter((c) => c.isPrimaryKey);
  const orderColumn = sortBy || pkColumns[0]?.name || columns[0]?.name || "id";
  const orderDirection = sortDir || "asc";

  let query = knexInstance(tableName).select("*");
  let countQuery = knexInstance(tableName).count("* as total");

  if (search && columns.length > 0) {
    const searchableColumns = columns.filter(
      (c) =>
        ["character varying", "varchar", "text", "char", "character", "name", "citext"].includes(
          c.dataType
        )
    );
    if (searchableColumns.length > 0) {
      const searchConditions = searchableColumns.map((c) =>
        knexInstance.raw(`CAST("${c.name}" AS TEXT) ILIKE ?`, [`%${search}%`])
      );
      query = query.where(function () {
        for (const cond of searchConditions) {
          this.orWhere(cond);
        }
      });
      countQuery = countQuery.where(function () {
        for (const cond of searchConditions) {
          this.orWhere(cond);
        }
      });
    }
  }

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value && key !== "search") {
        query = query.andWhere(key, value);
        countQuery = countQuery.andWhere(key, value);
      }
    }
  }

  const [{ total }] = await countQuery;

  const data = await query
    .orderBy(orderColumn, orderDirection)
    .limit(pageSize)
    .offset(offset);

  return {
    data,
    total: Number(total),
    page,
    pageSize,
    totalPages: Math.ceil(Number(total) / pageSize),
  };
}

export async function buildGetQuery(
  knexInstance: Knex,
  tableName: string,
  pkColumn: string,
  pkValue: string
): Promise<Record<string, unknown> | null> {
  const row = await knexInstance(tableName)
    .select("*")
    .where(pkColumn, pkValue)
    .first();
  return row ?? null;
}

export async function buildInsertQuery(
  knexInstance: Knex,
  tableName: string,
  data: Record<string, unknown>,
  columns: ColumnMeta[]
): Promise<Record<string, unknown>> {
  const allowedKeys = columns.map((c) => c.name);
  const filteredData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.includes(key)) {
      filteredData[key] = value;
    }
  }

  const [result] = await knexInstance(tableName).insert(filteredData).returning("*");
  return result;
}

export async function buildUpdateQuery(
  knexInstance: Knex,
  tableName: string,
  pkColumn: string,
  pkValue: string,
  data: Record<string, unknown>,
  columns: ColumnMeta[]
): Promise<Record<string, unknown> | null> {
  const allowedKeys = columns
    .filter((c) => c.name !== pkColumn)
    .map((c) => c.name);
  const filteredData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowedKeys.includes(key) && !key.startsWith("_") && key !== pkColumn) {
      filteredData[key] = value;
    }
  }

  if (Object.keys(filteredData).length === 0) {
    return buildGetQuery(knexInstance, tableName, pkColumn, pkValue);
  }

  const [result] = await knexInstance(tableName)
    .where(pkColumn, pkValue)
    .update(filteredData)
    .returning("*");
  return result ?? null;
}

export async function buildDeleteQuery(
  knexInstance: Knex,
  tableName: string,
  pkColumn: string,
  pkValue: string
): Promise<boolean> {
  const deleted = await knexInstance(tableName)
    .where(pkColumn, pkValue)
    .delete();
  return deleted > 0;
}

export async function buildBulkDeleteQuery(
  knexInstance: Knex,
  tableName: string,
  pkColumn: string,
  pkValues: string[]
): Promise<number> {
  const deleted = await knexInstance(tableName)
    .whereIn(pkColumn, pkValues)
    .delete();
  return deleted;
}

export function getPkColumn(columns: ColumnMeta[]): ColumnMeta | undefined {
  return columns.find((c) => c.isPrimaryKey);
}

// eslint-disable-next-line security/detect-unsafe-regex
export function getColumnMap(columns: ColumnMeta[]): Map<string, ColumnMeta> {
  const map = new Map<string, ColumnMeta>();
  for (const col of columns) {
    map.set(col.name, col);
  }
  return map;
}

export function getDisplayColumns(columns: ColumnMeta[]): ColumnMeta[] {
  const textCols = columns.filter(
    (c) =>
      !c.isPrimaryKey &&
      ["character varying", "varchar", "text", "name", "citext"].includes(c.dataType)
  );
  const fallback = columns.filter((c) => !c.isPrimaryKey).slice(0, 2);
  return textCols.length > 0 ? textCols.slice(0, 2) : fallback;
}

export function getDisplayColumn(columns: ColumnMeta[]): string {
  const textCols = columns.filter(
    (c) =>
      !c.isPrimaryKey &&
      ["character varying", "varchar", "text", "name", "citext"].includes(c.dataType)
  );
  return textCols[0]?.name || columns[0]?.name || "id";
}

export function canSortColumn(dataType: string): boolean {
  return !["text", "json", "jsonb", "geometry", "bytea"].includes(dataType);
}
