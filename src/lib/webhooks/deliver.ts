import type { WebhookPayload, WebhookDeliveryResult } from "./types";
import { getWebhookAction, loadExternalWebhookActions } from "./registry";

let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (!loaded) {
    loaded = true;
    await loadExternalWebhookActions();
  }
}

export async function deliverWebhook(
  actionId: string,
  url: string,
  payload: WebhookPayload,
  config: Record<string, unknown> = {},
): Promise<WebhookDeliveryResult> {
  await ensureLoaded();

  const action = getWebhookAction(actionId);
  if (!action) {
    return { success: false, error: `Unknown webhook action: ${actionId}` };
  }

  try {
    return await action.deliver(url, payload, config);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error during delivery",
    };
  }
}

export async function deliverWebhooks(
  webhooks: Array<{ url: string; actionId?: string; config?: Record<string, unknown> }>,
  payload: WebhookPayload,
): Promise<WebhookDeliveryResult[]> {
  await ensureLoaded();

  const results: WebhookDeliveryResult[] = [];
  for (const webhook of webhooks) {
    const actionId = webhook.actionId || "custom";
    const result = await deliverWebhook(actionId, webhook.url, payload, webhook.config || {});
    results.push(result);
  }
  return results;
}
