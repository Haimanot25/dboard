import { prisma } from "@/lib/prisma";

export function hasRole(userRole: string, requiredRole: string): boolean {
  const hierarchy: Record<string, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };
  return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 2);
}

export async function canAccessConnection(
  userId: string,
  connectionId: string,
  requiredPermission: "read" | "write" | "admin" = "read"
): Promise<{ allowed: boolean; role: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, role: "none" };

  // Admin can access everything
  if (user.role === "admin") return { allowed: true, role: "admin" };

  // Check direct ownership
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
  });

  if (connection?.userId === userId) {
    if (requiredPermission === "write" && connection.readOnly) {
      return { allowed: false, role: "owner-readonly" };
    }
    return { allowed: true, role: "owner" };
  }

  // Check shared access
  const share = await prisma.connectionShare.findUnique({
    where: { connectionId_sharedWithId: { connectionId, sharedWithId: userId } },
  });

  if (!share) return { allowed: false, role: "none" };

  if (requiredPermission === "admin" && share.permission !== "admin") {
    return { allowed: false, role: share.permission };
  }
  if (requiredPermission === "write" && share.permission === "read") {
    return { allowed: false, role: "read" };
  }

  return { allowed: true, role: share.permission };
}
