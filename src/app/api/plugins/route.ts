import { NextResponse } from "next/server";

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  type: "adapter" | "widget" | "webhook";
}

export async function GET() {
  try {
    const { getAllAdapterPlugins } = await import("@/lib/db/plugins/adapter-plugins");

    let widgets: PluginInfo[] = [];
    let webhookActions: PluginInfo[] = [];

    try {
      const { getAllWidgetPlugins } = await import("@/lib/widgets/registry");
      widgets = getAllWidgetPlugins().map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        author: p.author,
        type: "widget" as const,
      }));
    } catch {
      // Widget registry may not exist yet
    }

    try {
      const { getAllWebhookActionPlugins } = await import("@/lib/webhooks/registry");
      webhookActions = getAllWebhookActionPlugins().map((p) => ({
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        author: p.author,
        type: "webhook" as const,
      }));
    } catch {
      // Webhook action registry may not exist yet
    }

    const adapters: PluginInfo[] = getAllAdapterPlugins().map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      author: p.author,
      homepage: p.homepage,
      type: "adapter" as const,
    }));

    return NextResponse.json({ adapters, widgets, webhookActions });
  } catch (error) {
    console.error("Failed to list plugins:", error);
    return NextResponse.json({ error: "Failed to list plugins" }, { status: 500 });
  }
}
