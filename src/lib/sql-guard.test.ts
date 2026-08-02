import { describe, it, expect } from "vitest";
import { isWriteQuery, isReadQuery } from "./sql-guard";

describe("isWriteQuery", () => {
  it("flags direct write statements", () => {
    expect(isWriteQuery("DELETE FROM users")).toBe(true);
    expect(isWriteQuery("UPDATE users SET name='x'")).toBe(true);
    expect(isWriteQuery("INSERT INTO users (id) VALUES (1)")).toBe(true);
    expect(isWriteQuery("DROP TABLE users")).toBe(true);
    expect(isWriteQuery("ALTER TABLE users ADD COLUMN x int")).toBe(true);
    expect(isWriteQuery("TRUNCATE TABLE users")).toBe(true);
    expect(isWriteQuery("CREATE TABLE x (id int)")).toBe(true);
    expect(isWriteQuery("GRANT SELECT ON t TO r")).toBe(true);
    expect(isWriteQuery("REVOKE ALL ON t FROM r")).toBe(true);
  });

  it("flags CTE and multi-statement write bypasses", () => {
    expect(isWriteQuery("WITH x AS (SELECT 1) DELETE FROM users")).toBe(true);
    expect(isWriteQuery("WITH x AS (SELECT 1) UPDATE users SET a=2")).toBe(true);
    expect(isWriteQuery("WITH x AS (SELECT 1) INSERT INTO users VALUES (2)")).toBe(true);
    expect(isWriteQuery("SELECT 1; DROP TABLE users")).toBe(true);
    expect(isWriteQuery("SELECT * FROM users; DELETE FROM users")).toBe(true);
  });

  it("does not flag read statements", () => {
    expect(isWriteQuery("SELECT * FROM users")).toBe(false);
    expect(isWriteQuery("WITH x AS (SELECT 1) SELECT * FROM x")).toBe(false);
    expect(isWriteQuery("SHOW TABLES")).toBe(false);
    expect(isWriteQuery("EXPLAIN SELECT * FROM users")).toBe(false);
    expect(isWriteQuery("PRAGMA table_info(users)")).toBe(false);
    expect(isWriteQuery("SELECT updated_at, created_at FROM users")).toBe(false);
    expect(isWriteQuery("SELECT 'last update was here' AS note")).toBe(false);
    expect(isWriteQuery("SELECT title FROM articles")).toBe(false);
  });
});

describe("isReadQuery", () => {
  it("accepts read statements", () => {
    expect(isReadQuery("SELECT * FROM users")).toBe(true);
    expect(isReadQuery("WITH x AS (SELECT 1) SELECT * FROM x")).toBe(true);
    expect(isReadQuery("  SHOW TABLES")).toBe(true);
  });

  it("rejects write statements", () => {
    expect(isReadQuery("DELETE FROM users")).toBe(false);
    expect(isReadQuery("SELECT 1; DROP TABLE users")).toBe(false);
  });
});
