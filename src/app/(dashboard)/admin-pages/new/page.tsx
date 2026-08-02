"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConnections } from "@/hooks/use-connections";
import { useIntrospectSchema } from "@/hooks/use-schema";
import { useCreateAdminPage } from "@/hooks/use-admin-pages";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutGrid, ArrowRight, ArrowLeft, Check, Loader2,
  Database, Eye, EyeOff, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchemaTableInfo } from "@/types";

export default function NewAdminPagePage() {
  const router = useRouter();
  const { data: connections } = useConnections();
  const createMutation = useCreateAdminPage();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [connectionId, setConnectionId] = useState("");
  const [selectedTables, setSelectedTables] = useState<Record<string, string[]>>({});
  const [tableDisplayNames, setTableDisplayNames] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const initializedRef = useRef(false);

  const { data: schema, isLoading: schemaLoading } = useIntrospectSchema(
    step >= 2 ? connectionId : ""
  );

  const selectedConnection = connections?.find((c) => c.id === connectionId);

  useEffect(() => {
    if (schema?.tables && !initializedRef.current) {
      initializedRef.current = true;
      const initial: Record<string, string[]> = {};
      schema.tables.forEach((t: SchemaTableInfo) => {
        if (t.type === "table") {
          initial[t.name] = t.columns.map((c) => c.name);
        }
      });
      setSelectedTables(initial);
    }
  }, [schema]);

  const toggleTable = (tableName: string) => {
    setSelectedTables((prev) => {
      const next = { ...prev };
      if (next[tableName]) {
        delete next[tableName];
      } else {
        const table = schema?.tables?.find((t: SchemaTableInfo) => t.name === tableName);
        next[tableName] = table?.columns.map((c) => c.name) ?? [];
      }
      return next;
    });
  };

  const toggleColumn = (tableName: string, columnName: string) => {
    setSelectedTables((prev) => {
      const next = { ...prev };
      const cols = next[tableName] ?? [];
      if (cols.includes(columnName)) {
        next[tableName] = cols.filter((c) => c !== columnName);
        if (next[tableName].length === 0) delete next[tableName];
      } else {
        next[tableName] = [...cols, columnName];
      }
      return next;
    });
  };

  const selectAllColumns = (tableName: string) => {
    const table = schema?.tables?.find((t: SchemaTableInfo) => t.name === tableName);
    if (table) {
      setSelectedTables((prev) => ({
        ...prev,
        [tableName]: table.columns.map((c) => c.name),
      }));
    }
  };

  const tableCount = Object.keys(selectedTables).length;
  const filteredTables = schema?.tables?.filter((t: SchemaTableInfo) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const handleCreate = async () => {
    if (!name.trim() || !connectionId) return;
    try {
      const page = await createMutation.mutateAsync({
        name,
        description: description || undefined,
        connectionId,
        config: {
          tables: Object.entries(selectedTables).map(([tableName, columns]) => ({
            name: tableName,
            columns,
            displayName: tableDisplayNames[tableName]?.trim() || undefined,
          })),
        },
      });
      router.push(`/admin-pages/${page.id}`);
    } catch (err) {
      console.error("Failed to create admin page:", err);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Admin Page"
        description="Build a custom CRUD interface from your database tables"
        icon={<LayoutGrid className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Admin Pages", href: "/admin-pages" },
          { label: "Create" },
        ]}
      />

      {/* Step Indicator */}
      <div className="flex items-center gap-3">
        {[
          { num: 1, label: "Choose Connection" },
          { num: 2, label: "Select Tables & Columns" },
          { num: 3, label: "Name & Save" },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  step >= s.num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span className={cn("text-xs font-medium", step >= s.num ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {i < 2 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30" />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Connection */}
      {step === 1 && (
        <Card className="shadow-sm border">
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Database Connection</label>
              <select
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a connection...</option>
                {connections?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!connectionId}
                className="gap-1.5"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Tables & Columns */}
      {step === 2 && (
        <div className="space-y-4">
          {schemaLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tables..."
                    className="w-full h-9 pl-8 pr-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <Badge variant="outline" className="text-xs">
                  {tableCount} / {schema?.tables?.length ?? 0} tables selected
                </Badge>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredTables.map((table: SchemaTableInfo) => {
                  const isSelected = !!selectedTables[table.name];
                  const selectedCols = selectedTables[table.name] ?? [];

                  return (
                    <Card
                      key={table.name}
                      className={cn(
                        "transition-all",
                        !isSelected && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTable(table.name)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Database className="h-4 w-4 text-muted-foreground/60" />
                        <span className="text-sm font-medium">{table.name}</span>
                        {isSelected && (
                          <input
                            value={tableDisplayNames[table.name] ?? ""}
                            onChange={(e) =>
                              setTableDisplayNames((prev) => ({ ...prev, [table.name]: e.target.value }))
                            }
                            placeholder="Display name (optional)"
                            className="h-7 flex-1 min-w-0 max-w-[200px] text-xs rounded-md border border-input bg-muted/30 px-2 focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background"
                          />
                        )}
                        {!isSelected && (
                          <span className="flex-1" />
                        )}
                        {isSelected && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {selectedCols.length} / {table.columns.length} columns
                          </Badge>
                        )}
                      </div>

                      {isSelected && (
                        <div className="border-t px-3 py-2 space-y-1">
                          <div className="flex items-center gap-1 mb-1.5">
                            <button
                              onClick={() => selectAllColumns(table.name)}
                              className="text-[10px] text-primary hover:underline"
                            >
                              Select all
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                            {table.columns.map((col) => {
                              const colSelected = selectedCols.includes(col.name);
                              return (
                                <button
                                  key={col.name}
                                  onClick={() => toggleColumn(table.name, col.name)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors text-left",
                                    colSelected
                                      ? "bg-primary/10 text-primary"
                                      : "bg-muted/50 text-muted-foreground/60 hover:bg-muted"
                                  )}
                                >
                                  {colSelected ? (
                                    <Eye className="h-3 w-3 shrink-0" />
                                  ) : (
                                    <EyeOff className="h-3 w-3 shrink-0" />
                                  )}
                                  <span className="truncate">{col.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={tableCount === 0}
                  className="gap-1.5"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Name & Save */}
      {step === 3 && (
        <Card className="shadow-sm border">
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Admin Page Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. User Management"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Manage users, orders, and products"
                className="h-9 text-sm"
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium">Summary</p>
              <p className="text-xs text-muted-foreground/70">
                Connection: {selectedConnection?.name} · {tableCount} table{tableCount !== 1 ? "s" : ""} selected
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {Object.entries(selectedTables).map(([tableName, cols]) => (
                  <Badge key={tableName} variant="outline" className="text-[10px] font-mono">
                    {tableDisplayNames[tableName]?.trim() || tableName} ({cols.length} cols)
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || createMutation.isPending}
                className="gap-1.5 shadow-lg shadow-primary/20"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LayoutGrid className="h-3.5 w-3.5" />
                )}
                Create Admin Page
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
