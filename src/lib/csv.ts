/**
 * Prevent CSV/XLSX formula injection (CSV injection). Cells that begin with
 * spreadsheet formula characters get a leading apostrophe so that Excel,
 * LibreOffice etc. treat them as text instead of executing them.
 */
export function sanitizeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/^[=+\t\r]/.test(s)) return `'${s}`;
  if (/^@/.test(s)) return `'${s}`;
  if (/^-/.test(s) && !isFinite(Number(s))) return `'${s}`;
  return s;
}

export function quoteCsvField(s: string): string {
  return s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export function csvRow(values: string[]): string {
  return values.map(quoteCsvField).join(",");
}
