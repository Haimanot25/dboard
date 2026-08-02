export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-helpers";
import { validateCsrf } from "@/lib/csrf";
import { csrfError } from "@/lib/csrf";
import { withRateLimit } from "@/lib/with-rate-limit";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Return default notification preferences (stored in user settings or hardcoded defaults)
    const preferences = {
      emailOnShare: true,
      emailOnAlert: true,
      dashboardUpdates: false,
      weeklyDigest: true,
      securityAlerts: true,
    };

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!validateCsrf(req)) return csrfError();
    const rl = withRateLimit(req, { windowMs: 60000, maxRequests: 20 });
    if (rl) return rl;

    const body = await req.json();
    // In a real app, save to a UserSettings table. For now, just acknowledge.
    return NextResponse.json({ success: true, preferences: body });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
