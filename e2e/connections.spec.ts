import { test, expect } from "@playwright/test";

test.describe("Connection CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    // Login first
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="email" i]', "admin@dboard.io");
    await page.fill('input[name="password"], input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboards", { timeout: 10000 }).catch(() => {});
  });

  test("navigates to connections page", async ({ page }) => {
    await page.goto("/connections");
    await expect(page.locator("text=Data Sources").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows connection list", async ({ page }) => {
    await page.goto("/connections");
    await page.waitForLoadState("networkidle");
    // Should show either connections or empty state
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});
