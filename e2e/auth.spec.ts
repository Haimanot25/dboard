import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboards");
    await expect(page).toHaveURL(/login/);
  });
});
