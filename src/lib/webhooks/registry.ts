import type { WebhookAction, WebhookActionPlugin, WebhookPayload, WebhookDeliveryResult } from "./types";
import { assertPublicUrl } from "@/lib/db/ssrf-guard";

const actionRegistry = new Map<string, WebhookAction>();
const actionPlugins = new Map<string, WebhookActionPlugin>();

function registerWebhookAction(action: WebhookAction): void {
  actionRegistry.set(action.id, action);
}

export function registerWebhookActionPlugin(plugin: WebhookActionPlugin): void {
  if (actionPlugins.has(plugin.id)) {
    console.warn(`Webhook action plugin "${plugin.id}" is already registered. Overwriting.`);
  }
  actionPlugins.set(plugin.id, plugin);
  for (const action of plugin.actions) {
    registerWebhookAction(action);
  }
}

export function getWebhookAction(id: string): WebhookAction | undefined {
  return actionRegistry.get(id);
}

export function getAllWebhookActions(): WebhookAction[] {
  return Array.from(actionRegistry.values());
}

export function getAllWebhookActionPlugins(): WebhookActionPlugin[] {
  return Array.from(actionPlugins.values());
}

async function postJson(url: string, body: Record<string, unknown>, headers?: Record<string, string>): Promise<WebhookDeliveryResult> {
  try {
    await assertPublicUrl(url);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Blocked" };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    return { success: res.ok, statusCode: res.status, responseBody: text.slice(0, 2000) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

registerWebhookAction({
  id: "slack",
  name: "Slack",
  description: "Send messages to a Slack channel via webhook URL",
  icon: "message-square",
  configFields: [
    { key: "channel", label: "Channel Override", type: "text", placeholder: "#alerts", description: "Optional channel override" },
  ],
  async deliver(url: string, payload: WebhookPayload, config: Record<string, unknown>): Promise<WebhookDeliveryResult> {
    const color = payload.event.includes("delete") ? "#ef4444" : payload.event.includes("create") ? "#22c55e" : "#3b82f6";
    const slackPayload: Record<string, unknown> = {
      attachments: [{
        color,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: `DBoard: ${payload.event.replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}` },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Connection:*\n${payload.connectionName || payload.connectionId || "N/A"}` },
              { type: "mrkdwn", text: `*Table:*\n${payload.tableName || "N/A"}` },
              { type: "mrkdwn", text: `*Time:*\n${new Date(payload.timestamp).toLocaleString()}` },
            ],
          },
        ],
      }],
    };
    if (config.channel) {
      (slackPayload as Record<string, unknown>).channel = config.channel;
    }
    return postJson(url, slackPayload);
  },
});

registerWebhookAction({
  id: "discord",
  name: "Discord",
  description: "Send embeds to a Discord channel via webhook URL",
  icon: "gamepad-2",
  configFields: [],
  async deliver(url: string, payload: WebhookPayload): Promise<WebhookDeliveryResult> {
    const color = payload.event.includes("delete") ? 0xef4444 : payload.event.includes("create") ? 0x22c55e : 0x3b82f6;
    const embed = {
      title: `DBoard: ${payload.event.replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`,
      color,
      fields: [
        { name: "Connection", value: payload.connectionName || payload.connectionId || "N/A", inline: true },
        { name: "Table", value: payload.tableName || "N/A", inline: true },
        { name: "Time", value: `<t:${Math.floor(new Date(payload.timestamp).getTime() / 1000)}:R>`, inline: true },
      ],
      footer: { text: "DBoard Webhook" },
      timestamp: payload.timestamp,
    };
    return postJson(url, { embeds: [embed] });
  },
});

registerWebhookAction({
  id: "pagerduty",
  name: "PagerDuty",
  description: "Trigger PagerDuty incidents via Events API v2",
  icon: "alert-triangle",
  configFields: [
    { key: "routingKey", label: "Routing Key", type: "password", required: true, description: "Integration key from PagerDuty service" },
    { key: "severity", label: "Severity", type: "select", default: "warning", options: [
      { label: "Critical", value: "critical" },
      { label: "Error", value: "error" },
      { label: "Warning", value: "warning" },
      { label: "Info", value: "info" },
    ]},
  ],
  async deliver(_url: string, payload: WebhookPayload, config: Record<string, unknown>): Promise<WebhookDeliveryResult> {
    const routingKey = config.routingKey as string;
    if (!routingKey) return { success: false, error: "Routing key is required" };
    const eventAction = payload.event.includes("delete") ? "trigger" : "trigger";
    const severity = (config.severity as string) || "warning";
    return postJson(`https://events.pagerduty.com/v2/enqueue`, {
      routing_key: routingKey,
      event_action: eventAction,
      payload: {
        summary: `DBoard ${payload.event}: ${payload.connectionName || ""} ${payload.tableName || ""}`.trim(),
        source: "DBoard",
        severity,
        timestamp: payload.timestamp,
        custom_details: { event: payload.event, data: payload.data },
      },
    });
  },
});

registerWebhookAction({
  id: "custom",
  name: "Custom HTTP",
  description: "Send a custom HTTP POST request to any URL",
  icon: "globe",
  configFields: [
    { key: "contentType", label: "Content-Type", type: "text", default: "application/json", description: "Request content type" },
    { key: "headers", label: "Custom Headers (JSON)", type: "textarea", placeholder: '{"Authorization": "Bearer token"}', description: "Additional headers as JSON" },
    { key: "transform", label: "Payload Transform", type: "select", default: "full", options: [
      { label: "Full Payload", value: "full" },
      { label: "Data Only", value: "data" },
      { label: "Minimal (event + timestamp)", value: "minimal" },
    ]},
  ],
  async deliver(url: string, payload: WebhookPayload, config: Record<string, unknown>): Promise<WebhookDeliveryResult> {
    let body: Record<string, unknown>;
    switch (config.transform) {
      case "data":
        body = { data: payload.data, oldData: payload.oldData };
        break;
      case "minimal":
        body = { event: payload.event, timestamp: payload.timestamp };
        break;
      default:
        body = payload as unknown as Record<string, unknown>;
    }
    let customHeaders: Record<string, string> = {};
    if (config.headers) {
      try { customHeaders = JSON.parse(config.headers as string); } catch { /* ignore */ }
    }
    return postJson(url, body, customHeaders);
  },
});

let pluginsLoaded = false;

export async function loadExternalWebhookActions(): Promise<void> {
  if (pluginsLoaded) return;
  pluginsLoaded = true;

  const candidates = [
    "@dboard/webhook-email",
    "@dboard/webhook-jira",
    "@dboard/webhook-teams",
    "dboard-webhook-email",
    "dboard-webhook-jira",
    "dboard-webhook-teams",
  ];

  for (const pkg of candidates) {
    try {
      const mod = await import(/* webpackIgnore: true */ pkg).catch(() => null);
      if (mod && typeof mod.register === "function") {
        mod.register({ register: registerWebhookActionPlugin });
      } else if (mod && mod.default) {
        registerWebhookActionPlugin(mod.default);
      }
    } catch {
      // Package not installed
    }
  }
}
