import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkIpRateLimit, recordIpLoginAttempt } from "@/lib/login-rate-limit";

const handler = NextAuth(authOptions);

interface RouteContext {
  params: Record<string, string | string[]>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  return handler(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (req.headers.get("content-type")?.includes("application/json")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const rateCheck = checkIpRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rateCheck.retryIn} seconds.` },
        { status: 429 }
      );
    }

    const clone = req.clone();
    let body: { email?: string; password?: string } | null = null;
    try {
      body = await clone.json();
    } catch {
      // Not a JSON body (e.g. GET-style form post) — pass through
    }

    const response = await handler(req, context);

    if (body && typeof body.email === "string") {
      if (response.status === 401) {
        recordIpLoginAttempt(ip, false);
      } else {
        recordIpLoginAttempt(ip, true);
      }
    }
    return response;
  }

  return handler(req, context);
}
