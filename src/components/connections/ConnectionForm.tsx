"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useTestConnection } from "@/hooks/use-connections";
import { Loader2, CheckCircle2, XCircle, Server, ArrowLeft } from "lucide-react";
import { DRIVERS } from "@/lib/db/drivers/registry";

interface ConnectionFormProps {
  initialData?: {
    id?: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    ssl: boolean;
    readOnly: boolean;
  };
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  mode: "create" | "edit";
}

export function ConnectionForm({ initialData, onSubmit, mode }: ConnectionFormProps) {
  const router = useRouter();
  const testMutation = useTestConnection();

  const [name, setName] = useState(initialData?.name || "");
  const [dbType, setDbType] = useState(initialData?.type || "postgresql");
  const [host, setHost] = useState(initialData?.host || "");
  const [port, setPort] = useState(String(initialData?.port || 5432));
  const [database, setDatabase] = useState(initialData?.database || "");
  const [username, setUsername] = useState(initialData?.username || "");
  const [password, setPassword] = useState("");
  const [ssl, setSsl] = useState(initialData?.ssl || false);
  const [readOnly, setReadOnly] = useState(initialData?.readOnly || false);
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "testing" | "success" | "error">("idle");

  const driverDef = Object.values(DRIVERS).find((d) => d.id === dbType) || Object.values(DRIVERS)[0];
  const isFileBased = driverDef.fileBased;
  const isApiKeyAuth = driverDef.apiKeyAuth;
  const needsSSL = driverDef.forceSSL;

  const getSubmitData = () => ({
    name, type: dbType, host, port, database, username, password, ssl: ssl || needsSSL || false, readOnly,
    ...(isApiKeyAuth ? { apiKey: password } : {}),
  });

  const handleTest = async () => {
    setTestResult("testing");
    try {
      await testMutation.mutateAsync(getSubmitData());
      setTestResult("success");
    } catch {
      setTestResult("error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(getSubmitData());
    } finally {
      setSubmitting(false);
    }
  };

  const onTypeChange = (newType: string) => {
    setDbType(newType);
    const def = Object.values(DRIVERS).find((d) => d.id === newType);
    if (def) {
      if (def.apiKeyAuth) {
        setPort("");
        setUsername("");
        if (!initialData?.database) setDatabase(def.defaultDatabase);
      } else {
        setPort(String(def.defaultPort ?? ""));
        if (!initialData?.database) setDatabase(def.defaultDatabase);
        if (!initialData?.username) setUsername(def.defaultUsername);
        if (def.forceSSL) setSsl(true);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => router.push("/connections")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              {mode === "create" ? "New Connection" : "Edit Connection"}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-0.5 ml-11">
            {mode === "create" ? "Connect to a database" : "Update your database connection details"}
          </p>
        </div>
      </div>

      <Card className="shadow-sm max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Connection Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Database"
                required
                className="h-9"
              />
            </div>

            {/* Database Type Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="dbType" className="text-sm font-medium">Database Type</Label>
              <select
                id="dbType"
                value={dbType}
                onChange={(e) => onTypeChange(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {Object.values(DRIVERS).map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            {isFileBased ? (
              /* SQLite: file path */
              <div className="space-y-1.5">
                <Label htmlFor="database" className="text-sm font-medium">Database File Path</Label>
                <Input
                  id="database"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  placeholder="/path/to/database.db"
                  required
                  className="h-9 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground/40">Absolute path to the SQLite database file on the server.</p>
              </div>
            ) : isApiKeyAuth ? (
              /* Supabase / API Key based */
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="host" className="text-sm font-medium">Project URL</Label>
                  <Input
                    id="host"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="https://[ref].supabase.co"
                    required
                    className="h-9 font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground/40">Your Supabase project URL from Settings &rarr; API.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="database" className="text-sm font-medium">Database Name</Label>
                  <Input
                    id="database"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder={driverDef.defaultDatabase}
                    required
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">API Key</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "edit" ? "Leave blank to keep current" : "anon or service_role key"}
                    className="h-9 font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground/40">Use the <strong>anon</strong> (read-only) or <strong>service_role</strong> key from Settings &rarr; API.</p>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2.5">
                    <Switch id="readOnly" checked={readOnly} onCheckedChange={setReadOnly} />
                    <Label htmlFor="readOnly" className="text-sm cursor-pointer">Read Only</Label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3 space-y-1.5">
                    <Label htmlFor="host" className="text-sm font-medium">Host</Label>
                    <Input
                      id="host"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="localhost"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="port" className="text-sm font-medium">Port</Label>
                    <Input
                      id="port"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder={String(driverDef.defaultPort ?? "")}
                      required
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="database" className="text-sm font-medium">Database Name</Label>
                  <Input
                    id="database"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder={driverDef.defaultDatabase}
                    required
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={driverDef.defaultUsername || "username"}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "edit" ? "Leave blank to keep current" : "Password"}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      id="ssl"
                      checked={ssl || needsSSL || false}
                      onCheckedChange={needsSSL ? undefined : setSsl}
                      disabled={needsSSL}
                    />
                    <Label htmlFor="ssl" className="text-sm cursor-pointer">
                      Use SSL{needsSSL ? " (required)" : ""}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Switch id="readOnly" checked={readOnly} onCheckedChange={setReadOnly} />
                    <Label htmlFor="readOnly" className="text-sm cursor-pointer">Read Only</Label>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleTest}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Test Connection
              </Button>
              {testResult === "success" && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connection successful
                </span>
              )}
              {testResult === "error" && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  {testMutation.error instanceof Error ? testMutation.error.message : "Connection failed"}
                </span>
              )}
            </div>

            <div className="flex gap-3 pt-2 border-t border-border/50">
              <Button type="submit" className="gap-1.5" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Connection" : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/connections")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
