import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { authenticateRequest, isApiKeyRequest, generateApiKey } from "./api-keys";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth-helpers", () => ({
  getUserId: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  canAccessConnection: vi.fn(),
}));

import { getUserId } from "@/lib/auth-helpers";
import { canAccessConnection } from "@/lib/permissions";

const mockedGetUserId = getUserId as ReturnType<typeof vi.fn>;
const mockedCanAccess = canAccessConnection as ReturnType<typeof vi.fn>;

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/data/conn-1/users", {
    headers,
  });
}

describe("api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a key with the dbo_ prefix and lastChars", () => {
    const { key, lastChars } = generateApiKey();
    expect(key.startsWith("dbo_")).toBe(true);
    expect(key).toHaveLength(4 + 64);
    expect(lastChars).toBe(key.slice(-8));
  });

  it("isApiKeyRequest detects X-API-Key and Bearer headers", () => {
    expect(isApiKeyRequest(makeRequest({ "x-api-key": "dbo_abc" }))).toBe(true);
    expect(isApiKeyRequest(makeRequest({ authorization: "Bearer dbo_abc" }))).toBe(true);
    expect(isApiKeyRequest(makeRequest({ authorization: "Bearer some-jwt" }))).toBe(false);
    expect(isApiKeyRequest(makeRequest())).toBe(false);
  });

  it("authenticates a valid API key for the connection", async () => {
    mockedGetUserId.mockResolvedValue(null);
    (prisma.apiKey.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "k1",
      key: "dbo_valid",
      connectionId: "conn-1",
      permissions: "write",
      userId: "user-1",
      expiresAt: null,
    });
    (prisma.apiKey.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await authenticateRequest(
      makeRequest({ "x-api-key": "dbo_valid" }),
      "conn-1",
      "write"
    );
    expect(result).toEqual({ allowed: true, userId: "user-1" });
  });

  it("rejects a key for a different connection", async () => {
    (prisma.apiKey.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "k1",
      key: "dbo_valid",
      connectionId: "conn-other",
      permissions: "admin",
      userId: "user-1",
      expiresAt: null,
    });

    const result = await authenticateRequest(
      makeRequest({ "x-api-key": "dbo_valid" }),
      "conn-1",
      "read"
    );
    expect(result.allowed).toBe(false);
  });

  it("rejects a key with insufficient permission", async () => {
    (prisma.apiKey.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "k1",
      key: "dbo_valid",
      connectionId: "conn-1",
      permissions: "read",
      userId: "user-1",
      expiresAt: null,
    });

    const result = await authenticateRequest(
      makeRequest({ "x-api-key": "dbo_valid" }),
      "conn-1",
      "write"
    );
    expect(result.allowed).toBe(false);
  });

  it("rejects an expired key", async () => {
    (prisma.apiKey.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "k1",
      key: "dbo_valid",
      connectionId: "conn-1",
      permissions: "admin",
      userId: "user-1",
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await authenticateRequest(
      makeRequest({ "x-api-key": "dbo_valid" }),
      "conn-1",
      "read"
    );
    expect(result.allowed).toBe(false);
  });

  it("rejects an unknown key", async () => {
    (prisma.apiKey.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await authenticateRequest(
      makeRequest({ "x-api-key": "dbo_unknown" }),
      "conn-1",
      "read"
    );
    expect(result.allowed).toBe(false);
  });

  it("falls back to session auth when no API key is present", async () => {
    mockedGetUserId.mockResolvedValue("user-1");
    mockedCanAccess.mockResolvedValue({ allowed: true, role: "owner" });

    const result = await authenticateRequest(makeRequest(), "conn-1", "read");
    expect(result).toEqual({ allowed: true, userId: "user-1" });
  });

  it("returns Unauthorized for session requests without a user", async () => {
    mockedGetUserId.mockResolvedValue(null);

    const result = await authenticateRequest(makeRequest(), "conn-1", "read");
    expect(result).toEqual({ allowed: false, error: "Unauthorized" });
  });

  it("returns Access denied when the session user lacks permission", async () => {
    mockedGetUserId.mockResolvedValue("user-1");
    mockedCanAccess.mockResolvedValue({ allowed: false, role: "none" });

    const result = await authenticateRequest(makeRequest(), "conn-1", "read");
    expect(result).toEqual({ allowed: false, error: "Access denied" });
  });
});
