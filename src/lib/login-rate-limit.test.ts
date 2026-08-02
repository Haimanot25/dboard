import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkLoginRateLimit, recordLoginAttempt } from "./login-rate-limit";

describe("login-rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first attempt", () => {
    const result = checkLoginRateLimit("user@test.com");
    expect(result.allowed).toBe(true);
  });

  it("allows 4 failed attempts", () => {
    for (let i = 0; i < 4; i++) {
      recordLoginAttempt("user@test.com", false);
    }
    const result = checkLoginRateLimit("user@test.com");
    expect(result.allowed).toBe(true);
  });

  it("blocks on 5th failed attempt", () => {
    for (let i = 0; i < 5; i++) {
      recordLoginAttempt("user@test.com", false);
    }
    const result = checkLoginRateLimit("user@test.com");
    expect(result.allowed).toBe(false);
    expect(result.retryIn).toBeGreaterThan(0);
  });

  it("success resets counter", () => {
    recordLoginAttempt("user@test.com", false);
    recordLoginAttempt("user@test.com", false);
    recordLoginAttempt("user@test.com", true);
    const result = checkLoginRateLimit("user@test.com");
    expect(result.allowed).toBe(true);
  });

  it("lockout expires after 15 minutes", () => {
    for (let i = 0; i < 5; i++) {
      recordLoginAttempt("user@test.com", false);
    }
    expect(checkLoginRateLimit("user@test.com").allowed).toBe(false);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(checkLoginRateLimit("user@test.com").allowed).toBe(true);
  });

  it("different identifiers are independent", () => {
    for (let i = 0; i < 5; i++) {
      recordLoginAttempt("user1@test.com", false);
    }
    expect(checkLoginRateLimit("user1@test.com").allowed).toBe(false);
    expect(checkLoginRateLimit("user2@test.com").allowed).toBe(true);
  });

  it("successful login clears all failed attempts", () => {
    recordLoginAttempt("user@test.com", false);
    recordLoginAttempt("user@test.com", false);
    recordLoginAttempt("user@test.com", false);
    recordLoginAttempt("user@test.com", false);
    recordLoginAttempt("user@test.com", false);
    expect(checkLoginRateLimit("user@test.com").allowed).toBe(false);
    recordLoginAttempt("user@test.com", true);
    expect(checkLoginRateLimit("user@test.com").allowed).toBe(true);
  });
});
