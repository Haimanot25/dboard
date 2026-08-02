import { prisma } from "@/lib/prisma";

export interface AuditEntry {
  connectionId: string;
  userId: string;
  action: string;
  tableName?: string;
  recordId?: string;
  details?: string;
  ip?: string;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
}
