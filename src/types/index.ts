export interface Connection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  readOnly: boolean;
  createdAt: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  maxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable: string | null;
  referencedColumn: string | null;
  indexes: IndexInfo[];
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
}

export interface SchemaTableInfo {
  name: string;
  type: "table" | "view";
  columns: ColumnInfo[];
}

export interface SchemaInfo {
  tables: SchemaTableInfo[];
  raw: Record<string, ColumnInfo[]>;
}

export interface ColumnConfig {
  name: string;
  displayName: string;
  visible: boolean;
  readOnly: boolean;
  order: number;
}

export interface TableConfig {
  name: string;
  enabled: boolean;
  columns: ColumnConfig[];
}

export interface SchemaConfig {
  connectionId: string;
  tables: TableConfig[];
}

export interface ApiKey {
  id: string;
  name: string;
  lastChars: string;
  permissions: string;
  connectionId: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  key?: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string;
  enabled: boolean;
  connectionId: string;
  secret: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionShare {
  id: string;
  connectionId: string;
  connection: { id: string; name: string };
  sharedWithId: string;
  sharedWith: { id: string; email: string; name: string | null };
  sharedById: string;
  sharedBy: { id: string; email: string; name: string | null };
  permission: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  connectionId: string;
  userId: string;
  user: { id: string; email: string; name: string | null } | null;
  action: string;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AdminPageTableConfig {
  name: string;
  columns: string[];
  displayName?: string;
}

export interface AdminPageConfig {
  tables: AdminPageTableConfig[];
}

export interface AdminPage {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  connectionId: string;
  config: string;
  createdAt: string;
  updatedAt: string;
  connection?: { name: string; type: string };
}