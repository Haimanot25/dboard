import { describe, it, expect } from "vitest";
import { DRIVERS, getDriver, getDefaultPort } from "./registry";

describe("db/drivers/registry", () => {
  it("has all 6 drivers", () => {
    expect(Object.keys(DRIVERS)).toHaveLength(6);
  });

  it("has postgresql driver", () => {
    expect(DRIVERS.postgresql).toBeDefined();
    expect(DRIVERS.postgresql.defaultPort).toBe(5432);
    expect(DRIVERS.postgresql.adapter).toBe("sql");
    expect(DRIVERS.postgresql.client).toBe("pg");
  });

  it("has supabase driver", () => {
    expect(DRIVERS.supabase).toBeDefined();
    expect(DRIVERS.supabase.adapter).toBe("supabase");
    expect(DRIVERS.supabase.apiKeyAuth).toBe(true);
  });

  it("has mysql driver", () => {
    expect(DRIVERS.mysql).toBeDefined();
    expect(DRIVERS.mysql.defaultPort).toBe(3306);
    expect(DRIVERS.mysql.client).toBe("mysql2");
  });

  it("has sqlite driver", () => {
    expect(DRIVERS.sqlite).toBeDefined();
    expect(DRIVERS.sqlite.fileBased).toBe(true);
  });

  it("has mssql driver", () => {
    expect(DRIVERS.mssql).toBeDefined();
    expect(DRIVERS.mssql.defaultPort).toBe(1433);
  });

  it("has mongodb driver", () => {
    expect(DRIVERS.mongodb).toBeDefined();
    expect(DRIVERS.mongodb.adapter).toBe("mongodb");
  });

  describe("getDriver", () => {
    it("returns correct driver", () => {
      expect(getDriver("mysql").id).toBe("mysql");
    });

    it("returns postgresql for unknown type", () => {
      expect(getDriver("unknown").id).toBe("postgresql");
    });
  });

  describe("getDefaultPort", () => {
    it("returns correct port for mysql", () => {
      expect(getDefaultPort("mysql")).toBe(3306);
    });

    it("returns 5432 for unknown type", () => {
      expect(getDefaultPort("unknown")).toBe(5432);
    });

    it("returns 5432 for undefined", () => {
      expect(getDefaultPort()).toBe(5432);
    });
  });
});
