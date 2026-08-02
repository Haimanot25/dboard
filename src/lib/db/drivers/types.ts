export interface ConnectionConfig {
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl: boolean;
  apiKey?: string;
  projectRef?: string;
}

export interface ListOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  filters?: Record<string, string>;
  cursor?: string;
}

export interface PaginatedResult {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nextCursor?: string | null;
}

export interface ColumnSchema {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue: string | null;
  maxLength: number | null;
  allowedValues?: string[] | null;
  isForeignKey?: boolean;
  referencedTable?: string | null;
  referencedColumn?: string | null;
}

export interface TableSchema {
  name: string;
  type: "table" | "view";
  columns: ColumnSchema[];
}

export interface SchemaResult {
  tables: TableSchema[];
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: { name: string; dataType?: string }[];
}

export interface DatabaseAdapter {
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  test(config: ConnectionConfig): Promise<boolean>;
  introspect(): Promise<SchemaResult>;
  executeRaw(query: string, params?: unknown[], timeoutMs?: number): Promise<QueryResult>;
  list(table: string, options: ListOptions, columns: { name: string; isPrimaryKey: boolean; dataType: string }[]): Promise<PaginatedResult>;
  get(table: string, pkValue: string, pkColumn: string): Promise<Record<string, unknown> | null>;
  create(table: string, data: Record<string, unknown>, columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<Record<string, unknown>>;
  bulkCreate?(table: string, rows: Record<string, unknown>[], columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<number>;
  update(table: string, pkValue: string, pkColumn: string, data: Record<string, unknown>, columns: { name: string; dataType: string; isPrimaryKey: boolean }[]): Promise<Record<string, unknown>>;
  delete(table: string, pkValue: string, pkColumn: string): Promise<void>;
  bulkDelete(table: string, pkValues: string[], pkColumn: string): Promise<void>;
}

export interface AdapterPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  adapterType: string;
  createAdapter(): DatabaseAdapter;
  DriverDefinition?: {
    id: string;
    label: string;
    defaultPort: number | null;
    defaultDatabase: string;
    defaultUsername: string;
    adapter: string;
    client?: string;
    forceSSL?: boolean;
    fileBased?: boolean;
    apiKeyAuth?: boolean;
    icon: string;
    color: string;
  };
}
