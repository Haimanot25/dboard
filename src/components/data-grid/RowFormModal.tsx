"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { ColumnMeta } from "@/lib/crud/query-builder";

interface RowFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  columns: ColumnMeta[];
  initialData?: Record<string, unknown>;
  title: string;
  isSubmitting?: boolean;
  visibleColumns?: string[];
  connectionId?: string;
}

const INTEGER_TYPES = new Set(["integer", "int", "int4", "bigint", "int8", "smallint", "int2", "serial", "bigserial", "smallserial"]);
const FLOAT_TYPES = new Set(["numeric", "decimal", "real", "float4", "double precision", "float8", "float", "money"]);
const DATE_TYPES = new Set(["date"]);
const TIMESTAMP_TYPES = new Set(["timestamp", "timestamptz", "timestamp without time zone", "timestamp with time zone", "datetime"]);
const TIME_TYPES = new Set(["time", "timetz", "time without time zone", "time with time zone"]);
const BOOLEAN_TYPES = new Set(["boolean", "bool"]);
const UUID_TYPES = new Set(["uuid"]);
const JSON_TYPES = new Set(["json", "jsonb"]);
const TEXT_TYPES = new Set(["text", "varchar", "character varying", "char", "character", "bpchar"]);

type ClassifiedType = "boolean" | "integer" | "float" | "uuid" | "json" | "date" | "timestamp" | "time" | "text";

function classifyType(dataType: string): ClassifiedType {
  const dt = dataType.toLowerCase().trim();
  if (BOOLEAN_TYPES.has(dt)) return "boolean";
  if (INTEGER_TYPES.has(dt)) return "integer";
  if (FLOAT_TYPES.has(dt)) return "float";
  if (UUID_TYPES.has(dt)) return "uuid";
  if (JSON_TYPES.has(dt)) return "json";
  if (DATE_TYPES.has(dt)) return "date";
  if (TIMESTAMP_TYPES.has(dt)) return "timestamp";
  if (TIME_TYPES.has(dt)) return "time";
  return "text";
}

