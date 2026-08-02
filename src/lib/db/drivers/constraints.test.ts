import { describe, it, expect } from "vitest";
import { parseCheckConstraints } from "./constraints";

describe("parseCheckConstraints", () => {
  it("parses Supabase/Postgres ARRAY format (quoted column, no cast)", () => {
    const result = parseCheckConstraints(
      `CHECK (("serviceType" = ANY (ARRAY['data'::text, 'voice'::text, 'sms'::text, 'airtime'::text])))`
    );
    expect(result).toEqual([{ column: "serviceType", values: ["data", "voice", "sms", "airtime"] }]);
  });

  it("parses Postgres 16 cast + nested parens format", () => {
    const result = parseCheckConstraints(
      `CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'on_hold'::character varying, 'cancelled'::character varying])::text[])))`
    );
    expect(result).toEqual([{ column: "status", values: ["active", "completed", "on_hold", "cancelled"] }]);
  });

  it("parses MySQL backtick + _utf8mb4 + IN format", () => {
    const result = parseCheckConstraints("(`status` in (_utf8mb4'active',_utf8mb4'inactive',_utf8mb4'pending'))");
    expect(result).toEqual([{ column: "status", values: ["active", "inactive", "pending"] }]);
  });

  it("parses MSSQL bracket + IN format", () => {
    const result = parseCheckConstraints("([priority] IN ('low','high'))");
    expect(result).toEqual([{ column: "priority", values: ["low", "high"] }]);
  });

  it("parses MSSQL bracket + OR equality format", () => {
    const result = parseCheckConstraints("([status]='todo' OR [status]='done')");
    expect(result).toEqual([{ column: "status", values: ["todo", "done"] }]);
  });

  it("parses Postgres IN format", () => {
    const result = parseCheckConstraints("CHECK ((col IN ('a'::text, 'b'::text)))");
    expect(result).toEqual([{ column: "col", values: ["a", "b"] }]);
  });

  it("parses CHECK embedded in SQLite CREATE TABLE sql", () => {
    const result = parseCheckConstraints(
      `CREATE TABLE tasks (id INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK ("status" IN ('todo', 'done')))`
    );
    expect(result).toEqual([{ column: "status", values: ["todo", "done"] }]);
  });

  it("ignores non-enum checks like range constraints", () => {
    expect(parseCheckConstraints("CHECK ((VALUE >= 0))")).toEqual([]);
  });

  it("parses multiple checks on different columns in one table", () => {
    const result = parseCheckConstraints(
      `CHECK ((("status")::text = ANY ((ARRAY['todo'::text, 'done'::text])::text[])))`
    );
    expect(result.length).toBe(1);
    expect(result[0].values).toEqual(["todo", "done"]);
  });
});
