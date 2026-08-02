import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { getAllWebhookActions } = await import("@/lib/webhooks/registry");
    const actions = getAllWebhookActions().map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      configFields: a.configFields,
    }));
    return NextResponse.json({ actions });
  } catch (error) {
    console.error("Failed to list webhook actions:", error);
    return NextResponse.json({ error: "Failed to list webhook actions" }, { status: 500 });
  }
}
