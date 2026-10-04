import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("Time recommendations and planner (V3 · Step 11)", () => {
  test("the lesson picker marks a Recommended length and says why", async ({ page }) => {
    await page.goto("/?subject=em#start");
    await page
      .getByLabel(/chapter/i)
      .first()
      .selectOption({ index: 1 });
    await page.getByLabel(/topic/i).first().selectOption({ index: 1 });
    await page.getByRole("radio", { name: /Building blocks/i }).check({ force: true });
    await expect(page.getByTestId("length-why")).toContainText("Recommended");
    await expect(page.getByText("Recommended", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Other length" }).click();
    await expect(page.getByRole("radio", { name: /90 min/ })).toBeAttached();
  });

  test("a 7-day plan with 5–30 min per topic and 8 h days off", async ({ page }) => {
    await page.goto("/planner");
    await page.getByRole("searchbox").fill("Engineering Mathematics");
    await page
      .getByRole("button", { name: /Add Engineering Mathematics/ })
      .first()
      .click();
    await page.getByRole("button", { name: /Custom/ }).click();
    await page.getByLabel("From").fill("5");
    await page.getByLabel(/^to/).fill("30");
    await page.getByLabel("Sun").selectOption("480");
    await page.getByLabel("Sat").selectOption("480");
    await page.getByLabel("Number of days").selectOption("7");
    await expect(page.getByRole("region", { name: "Plan overview" })).toContainText("7 days");
    await page.getByRole("button", { name: /Save my 7-day plan/ }).click();
    await expect(page.getByText(/\d+ of \d+ done/)).toBeVisible();
    const times = await page
      .locator("li", { hasText: /^Learn/ })
      .locator("span.shrink-0", { hasText: /min$/ })
      .allTextContents();
    expect(times.length).toBeGreaterThan(0);
    for (const t of times) {
      const m = Number.parseInt(t, 10);
      expect(m).toBeGreaterThanOrEqual(5);
      expect(m).toBeLessThanOrEqual(30);
    }
    await expectNoSidewaysScroll(page);
  });

  test("the subject page lets me set a topic's importance", async ({ page }) => {
    await page.goto("/subjects/em");
    const select = page.getByLabel(/Importance of/).first();
    await select.selectOption("high");
    await expect(page.getByText("High return").first()).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/Importance of/).first()).toHaveValue("high");
  });
});
