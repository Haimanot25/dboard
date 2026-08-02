import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows request when under limit", () => {
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });

  it("blocks when over limit", () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit("test-key");
    }
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    for (let i = 0; i < 61; i++) {
      checkRateLimit("test-key");
    }
    vi.advanceTimersByTime(60001);
    const result = checkRateLimit("test-key");
    expect(result.allowed).toBe(true);
  });

  it("different keys are independent", () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit("key-a");
    }
    expect(checkRateLimit("key-a").allowed).toBe(false);
    expect(checkRateLimit("key-b").allowed).toBe(true);
  });

  it("custom config is respected", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("custom-key", { windowMs: 60000, maxRequests: 3 });
    }
    const result = checkRateLimit("custom-key", { windowMs: 60000, maxRequests: 3 });
    expect(result.allowed).toBe(false);
  });
});
