import { NextResponse } from "next/server";
import { checkRateLimit, RateLimitConfig } from "./rate-limit";

export function withRateLimit(
  req: Request,
  config?: RateLimitConfig
): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const url = new URL(req.url);
  const key = `${ip}:${url.pathname}`;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.resetIn / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null;
}
