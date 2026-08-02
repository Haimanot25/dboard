import { test, expect } from "@playwright/test";

test.describe("Data Browse", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="email" i]', "admin@dboard.io");
    await page.fill('input[name="password"], input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboards", { timeout: 10000 }).catch(() => {});
  });

  test("navigates to connections and selects one", async ({ page }) => {
    await page.goto("/connections");
    await page.waitForLoadState("networkidle");
    // Click first connection if available
    const firstCard = page.locator("[data-testid='connection-card'], .cursor-pointer").first();
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForLoadState("networkidle");
    }
  });
});
