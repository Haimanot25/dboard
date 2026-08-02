import { it, expect } from "vitest";
import { SqlAdapter } from "./sql-adapter";

it.skipIf(process.env.SKIP_LIVE_DB === "1")(
  "introspects check constraints and FKs from a live Postgres",
  async () => {
    const adapter = new SqlAdapter();
    await adapter.connect({
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "dboard",
      username: "postgres",
      password: "testpass",
      ssl: false,
    });
    const schema = await adapter.introspect();
    const projects = schema.tables.find((t) => t.name === "projects");
    const tasks = schema.tables.find((t) => t.name === "tasks");
    const employees = schema.tables.find((t) => t.name === "employees");

    expect(projects?.columns.find((c) => c.name === "status")?.allowedValues).toEqual([
      "active", "completed", "on_hold", "cancelled",
    ]);
    expect(tasks?.columns.find((c) => c.name === "priority")?.allowedValues).toEqual([
      "low", "medium", "high", "urgent",
    ]);
    expect(tasks?.columns.find((c) => c.name === "project_id")?.isForeignKey).toBe(true);
    expect(tasks?.columns.find((c) => c.name === "project_id")?.referencedTable).toBe("projects");
    expect(employees?.columns.find((c) => c.name === "department_id")?.referencedTable).toBe("departments");
    await adapter.disconnect();
  }
);
