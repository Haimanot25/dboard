export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-helpers";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  charts: { title: string; type: string; query: string }[];
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: "db-overview",
    name: "Database Overview",
    description: "Tables, row counts, and schema statistics",
    category: "Database",
    charts: [
      { title: "Table Row Counts", type: "bar", query: "SELECT schemaname || '.' || tablename AS name, n_tup_ins AS rows FROM pg_stat_user_tables ORDER BY n_tup_ins DESC LIMIT 20" },
      { title: "Database Size", type: "table", query: "SELECT datname AS name, pg_size_pretty(pg_database_size(datname)) AS size FROM pg_database ORDER BY pg_database_size(datname) DESC" },
      { title: "Active Connections", type: "sparkline", query: "SELECT state, count(*) AS count FROM pg_stat_activity GROUP BY state" },
    ],
  },
  {
    id: "table-health",
    name: "Table Health",
    description: "Dead tuples, bloat, and index usage",
    category: "Database",
    charts: [
      { title: "Dead Tuples by Table", type: "bar", query: "SELECT schemaname || '.' || tablename AS name, n_dead_tup AS dead FROM pg_stat_user_tables WHERE n_dead_tup > 0 ORDER BY n_dead_tup DESC LIMIT 15" },
      { title: "Index Usage", type: "pie", query: "SELECT schemaname || '.' || relname AS name, idx_scan AS scans FROM pg_stat_user_tables WHERE idx_scan > 0 ORDER BY idx_scan DESC LIMIT 10" },
    ],
  },
  {
    id: "query-performance",
    name: "Query Performance",
    description: "Slow queries and execution stats",
    category: "Performance",
    charts: [
      { title: "Slowest Queries", type: "table", query: "SELECT query, calls, mean_exec_time AS avg_ms FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10" },
      { title: "Query Calls", type: "bar", query: "SELECT LEFT(query, 50) AS query, calls FROM pg_stat_statements ORDER BY calls DESC LIMIT 10" },
    ],
  },
  {
    id: "sales-dashboard",
    name: "Sales Dashboard",
    description: "Revenue, orders, and customer metrics",
    category: "Business",
    charts: [
      { title: "Monthly Revenue", type: "line", query: "SELECT DATE_TRUNC('month', created_at) AS month, SUM(amount) AS revenue FROM orders GROUP BY 1 ORDER BY 1" },
      { title: "Orders by Status", type: "pie", query: "SELECT status, COUNT(*) AS count FROM orders GROUP BY status" },
      { title: "Top Customers", type: "bar", query: "SELECT customer_name, SUM(amount) AS total FROM orders GROUP BY 1 ORDER BY 2 DESC LIMIT 10" },
    ],
  },
  {
    id: "user-analytics",
    name: "User Analytics",
    description: "Signups, activity, and engagement",
    category: "Business",
    charts: [
      { title: "Daily Signups", type: "line", query: "SELECT DATE(created_at) AS day, COUNT(*) AS signups FROM users GROUP BY 1 ORDER BY 1" },
      { title: "Active Users", type: "sparkline", query: "SELECT DATE(last_active) AS day, COUNT(*) AS active FROM users WHERE last_active > NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY 1" },
    ],
  },
];

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json(TEMPLATES);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
