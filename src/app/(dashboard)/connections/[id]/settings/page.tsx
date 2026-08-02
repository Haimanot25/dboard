"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "@/hooks/use-api-keys";
import { useWebhooks, useCreateWebhook, useDeleteWebhook } from "@/hooks/use-webhooks";
import { useShares, useCreateShare, useDeleteShare } from "@/hooks/use-shares";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { useAlerts, useCreateAlert, useDeleteAlert, useToggleAlert } from "@/hooks/use-alerts";
import {
  Key, Globe, Share2, ClipboardList, Copy, Trash2, Plus, Loader2, CheckCircle2, Bell, Settings,
} from "lucide-react";

type Tab = "api-keys" | "webhooks" | "shares" | "audit-logs" | "alerts";

export default function ConnectionSettingsPage() {
  const params = useParams<{ id: string }>();
  const connectionId = params.id;
  const [activeTab, setActiveTab] = useState<Tab>("api-keys");

  const tabs: { key: Tab; label: string; icon: typeof Key }[] = [
    { key: "api-keys", label: "API Keys", icon: Key },
    { key: "webhooks", label: "Webhooks", icon: Globe },
    { key: "alerts", label: "Alerts", icon: Bell },
    { key: "shares", label: "Sharing", icon: Share2 },
    { key: "audit-logs", label: "Audit Logs", icon: ClipboardList },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Connection Settings"
        description="Manage API keys, webhooks, sharing, and audit logs"
        icon={<Settings className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Connections", href: "/connections" },
          { label: "Settings" },
        ]}
      />

      {/* Pill Tabs */}
      <div className="flex gap-1.5 p-1 bg-muted/60 rounded-xl w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "api-keys" && <ApiKeysSection connectionId={connectionId} />}
      {activeTab === "webhooks" && <WebhooksSection connectionId={connectionId} />}
      {activeTab === "alerts" && <AlertsSection connectionId={connectionId} />}
      {activeTab === "shares" && <SharesSection connectionId={connectionId} />}
      {activeTab === "audit-logs" && <AuditLogsSection connectionId={connectionId} />}
    </div>
  );
}

