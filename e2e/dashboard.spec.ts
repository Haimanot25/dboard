import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="email" i]', "admin@dboard.io");
    await page.fill('input[name="password"], input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboards", { timeout: 10000 }).catch(() => {});
  });

  test("shows dashboards page", async ({ page }) => {
    await page.goto("/dashboards");
    await page.waitForLoadState("networkidle");
    const content = await page.textContent("body");
    expect(content).toContain("Dashboard");
  });
});
