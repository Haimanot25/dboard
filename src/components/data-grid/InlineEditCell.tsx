"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import type { ColumnMeta } from "@/lib/crud/query-builder";

interface InlineEditCellProps {
  value: unknown;
  column: ColumnMeta;
  onSave: (value: unknown) => void;
  onCancel: () => void;
}

const INTEGER_TYPES = new Set(["integer", "int", "int4", "bigint", "int8", "smallint", "int2", "serial", "bigserial", "smallserial"]);
const FLOAT_TYPES = new Set(["numeric", "decimal", "real", "float4", "double precision", "float8", "float", "money"]);

function classifyType(dataType: string): string {
  const dt = dataType.toLowerCase().trim();
  if (INTEGER_TYPES.has(dt)) return "integer";
  if (FLOAT_TYPES.has(dt)) return "float";
  return "text";
}

function validateInline(col: ColumnMeta, value: unknown): boolean {
  if (value === "" || value === null || value === undefined) {
    return col.isNullable !== false;
  }
  const classified = classifyType(col.dataType);
  if (classified === "integer") {
    const num = Number(value);
    return !isNaN(num) && Number.isInteger(num);
  }
  if (classified === "float") {
    return !isNaN(Number(value));
  }
  return true;
}

export function InlineEditCell({ value, column, onSave, onCancel }: InlineEditCellProps) {
  const [editValue, setEditValue] = useState(value === null || value === undefined ? "" : String(value));
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    const classified = classifyType(column.dataType);
    let converted: unknown = editValue;
    if ((classified === "integer" || classified === "float") && editValue !== "") {
      converted = classified === "integer" ? parseInt(editValue, 10) : parseFloat(editValue);
      if (isNaN(converted as number)) {
        setInvalid(true);
        return;
      }
    }
    if (!validateInline(column, converted)) {
      setInvalid(true);
      return;
    }
    onSave(converted);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const inputType = getInputType(column.dataType);

  return (
    <Input
      ref={inputRef}
      type={inputType}
      value={editValue}
      onChange={(e) => {
        setEditValue(e.target.value);
        setInvalid(false);
      }}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={`h-8 text-sm border-2 focus-visible:ring-0 ${invalid ? "border-destructive bg-destructive/5" : "border-primary/50"}`}
    />
  );
}

function getInputType(dataType: string): string {
  const dt = dataType.toLowerCase();
  if (["integer", "int", "int4", "bigint", "int8", "smallint", "int2", "serial", "bigserial", "smallserial", "numeric", "decimal", "real", "float4", "double precision", "float8", "float", "money"].includes(dt)) {
    return "number";
  }
  if (dt === "date") return "date";
  if (dt.startsWith("timestamp")) return "datetime-local";
  if (dt.startsWith("time")) return "time";
  return "text";
}
