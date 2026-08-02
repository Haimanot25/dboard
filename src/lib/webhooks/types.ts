export interface WebhookPayload {
  event: string;
  connectionId?: string;
  connectionName?: string;
  tableName?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  oldData?: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
}

export interface WebhookAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  configFields: WebhookConfigField[];
  deliver(url: string, payload: WebhookPayload, config: Record<string, unknown>): Promise<WebhookDeliveryResult>;
}

export interface WebhookConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "select" | "boolean" | "textarea" | "number";
  placeholder?: string;
  default?: unknown;
  required?: boolean;
  options?: { label: string; value: string }[];
  description?: string;
}

export interface WebhookActionPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  actions: WebhookAction[];
}
