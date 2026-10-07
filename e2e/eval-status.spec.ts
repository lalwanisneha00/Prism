import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("Subjects whose accuracy test hasn't been run", () => {
  test("say so on the subject page and the accuracy page", async ({ page }) => {
    // The PDEU catalogue is new: every subject waits for its accuracy test.
    await page.goto("/subjects/pdeu-applied-physics");
    await expect(page.getByTestId("eval-pending")).toContainText("No test set yet");
    await page.goto("/accuracy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoSidewaysScroll(page);
  });
});
