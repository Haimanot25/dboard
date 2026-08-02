export interface IntrospectedColumn {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey?: boolean;
  referencedTable?: string | null;
  referencedColumn?: string | null;
  nullable?: boolean;
  defaultValue?: string | null;
  comment?: string | null;
  allowedValues?: string[] | null;
}

export interface IntrospectedIndex {
  name: string;
  columns: string[];
  isUnique: boolean;
}

export interface IntrospectedTable {
  name: string;
  schema?: string;
  type?: "table" | "view";
  columns: IntrospectedColumn[];
  indexes?: IntrospectedIndex[];
  rowCount?: number;
  comment?: string | null;
}

export interface IntrospectedSchema {
  tables: IntrospectedTable[];
  database?: string;
  dialect?: string;
}

export interface SchemaConfigTable {
  name: string;
  columns?: { name: string; readOnly?: boolean }[];
}

export interface SchemaConfig {
  tables?: SchemaConfigTable[];
}
