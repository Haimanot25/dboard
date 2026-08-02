import { describe, it, expect, vi } from "vitest";
import { withRateLimit } from "./with-rate-limit";
import * as rateLimitModule from "./rate-limit";

describe("with-rate-limit", () => {
  it("returns null when under rate limit", () => {
    vi.spyOn(rateLimitModule, "checkRateLimit").mockReturnValue({ allowed: true, remaining: 59, resetIn: 60000 });
    const req = new Request("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    const result = withRateLimit(req);
    expect(result).toBeNull();
    vi.restoreAllMocks();
  });

  it("returns 429 when over rate limit", () => {
    vi.spyOn(rateLimitModule, "checkRateLimit").mockReturnValue({ allowed: false, remaining: 0, resetIn: 30000 });
    const req = new Request("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    const result = withRateLimit(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    expect(result!.headers.get("Retry-After")).toBe("30");
    vi.restoreAllMocks();
  });

  it("uses unknown when no x-forwarded-for", () => {
    const spy = vi.spyOn(rateLimitModule, "checkRateLimit").mockReturnValue({ allowed: true, remaining: 59, resetIn: 60000 });
    const req = new Request("http://localhost:3000/api/test");
    withRateLimit(req);
    expect(spy).toHaveBeenCalledWith("unknown:/api/test", undefined);
    vi.restoreAllMocks();
  });
});