function getTypeBadge(classified: ClassifiedType): { label: string; color: string } {
  switch (classified) {
    case "boolean": return { label: "bool", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
    case "integer": return { label: "int", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    case "float": return { label: "decimal", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    case "uuid": return { label: "uuid", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "json": return { label: "json", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" };
    case "date": return { label: "date", color: "bg-green-500/10 text-green-600 border-green-500/20" };
    case "timestamp": return { label: "timestamp", color: "bg-green-500/10 text-green-600 border-green-500/20" };
    case "time": return { label: "time", color: "bg-green-500/10 text-green-600 border-green-500/20" };
    default: return { label: "text", color: "bg-muted text-muted-foreground border-border" };
  }
}

function getPlaceholder(classified: ClassifiedType, colName: string): string {
  switch (classified) {
    case "integer": return "e.g. 42";
    case "float": return "e.g. 3.14";
    case "uuid": return "e.g. 550e8400-e29b-41d4-a716-446655440000";
    case "json": return '{ "key": "value" }';
    case "date": return "YYYY-MM-DD";
    case "timestamp": return "YYYY-MM-DD HH:MM:SS";
    case "time": return "HH:MM:SS";
    default: return `Enter ${colName}`;
  }
}

function validateField(col: ColumnMeta, value: unknown): string | null {
  const classified = classifyType(col.dataType);

  const isEmpty = value === "" || value === null || value === undefined;
  if (isEmpty) {
    if (col.isNullable === false && col.defaultValue === null) {
      return `${col.name} is required`;
    }
    return null;
  }

  if (col.allowedValues && col.allowedValues.length > 0) {
    if (!col.allowedValues.includes(String(value))) {
      return `Must be one of: ${col.allowedValues.join(", ")}`;
    }
    return null;
  }

  switch (classified) {
    case "integer": {
      const s = String(value).trim();
      if (!/^-?\d+$/.test(s)) return "Must be a whole number";
      const num = parseInt(s, 10);
      if (num > 2147483647 || num < -2147483648) return "Number out of range for integer";
      return null;
    }
    case "float": {
      const s = String(value).trim();
      if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return "Must be a valid number";
      return null;
    }
    case "uuid": {
      const s = String(value).trim();
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return null;
      if (/^[0-9a-f]{32}$/i.test(s)) return null; // without dashes
      return "Must be a valid UUID";
    }
    case "json": {
      if (typeof value === "string") {
        try { JSON.parse(value); } catch { return "Must be valid JSON"; }
      }
      return null;
    }
    case "date": {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
      return "Must be YYYY-MM-DD";
    }
    case "timestamp": {
      const s = String(value);
      if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/.test(s)) return null;
      return "Must be YYYY-MM-DD HH:MM or YYYY-MM-DDTHH:MM:SS";
    }
    case "time": {
      const s = String(value);
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) {
        const [h, m] = s.split(":").map(Number);
        if (h > 23 || m > 59) return "Invalid time values";
        return null;
      }
      return "Must be HH:MM or HH:MM:SS";
    }
    default:
      return null;
  }
}

function getInputType(classified: ClassifiedType): string {
  switch (classified) {
    case "integer": return "number";
    case "float": return "number";
    case "date": return "date";
    case "timestamp": return "text";
    case "time": return "time";
    default: return "text";
  }
}

function getInputMode(classified: ClassifiedType): "numeric" | "decimal" | "text" | undefined {
  switch (classified) {
    case "integer": return "numeric";
    case "float": return "decimal";
    default: return undefined;
  }
}

function getStep(classified: ClassifiedType): string | undefined {
  switch (classified) {
    case "integer": return "1";
    case "float": return "any";
    default: return undefined;
  }
}

/** Convert empty strings to null for nullable columns before submit */
function sanitizeFormData(
  data: Record<string, unknown>,
  columns: ColumnMeta[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    const col = columns.find((c) => c.name === key);
    if (col && col.isNullable && (val === "" || val === undefined)) {
      result[key] = null;
    } else {
      result[key] = val;
    }
  }
  return result;
}

export function RowFormModal({
  open,
  onClose,
  onSubmit,
  columns,
  initialData,
  title,
  isSubmitting,
  visibleColumns,
  connectionId,
}: RowFormModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fkOptions, setFkOptions] = useState<Record<string, { label: string; value: string }[]>>({});
  const [fkLoading, setFkLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fkCols = columns.filter((c) => c.isForeignKey && c.referencedTable);
    if (fkCols.length === 0 || !connectionId) return;

    let cancelled = false;
    setFkLoading(true);
    (async () => {
      const optionsMap: Record<string, { label: string; value: string }[]> = {};
      await Promise.all(
        fkCols.map(async (col) => {
          try {
            const res = await fetch(
              `/api/data/${connectionId}/${encodeURIComponent(col.referencedTable!)}?pageSize=500`
            );
            if (!res.ok) return;
            const payload = await res.json();
            const rows: Record<string, unknown>[] = payload?.data ?? [];
            const pk = payload?.columns?.find((c: ColumnMeta) => c.isPrimaryKey);
            const labelCol = rows.length > 0
              ? ["name", "title", "label", "companyName", "email"].find((k) => k in rows[0])
              : undefined;
            optionsMap[col.name] = rows.map((row) => {
              const value = String(row[col.referencedColumn ?? pk?.name ?? "id"] ?? "");
              const label = labelCol && row[labelCol] !== undefined
                ? `${row[labelCol]} (${value})`
                : value;
              return { label, value };
            });
          } catch {
            // FK options are best-effort
          }
        })
      );
      if (!cancelled) {
        setFkOptions(optionsMap);
        setFkLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, columns, connectionId]);

  useEffect(() => {
    if (open) {
      const defaults: Record<string, unknown> = {};
      const visibleSet = new Set(visibleColumns ?? []);
      const hasVisibleFilter = visibleColumns && visibleColumns.length > 0;

      for (const col of columns) {
        if (col.isPrimaryKey) continue;
        const initial = initialData?.[col.name];
        const isVisible = !hasVisibleFilter || visibleSet.has(col.name);
        const classified = classifyType(col.dataType);

        if (initial !== undefined && initial !== null) {
          defaults[col.name] = initial;
        } else if (isVisible) {
          // Set smart defaults for hidden columns
          if (classified === "boolean") {
            defaults[col.name] = false;
          } else if (classified === "integer") {
            defaults[col.name] = "";
          } else if (classified === "float") {
            defaults[col.name] = "";
          } else if (classified === "timestamp") {
            defaults[col.name] = new Date().toISOString().slice(0, 19).replace("T", " ");
          } else if (classified === "date") {
            defaults[col.name] = new Date().toISOString().slice(0, 10);
          } else {
            defaults[col.name] = "";
          }
        } else {
          if (classified === "boolean") defaults[col.name] = false;
          else if (classified === "integer" || classified === "float") defaults[col.name] = "";
          else if (classified === "timestamp") defaults[col.name] = new Date().toISOString().slice(0, 19).replace("T", " ");
          else if (classified === "date") defaults[col.name] = new Date().toISOString().slice(0, 10);
          else defaults[col.name] = "";
        }
      }
      setFormData(defaults);
      setErrors({});
      setTouched({});
    }
  }, [open, columns, initialData, visibleColumns]);

  const validateAndSetError = useCallback((colName: string, value: unknown) => {
    const col = columns.find((c) => c.name === colName);
    if (!col) return;
    const error = validateField(col, value);
    setErrors((prev) => {
      if (error) return { ...prev, [colName]: error };
      const next = { ...prev };
      delete next[colName];
      return next;
    });
  }, [columns]);

  const handleChange = useCallback((colName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [colName]: value }));
    if (touched[colName]) {
      validateAndSetError(colName, value);
    }
  }, [touched, validateAndSetError]);

  const handleBlur = useCallback((colName: string) => {
    setTouched((prev) => ({ ...prev, [colName]: true }));
    validateAndSetError(colName, formData[colName]);
  }, [formData, validateAndSetError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    const allTouched: Record<string, boolean> = {};
    for (const col of columns) {
      if (col.isPrimaryKey) continue;
      allTouched[col.name] = true;
      const error = validateField(col, formData[col.name]);
      if (error) newErrors[col.name] = error;
    }
    setTouched(allTouched);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Sanitize: convert empty strings to null for nullable columns
    const sanitized = sanitizeFormData(formData, columns);
    onSubmit(sanitized);
  };

  const renderField = (col: ColumnMeta) => {
    if (col.isPrimaryKey) return null;

    const value = formData[col.name] ?? "";
    const classified = classifyType(col.dataType);
    const inputType = getInputType(classified);
    const inputMode = getInputMode(classified);
    const step = getStep(classified);
    const placeholder = getPlaceholder(classified, col.name);
    const typeBadge = getTypeBadge(classified);
    const error = errors[col.name];
    const isTouched = touched[col.name];

    // Enum / allowed values -> dropdown
    if (col.allowedValues && col.allowedValues.length > 0) {
      return (
        <div key={col.name} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={col.name} className="text-sm font-medium">
              {col.name}
              {col.isNullable === false && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 font-normal ${typeBadge.color}`}>
              enum
            </Badge>
          </div>
          <select
            id={col.name}
            value={String(value ?? "")}
            onChange={(e) => handleChange(col.name, e.target.value)}
            onBlur={() => handleBlur(col.name)}
            className={`w-full h-9 rounded-md border bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              error && isTouched ? "border-destructive focus-visible:ring-destructive" : "border-input focus-visible:ring-ring"
            }`}
          >
            <option value="">Select...</option>
            {col.allowedValues.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    // Foreign key -> dropdown or text
    if (col.isForeignKey && col.referencedTable) {
      const options = fkOptions[col.name] ?? [];
      const loading = fkLoading && options.length === 0;
      return (
        <div key={col.name} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={col.name} className="text-sm font-medium">
              {col.name}
              {col.isNullable === false && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-normal bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
              FK
            </Badge>
          </div>
          {loading ? (
            <Input disabled placeholder="Loading related records..." />
          ) : options.length > 0 ? (
            <select
              id={col.name}
              value={String(value ?? "")}
              onChange={(e) => handleChange(col.name, e.target.value)}
              onBlur={() => handleBlur(col.name)}
              className={`w-full h-9 rounded-md border bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                error && isTouched ? "border-destructive focus-visible:ring-destructive" : "border-input focus-visible:ring-ring"
              }`}
            >
              <option value="">Select {col.referencedTable}...</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <Input
              id={col.name}
              value={String(value ?? "")}
              onChange={(e) => handleChange(col.name, e.target.value)}
              onBlur={() => handleBlur(col.name)}
              placeholder={`Reference to ${col.referencedTable}.${col.referencedColumn ?? "id"}`}
              className={error && isTouched ? "border-destructive focus-visible:ring-destructive" : ""}
            />
          )}
        </div>
      );
    }

    // Boolean -> switch
    if (classified === "boolean") {
      return (
        <div key={col.name} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={col.name} className="text-sm font-medium">{col.name}</Label>
            <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 font-normal ${typeBadge.color}`}>
              {typeBadge.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id={col.name}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(col.name, checked)}
            />
            <span className="text-sm text-muted-foreground">{value ? "True" : "False"}</span>
          </div>
        </div>
      );
    }

    // JSON -> textarea
    if (classified === "json") {
      return (
        <div key={col.name} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label htmlFor={col.name} className="text-sm font-medium">{col.name}</Label>
            <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 font-normal ${typeBadge.color}`}>
              {typeBadge.label}
            </Badge>
          </div>
          <textarea
            id={col.name}
            value={String(value)}
            onChange={(e) => handleChange(col.name, e.target.value)}
            onBlur={() => handleBlur(col.name)}
            placeholder={placeholder}
            className={`w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 font-mono ${
              error && isTouched ? "border-destructive focus-visible:ring-destructive" : "border-input focus-visible:ring-ring"
            }`}
          />
        </div>
      );
    }

    // All other types -> input
    const showStep = step !== undefined;
    return (
      <div key={col.name} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor={col.name} className="text-sm font-medium">
            {col.name}
            {col.isNullable === false && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 font-normal ${typeBadge.color}`}>
            {typeBadge.label}
          </Badge>
        </div>
        <Input
          id={col.name}
          type={inputType}
          inputMode={inputMode}
          step={showStep ? step : undefined}
          value={String(value)}
          onChange={(e) => {
            let v: unknown = e.target.value;
            if (classified === "integer" && v !== "") {
              const parsed = parseInt(v as string, 10);
              v = isNaN(parsed) ? v : String(parsed);
            } else if (classified === "float" && v !== "") {
              const parsed = parseFloat(v as string);
              v = isNaN(parsed) ? v : String(parsed);
            }
            handleChange(col.name, v);
          }}
          onBlur={() => handleBlur(col.name)}
          placeholder={placeholder}
          className={error && isTouched ? "border-destructive focus-visible:ring-destructive" : ""}
        />
      </div>
    );
  };

  const visibleSet = new Set(visibleColumns);
  const editableColumns = columns.filter((c) => {
    if (c.isPrimaryKey) return false;
    if (visibleColumns && visibleColumns.length > 0 && !visibleSet.has(c.name)) return false;
    return true;
  });
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fields are validated against column data types. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {editableColumns.map((col) => (
            <div key={col.name}>
              {renderField(col)}
              {errors[col.name] && touched[col.name] && (
                <p className="text-xs text-destructive mt-1">{errors[col.name]}</p>
              )}
            </div>
          ))}

          {hasErrors && (
            <p className="text-sm text-destructive font-medium">
              Please fix the errors above before saving.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || hasErrors}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
