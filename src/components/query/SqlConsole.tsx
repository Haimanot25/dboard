"use client";

import { useState, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Timer,
  Database,
  Copy,
  Check,
  Trash2,
  History,
  X,
  ChevronRight,
  Sparkles,
  Wand2,
  Bookmark,
  BookmarkCheck,
  AlignLeft,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAiQuery } from "@/hooks/use-ai-query";
import { useAiProviders } from "@/hooks/use-ai-providers";
import { useSavedQueries, useSaveQuery, useDeleteSavedQuery } from "@/hooks/use-saved-queries";

interface QueryResult {
  columns: string[];
  data: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}

interface HistoryItem {
  id: string;
  sql: string;
  durationMs: number;
  rowCount: number;
  error: string | null;
  createdAt: string;
}

interface SqlConsoleProps {
  connectionId: string;
}

export function SqlConsole({ connectionId }: SqlConsoleProps) {
  const [sql, setSql] = useState("SELECT * FROM ");
  const { data: providers } = useAiProviders();
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModelId, setAiModelId] = useState("");
  const [copied, setCopied] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineCount = sql.split("\n").length;

  const { data: savedQueries } = useSavedQueries(connectionId);
  const saveQueryMutation = useSaveQuery(connectionId);
  const deleteSavedQueryMutation = useDeleteSavedQuery(connectionId);

  const enabledModels = providers
    ?.filter((p) => p.isEnabled)
    .flatMap((p) => p.models.map((m) => ({ ...m, providerName: p.displayName }))) ?? [];

  const defaultModel = enabledModels.find((m) => m.isDefault) ?? enabledModels[0];
  const activeModelId = aiModelId || defaultModel?.id || "";

  const { data: history } = useQuery<HistoryItem[]>({
    queryKey: ["query-history", connectionId],
    queryFn: async () => {
      const res = await fetch(`/api/query/${connectionId}/history?limit=50`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    refetchOnWindowFocus: true,
  });

  const queryMutation = useMutation<QueryResult, Error, string>({
    mutationFn: async (sqlQuery: string) => {
      const res = await fetch(`/api/query/${connectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlQuery }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Query failed");
      }
      return res.json();
    },
  });

  const aiMutation = useAiQuery(connectionId);

  const handleExecute = useCallback(() => {
    if (!sql.trim()) return;
    queryMutation.mutate(sql);
  }, [sql, queryMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleExecute();
      }
    },
    [handleExecute]
  );

  const loadFromHistory = useCallback((item: HistoryItem) => {
    setSql(item.sql);
    setShowHistory(false);
  }, []);

  const handleAiGenerate = useCallback(async () => {
    const modelId = aiModelId || defaultModel?.id;
    if (!aiPrompt.trim() || !modelId) return;
    const result = await aiMutation.mutateAsync({ prompt: aiPrompt, modelId });
    setSql(result.sql);
    setShowAi(false);
    setAiPrompt("");
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [aiPrompt, aiModelId, defaultModel, aiMutation]);

  const handleCopyResults = useCallback(async () => {
    const result = queryMutation.data;
    if (!result) return;
    const header = result.columns.join("\t");
    const rows = result.data.map((r) => result.columns.map((c) => String(r[c] ?? "")).join("\t")).join("\n");
    const text = `${header}\n${rows}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy query results:", err);
    }
  }, [queryMutation.data]);

  const formatSql = useCallback(() => {
    const keywords = ["SELECT", "FROM", "WHERE", "AND", "OR", "ORDER BY", "GROUP BY", "HAVING", "LIMIT", "OFFSET", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "OUTER JOIN", "ON", "AS", "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM", "CREATE TABLE", "ALTER TABLE", "DROP TABLE", "UNION", "ALL", "DISTINCT", "IN", "NOT", "NULL", "IS", "BETWEEN", "LIKE", "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END"];
    let formatted = sql;
    keywords.forEach((kw) => {
      const regex = new RegExp(`\\b${kw.replace(/ /g, "\\s+")}\\b`, "gi"); // eslint-disable-line security/detect-non-literal-regexp
      formatted = formatted.replace(regex, `\n${kw}`);
    });
    formatted = formatted.replace(/^\n+/, "").replace(/,\s*/g, ",\n  ");
    setSql(formatted);
  }, [sql]);

  const handleSaveQuery = useCallback(async () => {
    if (!sql.trim()) return;
    await saveQueryMutation.mutateAsync({ name: saveName || sql.slice(0, 50), sql });
    setShowSaveInput(false);
    setSaveName("");
  }, [sql, saveName, saveQueryMutation]);

  const result = queryMutation.data;
  const error = queryMutation.error;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Editor Card */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Database className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium">SQL Query</span>
            <kbd className="hidden sm:inline-flex text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 font-mono">
              Ctrl+Enter
            </kbd>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground/60">
              {lineCount} line{lineCount !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground"
              onClick={formatSql}
              title="Format SQL"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 text-xs gap-1.5", showSaved ? "text-primary bg-primary/10" : "text-muted-foreground")}
              onClick={() => { setShowSaved(!showSaved); setShowHistory(false); }}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Saved
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 text-xs gap-1.5", showAi ? "text-primary bg-primary/10" : "text-muted-foreground")}
              onClick={() => setShowAi(!showAi)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 text-xs gap-1.5", showHistory ? "text-primary bg-primary/10" : "text-muted-foreground")}
              onClick={() => { setShowHistory(!showHistory); setShowSaved(false); }}
            >
              <History className="h-3.5 w-3.5" />
              History
            </Button>
            {sql && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setSql("")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {sql && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setShowSaveInput(true)}
                title="Save query"
              >
                <BookmarkCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {queryMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 shadow-sm"
              onClick={handleExecute}
              disabled={queryMutation.isPending || !sql.trim()}
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </Button>
          </div>
        </div>

        {/* Editor with line numbers */}
        <div className="flex code-editor min-h-[200px]">
          <div className="code-line-numbers py-3 px-3 bg-muted/20 select-none text-right text-xs leading-5 font-mono text-muted-foreground/30 border-r border-border/30 shrink-0 min-w-[3rem]">
            {Array.from({ length: Math.max(lineCount, 8) }, (_, i) => (
              <div key={i} className="h-5">{i + 1}</div>
            ))}
          </div>
          <div className="flex-1 relative" onKeyDown={handleKeyDown}>
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              className={cn(
                "w-full min-h-[200px] p-3 font-mono text-sm resize-y border-0 focus:outline-none focus:ring-0",
                "bg-background text-foreground leading-5",
                "placeholder:text-muted-foreground/30"
              )}
              placeholder="Enter SQL query here..."
              spellCheck={false}
              style={{ lineHeight: "1.25rem" }}
            />
          </div>
        </div>
      </div>

      {/* AI Panel */}
      {showAi && (
        <Card className="border-primary/20 shadow-sm animate-slide-down">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                AI-Powered SQL Generation
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowAi(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {enabledModels.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <select
                  value={activeModelId}
                  onChange={(e) => setAiModelId(e.target.value)}
                  className="h-7 text-[10px] rounded-md border border-input bg-background px-2 pr-5 focus:outline-none focus:ring-1 focus:ring-ring appearance-none bg-no-repeat"
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                    backgroundPosition: "right 4px center",
                    paddingRight: "18px",
                  }}
                >
                  {providers?.filter((p) => p.isEnabled).map((p) => (
                    <optgroup key={p.id} label={p.displayName}>
                      {p.models.map((m) => (
                        <option key={m.id} value={m.id}>{m.displayName}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='Describe what you want to query, e.g. "Show me the top 10 users by order amount this month"'
                className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleAiGenerate();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground/60">
                  Schema-only context — your data never leaves this server. Ctrl+Enter to generate.
                </p>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleAiGenerate}
                  disabled={aiMutation.isPending || !aiPrompt.trim() || !defaultModel}
                >
                  {aiMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  Generate
                </Button>
              </div>
            </div>
            {aiMutation.error && (
              <p className="text-xs text-destructive mt-2">{aiMutation.error.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Panel */}
      {showHistory && history && history.length > 0 && (
        <Card className="border shadow-sm animate-slide-down">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Query History
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowHistory(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="max-h-[280px] overflow-y-auto space-y-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-muted/60 transition-colors group flex items-start gap-2.5"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono truncate text-foreground/80">
                      {item.sql}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {item.durationMs}ms
                      </span>
                      <span>{item.rowCount} row(s)</span>
                      {item.error && (
                        <span className="text-destructive/70 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showHistory && (!history || history.length === 0) && (
        <Card className="border shadow-sm animate-slide-down">
          <CardContent className="pt-6 pb-4 text-center text-sm text-muted-foreground/60">
            No query history yet.
          </CardContent>
        </Card>
      )}

      {/* Saved Queries Panel */}
      {showSaved && (
        <Card className="border shadow-sm animate-slide-down">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-muted-foreground" />
                Saved Queries
              </h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowSaved(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {showSaveInput && (
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/30">
                <input
                  autoFocus
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveQuery();
                    if (e.key === "Escape") setShowSaveInput(false);
                  }}
                  placeholder="Query name (optional)"
                  className="flex-1 h-7 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveQuery} disabled={saveQueryMutation.isPending}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSaveInput(false)}>
                  Cancel
                </Button>
              </div>
            )}
            <div className="max-h-[280px] overflow-y-auto space-y-1">
              {!savedQueries || savedQueries.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 text-center py-4">No saved queries yet.</p>
              ) : (
                savedQueries.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors group">
                    <button
                      className="flex-1 text-left"
                      onClick={() => { setSql(item.sql); setShowSaved(false); }}
                    >
                      <div className="text-xs font-mono truncate text-foreground/80">{item.sql}</div>
                      <div className="text-[10px] text-muted-foreground/40 mt-1">{new Date(item.createdAt).toLocaleDateString()}</div>
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                      onClick={() => deleteSavedQueryMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 animate-slide-down">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">Query Error</p>
              <p className="text-sm text-muted-foreground/80 mt-0.5 font-mono text-xs">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Completed</span>
              </span>
              <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                <Timer className="h-3 w-3" />
                {result.durationMs}ms
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {result.rowCount} row{result.rowCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground"
              onClick={handleCopyResults}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy Results"}
            </Button>
          </div>

          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            {result.data.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-sm text-muted-foreground/60">
                Query returned no rows.
              </div>
            ) : (
              <VirtualizedTable columns={result.columns} data={result.data} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ROW_HEIGHT = 32;

function VirtualizedTable({ columns, data }: { columns: string[]; data: Record<string, unknown>[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  return (
    <div ref={parentRef} className="overflow-auto max-h-[500px]">
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b bg-muted/80 backdrop-blur-sm">
            {columns.map((col) => (
              <th
                key={col}
                className="h-9 px-3 text-left align-middle font-medium text-muted-foreground text-[11px] uppercase tracking-widest whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} style={{ height: rowVirtualizer.getTotalSize() }} className="p-0" />
          </tr>
        </tbody>
      </table>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = data[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={cn(
                "flex border-b border-border/40 hover:bg-muted/30",
                virtualRow.index % 2 === 1 && "bg-muted/10"
              )}
            >
              {columns.map((col) => (
                <div
                  key={col}
                  className="px-3 py-1.5 text-sm font-mono text-xs flex-1 min-w-0 truncate"
                  style={{ minWidth: 130 }}
                >
                  {formatCellValue(row[col])}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