function ApiKeysSection({ connectionId }: { connectionId: string }) {
  const { data: keys, isLoading } = useApiKeys(connectionId);
  const createMutation = useCreateApiKey();
  const deleteMutation = useDeleteApiKey();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState("read");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createMutation.mutateAsync({ name, connectionId, permissions });
    setNewKey(result.key);
    setName("");
  };

  return (
    <>
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Key className="h-4 w-4" /> API Keys
        </CardTitle>
        <CardDescription className="text-xs">
          Manage API keys for programmatic access to this connection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {newKey && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 space-y-2 animate-slide-down">
            <p className="text-xs font-medium flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              API Key Created — copy it now, it won&apos;t be shown again!
            </p>
            <div className="flex gap-2">
              <code className="flex-1 p-2.5 bg-background rounded-lg text-xs font-mono border break-all select-all">{newKey}</code>
              <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => { navigator.clipboard.writeText(newKey); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="key-name" className="text-xs">Key Name</Label>
            <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CI Pipeline" required className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="key-perms" className="text-xs">Permissions</Label>
            <select
              id="key-perms"
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              className="flex h-9 w-[110px] rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={createMutation.isPending || !name}>
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create
          </Button>
        </form>

        {createMutation.error && (
          <p className="text-xs text-destructive">{createMutation.error.message}</p>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : keys && keys.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Key className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground/60">No API keys created yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {keys?.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">...{key.lastChars}</code>
                    <span className="mx-1.5">&middot;</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal">{key.permissions}</Badge>
                    {key.expiresAt && (
                      <>
                        <span className="mx-1.5">&middot;</span>
                        Expires {new Date(key.expiresAt).toLocaleDateString()}
                      </>
                    )}
                    {key.lastUsedAt ? (
                      <>
                        <span className="mx-1.5">&middot;</span>
                        Used {new Date(key.lastUsedAt).toLocaleDateString()}
                      </>
                    ) : (
                      <>
                        <span className="mx-1.5">&middot;</span>
                        <span className="text-muted-foreground/40">Never used</span>
                      </>
                    )}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteKeyId(key.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={!!deleteKeyId}
      onOpenChange={(open) => { if (!open) setDeleteKeyId(null); }}
      title="Delete API key"
      description="Are you sure you want to delete this API key?"
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={() => {
        if (deleteKeyId) {
                     deleteMutation.mutate(deleteKeyId);
          setDeleteKeyId(null);
        }
      }}
    />
    </>
  );
}

function WebhooksSection({ connectionId }: { connectionId: string }) {
  const { data: webhooks, isLoading } = useWebhooks(connectionId);
  const createMutation = useCreateWebhook();
  const deleteMutation = useDeleteWebhook();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("row.created,row.updated,row.deleted");
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ name, url, events, connectionId });
    setName("");
    setUrl("");
  };

  return (
    <>
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> Webhooks
        </CardTitle>
        <CardDescription className="text-xs">Send real-time notifications on data changes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleCreate} className="space-y-3 p-4 rounded-xl bg-muted/30 border">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="wh-name" className="text-xs">Name</Label>
              <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Webhook" required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wh-url" className="text-xs">URL</Label>
              <Input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" required className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wh-events" className="text-xs">Events (comma-separated)</Label>
            <Input id="wh-events" value={events} onChange={(e) => setEvents(e.target.value)} className="h-9 text-sm" />
            <p className="text-[10px] text-muted-foreground/60">Options: row.created, row.updated, row.deleted, row.bulk_delete</p>
          </div>
          <Button type="submit" size="sm" className="gap-1.5" disabled={createMutation.isPending || !name || !url}>
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add Webhook
          </Button>
        </form>

        {createMutation.error && (
          <p className="text-xs text-destructive">{createMutation.error.message}</p>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : webhooks && webhooks.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Globe className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground/60">No webhooks configured.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {webhooks?.map((wh) => (
              <div key={wh.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{wh.name}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5 truncate max-w-md">{wh.url} &middot; Events: {wh.events}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={wh.enabled ? "default" : "secondary"} className="text-[9px] px-1.5 py-0">
                    {wh.enabled ? "Active" : "Disabled"}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteWebhookId(wh.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={!!deleteWebhookId}
      onOpenChange={(open) => { if (!open) setDeleteWebhookId(null); }}
      title="Delete webhook"
      description="Are you sure you want to delete this webhook?"
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={() => {
        if (deleteWebhookId) {
          deleteMutation.mutate(deleteWebhookId);
          setDeleteWebhookId(null);
        }
      }}
    />
    </>
  );
}

function SharesSection({ connectionId }: { connectionId: string }) {
  const { data: shares, isLoading } = useShares(connectionId);
  const createMutation = useCreateShare();
  const deleteMutation = useDeleteShare();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("read");
  const [deleteShareId, setDeleteShareId] = useState<string | null>(null);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ connectionId, sharedWithEmail: email, permission });
    setEmail("");
  };

  return (
    <>
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" /> Connection Sharing
        </CardTitle>
        <CardDescription className="text-xs">Share this connection with other team members</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleShare} className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="share-email" className="text-xs">User Email</Label>
            <Input id="share-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" required className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="share-perms" className="text-xs">Permission</Label>
            <select
              id="share-perms"
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="flex h-9 w-[110px] rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={createMutation.isPending || !email}>
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
            Share
          </Button>
        </form>

        {createMutation.error && (
          <p className="text-xs text-destructive">{createMutation.error.message}</p>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : shares && shares.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Share2 className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground/60">Not shared with anyone yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {shares?.map((share) => (
              <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {share.sharedWith.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{share.sharedWith.email}</p>
                    <p className="text-xs text-muted-foreground/60">
                      Permission: <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal">{share.permission}</Badge>
                      <span className="mx-1">&middot;</span>
                      by {share.sharedBy.email}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteShareId(share.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={!!deleteShareId}
      onOpenChange={(open) => { if (!open) setDeleteShareId(null); }}
      title="Remove share"
      description="Are you sure you want to remove this share?"
      confirmLabel="Remove"
      variant="destructive"
      onConfirm={() => {
        if (deleteShareId) {
          deleteMutation.mutate(deleteShareId);
          setDeleteShareId(null);
        }
      }}
    />
    </>
  );
}

function AlertsSection({ connectionId }: { connectionId: string }) {
  const { data: alerts, isLoading } = useAlerts(connectionId);
  const createMutation = useCreateAlert(connectionId);
  const deleteMutation = useDeleteAlert(connectionId);
  const toggleMutation = useToggleAlert(connectionId);
  const [name, setName] = useState("");
  const [tableName, setTableName] = useState("");
  const [condition, setCondition] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ name, tableName, condition, webhookUrl: webhookUrl || undefined });
    setName(""); setTableName(""); setCondition(""); setWebhookUrl("");
  };

  return (
    <>
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Data Change Alerts
        </CardTitle>
        <CardDescription className="text-xs">Monitor tables for data changes and get notified</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleCreate} className="space-y-3 p-4 rounded-xl bg-muted/30 border">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Alert Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Large orders" required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Table</Label>
              <Input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="orders" required className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Condition (SQL WHERE clause)</Label>
            <Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="total > 1000 AND status = 'pending'" required className="h-9 text-sm font-mono" />
            <p className="text-[10px] text-muted-foreground/60">Rows matching this condition will trigger the alert</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Webhook URL (optional)</Label>
            <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="h-9 text-sm" />
          </div>
          <Button type="submit" size="sm" className="gap-1.5" disabled={createMutation.isPending || !name || !tableName || !condition}>
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create Alert
          </Button>
        </form>

        {isLoading ? (
          <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
        ) : alerts && alerts.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Bell className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground/60">No alerts configured.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {alerts?.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{alert.name}</p>
                    <Badge variant={alert.enabled ? "default" : "secondary"} className="text-[9px] px-1.5 py-0">
                      {alert.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">{alert.tableName}</code>
                    <span className="mx-1.5">&middot;</span>
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">{alert.condition}</code>
                    {alert.lastTriggeredAt && (
                      <>
                        <span className="mx-1.5">&middot;</span>
                        Last triggered {new Date(alert.lastTriggeredAt).toLocaleString()}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="h-7 px-2 text-[10px] rounded-md border border-input bg-background hover:bg-muted transition-colors"
                    onClick={() => toggleMutation.mutate({ alertId: alert.id, enabled: !alert.enabled })}
                  >
                    {alert.enabled ? "Disable" : "Enable"}
                  </button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100" onClick={() => setDeleteAlertId(alert.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={!!deleteAlertId}
      onOpenChange={(open) => { if (!open) setDeleteAlertId(null); }}
      title="Delete alert"
      description="Are you sure you want to delete this alert?"
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={() => {
        if (deleteAlertId) {
          deleteMutation.mutate(deleteAlertId);
          setDeleteAlertId(null);
        }
      }}
    />
    </>
  );
}

function AuditLogsSection({ connectionId }: { connectionId: string }) {
  const { data: logs, isLoading } = useAuditLogs(connectionId);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" /> Audit Logs
        </CardTitle>
        <CardDescription className="text-xs">Track all changes and actions on this connection</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-1">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : logs && logs.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground/60">No audit log entries yet.</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {logs?.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-2.5 text-sm border-b border-border/40 last:border-0 hover:bg-muted/20 rounded-lg transition-colors">
                <Badge variant="outline" className="shrink-0 mt-0.5 text-[10px] font-mono font-normal">
                  {log.action}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{log.details || log.action}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {log.user?.email || "System"}
                    <span className="mx-1">&middot;</span>
                    {new Date(log.createdAt).toLocaleString()}
                    {log.ip && (
                      <>
                        <span className="mx-1">&middot;</span>
                        IP: {log.ip}
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
