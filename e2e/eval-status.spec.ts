import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("Subjects whose accuracy test hasn't been run", () => {
  test("say so on the subject page and the accuracy page", async ({ page }) => {
    await page.goto("/subjects/microprocessors");
    await expect(page.getByTestId("eval-pending")).toContainText("Test not run yet");
    await page.goto("/accuracy");
    await expect(page.getByText("Testing is still in progress.")).toBeVisible();
    await expect(page.getByText("Test not run yet").first()).toBeVisible();
    await expectNoSidewaysScroll(page);
  });
  test("a measured subject has no such notice", async ({ page }) => {
    await page.goto("/subjects/applied-physics");
    await expect(page.getByTestId("eval-pending")).toHaveCount(0);
  });
});
