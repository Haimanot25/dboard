export interface DriverDefinition {
  id: string;
  label: string;
  defaultPort: number | null;
  defaultDatabase: string;
  defaultUsername: string;
  adapter: "sql" | "mongodb" | "supabase";
  client?: string;
  forceSSL?: boolean;
  fileBased?: boolean;
  apiKeyAuth?: boolean;
  icon: string;
  color: string;
}

export const DRIVERS: Record<string, DriverDefinition> = {
  postgresql: {
    id: "postgresql",
    label: "PostgreSQL",
    defaultPort: 5432,
    defaultDatabase: "postgres",
    defaultUsername: "postgres",
    adapter: "sql",
    client: "pg",
    icon: "PG",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
  },
  supabase: {
    id: "supabase",
    label: "Supabase",
    defaultPort: null,
    defaultDatabase: "postgres",
    defaultUsername: "",
    adapter: "supabase",
    apiKeyAuth: true,
    icon: "SB",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  },
  mysql: {
    id: "mysql",
    label: "MySQL",
    defaultPort: 3306,
    defaultDatabase: "mydb",
    defaultUsername: "root",
    adapter: "sql",
    client: "mysql2",
    icon: "MY",
    color: "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-600 dark:text-orange-400",
  },
  sqlite: {
    id: "sqlite",
    label: "SQLite",
    defaultPort: null,
    defaultDatabase: "database.db",
    defaultUsername: "",
    adapter: "sql",
    client: "better-sqlite3",
    fileBased: true,
    icon: "SL",
    color: "from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-600 dark:text-sky-400",
  },
  mssql: {
    id: "mssql",
    label: "SQL Server",
    defaultPort: 1433,
    defaultDatabase: "master",
    defaultUsername: "sa",
    adapter: "sql",
    client: "mssql",
    icon: "MS",
    color: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-600 dark:text-red-400",
  },
  mongodb: {
    id: "mongodb",
    label: "MongoDB",
    defaultPort: 27017,
    defaultDatabase: "mydb",
    defaultUsername: "",
    adapter: "mongodb",
    icon: "MO",
    color: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-600 dark:text-green-400",
  },
};

export function getDriver(type: string): DriverDefinition {
  return DRIVERS[type] || DRIVERS.postgresql;
}

export function getDefaultPort(type?: string): number {
  const def = type ? DRIVERS[type] : undefined;
  return def?.defaultPort ?? 5432;
}
