import { expect, test } from "@playwright/test";
import { seedStudyData } from "./helpers/seed";

/* Past mocks: delete one (with confirmation and Undo), and delete several in Select mode. */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await seedStudyData(page);
  await page.goto("/mock-test");
  await expect(page.getByTestId("past-mock")).toHaveCount(2);
});

test("delete asks first, Undo brings the mock back, and a delete stays after reload", async ({
  page,
}) => {
  const mocks = page.getByTestId("past-mock");
  await page.getByRole("button", { name: /^More for Mock 1/ }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();

  const dialog = page.getByRole("dialog", { name: "Delete this mock?" });
  await expect(dialog).toContainText("This removes the paper, answer sheet and your score.");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(mocks).toHaveCount(2);

  await page.getByRole("button", { name: /^More for Mock 1/ }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(mocks).toHaveCount(1);

  await page.getByTestId("undo-toast").getByRole("button", { name: "Undo" }).click();
  await expect(mocks).toHaveCount(2);
  await expect(page.getByTestId("undo-toast")).toHaveCount(0);

  // Delete for real: the toast goes after about 5 seconds and the mock stays gone.
  await page.getByRole("button", { name: /^More for Mock 2/ }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId("undo-toast")).toHaveCount(0, { timeout: 8000 });
  await page.reload();
  await expect(mocks).toHaveCount(1);
  await expect(mocks.first()).toContainText("Mock 1");
});

test("Select mode deletes several at once", async ({ page }) => {
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Select Mock 1/ }).check();
  await page.getByRole("checkbox", { name: /^Select Mock 2/ }).check();
  await page.getByRole("button", { name: "Delete 2 selected" }).click();
  await expect(page.getByRole("dialog", { name: "Delete 2 mocks?" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No mocks yet.")).toBeVisible();
  await expect(page.getByTestId("undo-toast")).toContainText("2 mocks deleted.");
});
