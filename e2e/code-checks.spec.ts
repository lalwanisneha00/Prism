import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test("code samples are run in the browser and their output compared (V3 · Step 5)", async ({
  page,
}) => {
  await page.goto("/dev/code");
  const checks = page.getByTestId("code-check");
  await expect(checks).toHaveCount(4);
  await expect(checks.nth(0)).toContainText("the output matches the lesson");
  await expect(checks.nth(1)).toContainText("differs");
  await expect(checks.nth(1)).toContainText("0.30000000000000004");
  await expect(checks.nth(2)).toContainText("Not run yet");
  await expect(checks.nth(3)).toContainText("Not executed");
  await expectNoSidewaysScroll(page);
});
