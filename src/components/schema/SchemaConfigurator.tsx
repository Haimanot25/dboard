"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  ScrollArea,
} from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Save,
  Search,
  Table2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type {
  SchemaInfo,
  SchemaTableInfo,
  SchemaConfig,
  TableConfig,
} from "@/types";

interface SchemaConfiguratorProps {
  schema: SchemaInfo;
  savedConfig?: SchemaConfig;
  connectionId: string;
  onSave: (config: SchemaConfig) => Promise<void>;
  isSaving: boolean;
}

export function SchemaConfigurator({
  schema,
  savedConfig,
  connectionId,
  onSave,
  isSaving,
}: SchemaConfiguratorProps) {
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (savedConfig?.tables && savedConfig.tables.length > 0) {
      setTables(savedConfig.tables);
    } else if (schema.tables) {
      setTables(
        schema.tables.map((t: SchemaTableInfo) => ({
          name: t.name,
          enabled: true,
          columns: t.columns.map((c, i) => ({
            name: c.name,
            displayName: c.name,
            visible: true,
            readOnly: false,
            order: i,
          })),
        }))
      );
    }
  }, [schema, savedConfig]);

  const toggleTable = useCallback((tableName: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.name === tableName ? { ...t, enabled: !t.enabled } : t
      )
    );
  }, []);

  const toggleExpand = useCallback((tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  }, []);

  const toggleColumnVisibility = useCallback(
    (tableName: string, columnName: string) => {
      setTables((prev) =>
        prev.map((t) =>
          t.name === tableName
            ? {
                ...t,
                columns: t.columns.map((c) =>
                  c.name === columnName ? { ...c, visible: !c.visible } : c
                ),
              }
            : t
        )
      );
    },
    []
  );

  const toggleColumnReadOnly = useCallback(
    (tableName: string, columnName: string) => {
      setTables((prev) =>
        prev.map((t) =>
          t.name === tableName
            ? {
                ...t,
                columns: t.columns.map((c) =>
                  c.name === columnName ? { ...c, readOnly: !c.readOnly } : c
                ),
              }
            : t
        )
      );
    },
    []
  );

  const updateColumnAlias = useCallback(
    (tableName: string, columnName: string, alias: string) => {
      setTables((prev) =>
        prev.map((t) =>
          t.name === tableName
            ? {
                ...t,
                columns: t.columns.map((c) =>
                  c.name === columnName ? { ...c, displayName: alias } : c
                ),
              }
            : t
        )
      );
    },
    []
  );

  const handleSave = useCallback(async () => {
    try {
      await onSave({
        connectionId,
        tables,
      });
      toast.success("Configuration saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    }
  }, [connectionId, tables, onSave]);

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enabledCount = tables.filter((t) => t.enabled).length;

  const getTableInfo = (tableName: string): SchemaTableInfo | undefined => {
    return schema.tables.find((t) => t.name === tableName);
  };

  const getColumnInfo = (tableName: string, columnName: string) => {
    const info = getTableInfo(tableName);
    return info?.columns.find((c) => c.name === columnName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline" className="text-sm">
            {enabledCount} / {tables.length} tables selected
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {enabledCount > 0 && (
            <Button variant="outline" asChild>
              <Link href={`/connections/${connectionId}/tables/${tables.find((t) => t.enabled)?.name || ""}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Dashboard
              </Link>
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-3">
          {filteredTables.map((table) => {
            const info = getTableInfo(table.name);
            const pkCount = info?.columns.filter((c) => c.isPrimaryKey).length ?? 0;
            const fkCount = info?.columns.filter((c) => c.isForeignKey).length ?? 0;

            return (
              <Card
                key={table.name}
                className={!table.enabled ? "opacity-50" : ""}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={table.enabled}
                      onCheckedChange={() => toggleTable(table.name)}
                    />
                    <button
                      onClick={() => toggleExpand(table.name)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {expandedTables.has(table.name) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Table2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">{table.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {info?.type ?? "table"}
                      </Badge>
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {pkCount > 0 && <span>{pkCount} PK</span>}
                        {fkCount > 0 && <span>{fkCount} FK</span>}
                        <span>{table.columns.length} cols</span>
                      </div>
                      {table.enabled && (
                        <Link
                          href={`/connections/${connectionId}/tables/${table.name}`}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {expandedTables.has(table.name) && table.enabled && (
                  <CardContent className="pb-3 px-4">
                    <Separator className="mb-3" />
                    <div className="space-y-1">
                      <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                        <div className="col-span-4">Column</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-3">Display Name</div>
                        <div className="col-span-3 text-right">Options</div>
                      </div>
                      {table.columns
                        .sort((a, b) => a.order - b.order)
                        .map((col) => {
                          const colInfo = getColumnInfo(table.name, col.name);
                          return (
                            <div
                              key={col.name}
                              className={`grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-md hover:bg-muted/50 ${
                                !col.visible ? "opacity-50" : ""
                              }`}
                            >
                              <div className="col-span-4 flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    toggleColumnVisibility(table.name, col.name)
                                  }
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  {col.visible ? (
                                    <Eye className="h-3.5 w-3.5" />
                                  ) : (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <span className="text-sm font-mono text-primary">
                                  {col.name}
                                </span>
                                {colInfo?.isPrimaryKey && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 h-4"
                                  >
                                    PK
                                  </Badge>
                                )}
                                {colInfo?.isForeignKey && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1 py-0 h-4"
                                  >
                                    FK
                                  </Badge>
                                )}
                              </div>
                              <div className="col-span-2">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-mono"
                                >
                                  {colInfo?.dataType ?? "unknown"}
                                </Badge>
                              </div>
                              <div className="col-span-3">
                                <Input
                                  value={col.displayName}
                                  onChange={(e) =>
                                    updateColumnAlias(
                                      table.name,
                                      col.name,
                                      e.target.value
                                    )
                                  }
                                  className="h-7 text-xs"
                                  placeholder={col.name}
                                />
                              </div>
                              <div className="col-span-3 flex items-center justify-end gap-2">
                                <div className="flex items-center gap-1.5">
                                  <Label className="text-[10px] text-muted-foreground">
                                    Read-only
                                  </Label>
                                  <Switch
                                    checked={col.readOnly}
                                    onCheckedChange={() =>
                                      toggleColumnReadOnly(table.name, col.name)
                                    }
                                    className="scale-75"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {filteredTables.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {searchQuery
                  ? `No tables matching "${searchQuery}"`
                  : "No tables found in database"}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}