import { expect, test } from "@playwright/test";

// The app starts, shows the test-mode banner (fake AI) and has no horizontal scroll at any width.
test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Test mode" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
