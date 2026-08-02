export function extractQuotedValues(raw: string): string[] {
  const values: string[] = [];
  const valRegex = /'((?:[^'\\]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = valRegex.exec(raw)) !== null) {
    values.push(m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\"));
  }
  return values;
}

/**
 * Parse CHECK constraint definitions into { column, allowedValues } pairs.
 * Handles all common DB vendor formats:
 *  - PostgreSQL:  ((col)::text = ANY ((ARRAY['a'::text, 'b'::text])::text[]))
 *                 (col = ANY (ARRAY['a', 'b']))
 *                 (col IN ('a', 'b'))
 *  - MySQL:       `col` in (_utf8mb4'a',_utf8mb4'b')   or  (col in ('a','b'))
 *  - MSSQL:       ([col]='a' OR [col]='b')  /  [col] IN ('a','b')
 *  - SQLite:      CHECK ("col" IN ('a', 'b')) embedded in CREATE TABLE sql
 */
export function parseCheckConstraints(def: string): { column: string; values: string[] }[] {
  const results: { column: string; values: string[] }[] = [];
  const seen = new Set<string>();
  const normalized = def.replace(/\[(\w+)\]/g, "$1").replace(/`/g, "");

  // eslint-disable-next-line security/detect-unsafe-regex -- runs against small DB-generated CHECK definitions only
  const anyRe = /\(*\s*"?([\w]+)"?\s*\)?\s*(?:::\w+)?\s*=\s*ANY\s*\(*\s*ARRAY\[([\s\S]*?)\]\s*\)/gi;
  let m: RegExpExecArray | null;
  while ((m = anyRe.exec(normalized)) !== null) {
    const values = extractQuotedValues(m[2]);
    if (values.length > 0 && !seen.has(m[1])) {
      results.push({ column: m[1], values });
      seen.add(m[1]);
    }
  }

  // eslint-disable-next-line security/detect-unsafe-regex -- runs against small DB-generated CHECK definitions only
  const inRe = /\(*\s*"?([\w]+)"?\s*\)?\s*(?:::\w+)?\s+IN\s*\(([\s\S]*?)\)/gi;
  while ((m = inRe.exec(normalized)) !== null) {
    const values = extractQuotedValues(m[2]);
    if (values.length > 0 && !seen.has(m[1])) {
      results.push({ column: m[1], values });
      seen.add(m[1]);
    }
  }

  const eqRe = /"?([\w]+)"?\s*=\s*'([^']*)'/gi;
  const eqGroups = new Map<string, string[]>();
  while ((m = eqRe.exec(normalized)) !== null) {
    if (!eqGroups.has(m[1])) eqGroups.set(m[1], []);
    eqGroups.get(m[1])!.push(m[2]);
  }
  for (const entry of Array.from(eqGroups.entries())) {
    const col = entry[0];
    const values = entry[1];
    if (values.length >= 2 && !seen.has(col)) {
      results.push({ column: col, values });
      seen.add(col);
    }
  }

  return results;
}
