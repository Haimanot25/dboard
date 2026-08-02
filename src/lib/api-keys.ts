import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-helpers";
import { canAccessConnection } from "@/lib/permissions";

export function generateApiKey(): { key: string; lastChars: string } {
  const key = `dbo_${crypto.randomBytes(32).toString("hex")}`;
  const lastChars = key.slice(-8);
  return { key, lastChars };
}

export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  connectionId?: string;
  permissions?: string;
  userId?: string;
}> {
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey) return { valid: false };

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false };
  }

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch((err) => {
    console.error("Failed to update API key lastUsedAt:", err);
  });

  return {
    valid: true,
    connectionId: apiKey.connectionId,
    permissions: apiKey.permissions,
    userId: apiKey.userId,
  };
}

const PERMISSION_LEVEL: Record<string, number> = { read: 1, write: 2, admin: 3 };

export function isApiKeyRequest(req: NextRequest): boolean {
  return extractApiKey(req) !== null;
}

function extractApiKey(req: NextRequest): string | null {
  const header = req.headers.get("x-api-key");
  if (header) return header.trim();
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token.startsWith("dbo_")) return token;
  }
  return null;
}

export type AuthResult =
  | { allowed: true; userId: string }
  | { allowed: false; error: string };

/**
 * Authenticate a request against a connection. Supports both session cookies
 * and API keys (X-API-Key or "Authorization: Bearer dbo_..."). API keys are
 * scoped to a single connection and carry a permission level
 * (read < write < admin).
 */
export async function authenticateRequest(
  req: NextRequest,
  connectionId: string,
  requiredPermission: "read" | "write" | "admin" = "read"
): Promise<AuthResult> {
  const apiKey = extractApiKey(req);
  if (apiKey) {
    const result = await validateApiKey(apiKey);
    if (!result.valid) return { allowed: false, error: "Invalid or expired API key" };
    if (result.connectionId !== connectionId) {
      return { allowed: false, error: "API key is not valid for this connection" };
    }
    const keyLevel = PERMISSION_LEVEL[result.permissions || "read"] || 0;
    const requiredLevel = PERMISSION_LEVEL[requiredPermission] || 1;
    if (keyLevel < requiredLevel) {
      return { allowed: false, error: "API key does not have the required permissions" };
    }
    return { allowed: true, userId: result.userId || "" };
  }

  const userId = await getUserId(req);
  if (!userId) return { allowed: false, error: "Unauthorized" };
  const access = await canAccessConnection(userId, connectionId, requiredPermission);
  if (!access.allowed) return { allowed: false, error: "Access denied" };
  return { allowed: true, userId };
}
