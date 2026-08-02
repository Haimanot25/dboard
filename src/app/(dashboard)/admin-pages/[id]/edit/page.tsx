"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminPage, useUpdateAdminPage } from "@/hooks/use-admin-pages";
import { useIntrospectSchema } from "@/hooks/use-schema";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutGrid, ArrowLeft, Loader2,
  Database, Eye, EyeOff, Search, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchemaTableInfo, AdminPageConfig } from "@/types";

export default function EditAdminPagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: adminPage, isLoading: pageLoading } = useAdminPage(params.id);
  const updateMutation = useUpdateAdminPage();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTables, setSelectedTables] = useState<Record<string, string[]>>({});
  const [tableDisplayNames, setTableDisplayNames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const initializedRef = useRef(false);

  const connectionId = adminPage?.connectionId ?? "";
  const { data: schema, isLoading: schemaLoading } = useIntrospectSchema(connectionId);

  useEffect(() => {
    if (adminPage && !initializedRef.current) {
      initializedRef.current = true;
      setName(adminPage.name);
      setDescription(adminPage.description ?? "");
      try {
        const config: AdminPageConfig = JSON.parse(adminPage.config);
        const tables: Record<string, string[]> = {};
        const displayNames: Record<string, string> = {};
        config.tables.forEach((t) => {
          tables[t.name] = t.columns;
          if (t.displayName) displayNames[t.name] = t.displayName;
        });
        setSelectedTables(tables);
        setTableDisplayNames(displayNames);
      } catch (err) {
        console.error("Failed to parse admin page config:", err);
      }
    }
  }, [adminPage]);

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

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id: params.id,
        name,
        description: description || undefined,
        config: {
          tables: Object.entries(selectedTables).map(([name, columns]) => ({
            name,
            columns,
            displayName: tableDisplayNames[name]?.trim() || undefined,
          })),
        },
      });
      router.push(`/admin-pages/${params.id}`);
    } catch (err) {
      console.error("Failed to update admin page:", err);
    }
  };

  if (pageLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Edit Admin Page"
          description="Loading..."
          icon={<LayoutGrid className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Admin Pages", href: "/admin-pages" },
            { label: "Edit" },
          ]}
        />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!adminPage) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Not Found"
          description="Admin page not found"
          icon={<LayoutGrid className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Admin Pages", href: "/admin-pages" },
            { label: "Not Found" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit Admin Page"
        description={`Editing "${adminPage.name}"`}
        icon={<LayoutGrid className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Admin Pages", href: "/admin-pages" },
          { label: adminPage.name, href: `/admin-pages/${params.id}` },
          { label: "Edit" },
        ]}
      />

      {/* Name & Description */}
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
        </CardContent>
      </Card>

      {/* Table & Column Selection */}
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
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push(`/admin-pages/${params.id}`)} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Admin Page
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || tableCount === 0 || updateMutation.isPending}
          className="gap-1.5 shadow-lg shadow-primary/20"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
