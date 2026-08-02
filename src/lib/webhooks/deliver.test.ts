import { describe, it, expect, vi } from "vitest";
import { deliverWebhook, deliverWebhooks } from "./deliver";

vi.mock("@/lib/db/ssrf-guard", () => ({
  assertPublicUrl: vi.fn().mockResolvedValue(undefined),
}));

describe("webhooks/deliver", () => {
  it("delivers to correct action", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("ok") });
    const result = await deliverWebhook("custom", "http://example.com/hook", {
      event: "test.event",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    vi.restoreAllMocks();
  });

  it("returns error for unknown action", async () => {
    const result = await deliverWebhook("nonexistent", "http://example.com/hook", {
      event: "test",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown webhook action");
  });

  it("delivers to multiple webhooks", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("ok") });
    const results = await deliverWebhooks(
      [
        { url: "http://a.com/hook", actionId: "custom" },
        { url: "http://b.com/hook", actionId: "custom" },
      ],
      { event: "test", timestamp: new Date().toISOString() },
    );
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
    vi.restoreAllMocks();
  });

  it("handles network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await deliverWebhook("custom", "http://example.com/hook", {
      event: "test",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error");
    vi.restoreAllMocks();
  });
});
