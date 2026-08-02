"use client";

import { useQuery } from "@tanstack/react-query";

export interface NotificationPreferences {
  emailOnShare: boolean;
  emailOnAlert: boolean;
  dashboardUpdates: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/settings/notifications");
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
  });
}

export function useUpdateNotificationPreferences() {
  // We'll use a manual mutation pattern here
  const update = async (prefs: Partial<NotificationPreferences>) => {
    const res = await fetch("/api/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    if (!res.ok) throw new Error("Failed to update preferences");
    return res.json();
  };
  return { update };
}
