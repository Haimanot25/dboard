const WRITE_PATTERN =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|REPLACE|MERGE|CALL|EXEC|EXECUTE|RENAME|COMMENT|ATTACH|DETACH|COPY|LOAD|DO|SET|VACUUM)\b/;

const READ_START_PATTERN = /^\s*(SELECT|WITH|SHOW|DESCRIBE|EXPLAIN|PRAGMA)\b/;

/**
 * Remove single-quoted string literals ('' is an escaped quote) so keywords
 * inside literal values don't cause false positives. Literal content can never
 * change SQL execution, so this is safe for the security check.
 */
export function stripSqlLiterals(sql: string): string {
  return sql.replace(/'((?:[^']|'')*)'/g, "");
}

/**
 * Detect write statements anywhere in a SQL string. Scans the whole statement
 * (not just the leading keyword) to catch CTE and multi-statement bypasses
 * like "WITH x AS (...) DELETE ..." or "SELECT 1; DROP TABLE t;".
 */
export function isWriteQuery(sql: string): boolean {
  return WRITE_PATTERN.test(stripSqlLiterals(sql).toUpperCase());
}

export function isReadQuery(sql: string): boolean {
  return !isWriteQuery(sql) && READ_START_PATTERN.test(sql.trim());
}
