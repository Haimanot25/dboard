import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuditLog } from "./audit";
import { prisma } from "@/lib/prisma";

describe("audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates audit log record", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.auditLog.create as any).mockResolvedValue({});
    await createAuditLog({
      connectionId: "conn-1",
      userId: "user-1",
      action: "query",
      tableName: "users",
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        connectionId: "conn-1",
        userId: "user-1",
        action: "query",
        tableName: "users",
        recordId: undefined,
        details: undefined,
        ip: undefined,
      },
    });
  });

  it("swallows errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.auditLog.create as any).mockRejectedValue(new Error("DB error"));
    await expect(
      createAuditLog({ connectionId: "c", userId: "u", action: "test" }),
    ).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
